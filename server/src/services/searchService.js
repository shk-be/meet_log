const { getDatabase } = require('../config/database');
const aiService = require('./aiService');

class SearchService {
  /**
   * 기본 검색 + AI Q&A
   */
  async search(question) {
    const db = getDatabase();

    // 모든 미팅 조회 (참석자 정보 포함)
    const result = await db.query(`
      SELECT
        m.id,
        m.title,
        m.date,
        m.summary,
        m.raw_content,
        m.overview,
        m.discussion,
        m.decisions,
        STRING_AGG(DISTINCT p.name, ', ') as participants
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN participants p ON mp.participant_id = p.id
      GROUP BY m.id
      ORDER BY m.date DESC
    `);
    const meetings = result.rows;

    // AI로 답변 생성
    const answer = await aiService.searchAndAnswer(question, meetings);

    // 키워드 매칭으로 관련 미팅 찾기
    const keywords = question.toLowerCase().split(/\s+/).filter(k => k.length > 1);
    const relatedMeetings = meetings
      .filter(m => {
        const content = `${m.title} ${m.summary || ''} ${m.raw_content || ''} ${m.overview || ''} ${m.discussion || ''} ${m.decisions || ''}`.toLowerCase();
        return keywords.some(keyword => content.includes(keyword));
      })
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        title: m.title,
        date: m.date,
        summary: m.summary,
        participants: m.participants
      }));

    return {
      answer,
      relatedMeetings
    };
  }

  /**
   * 고급 검색
   */
  async advancedSearch(query, filters = {}) {
    const db = getDatabase();

    // TODO: AND, OR, NOT 연산자 파싱
    // 현재는 기본 검색만 구현

    let sql = `SELECT
      m.*,
      STRING_AGG(DISTINCT p.name, ', ') as participants
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN participants p ON mp.participant_id = p.id
      WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (query && query.trim()) {
      sql += ` AND (m.title LIKE $${paramIndex} OR m.raw_content LIKE $${paramIndex + 1} OR m.summary LIKE $${paramIndex + 2} OR m.overview LIKE $${paramIndex + 3} OR m.discussion LIKE $${paramIndex + 4} OR m.decisions LIKE $${paramIndex + 5})`;
      const pattern = `%${query}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
      paramIndex += 6;
    }

    if (filters.dateFrom) {
      sql += ` AND m.date >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      sql += ` AND m.date <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.participants && filters.participants.trim()) {
      sql += ` AND p.name LIKE $${paramIndex}`;
      params.push(`%${filters.participants.trim()}%`);
      paramIndex++;
    }

    if (filters.tagId) {
      sql += ` AND m.id IN (SELECT meeting_id FROM meeting_tags WHERE tag_id = $${paramIndex})`;
      params.push(filters.tagId);
      paramIndex++;
    }

    sql += ' GROUP BY m.id ORDER BY m.date DESC LIMIT 50';

    const result = await db.query(sql, params);
    return result.rows;
  }

  /**
   * 저장된 검색 조회
   */
  async getSavedSearches() {
    const db = getDatabase();
    const result = await db.query(`
      SELECT * FROM saved_searches
      ORDER BY last_used DESC
    `);
    return result.rows;
  }

  /**
   * 검색 저장
   */
  async saveSearch(data) {
    const db = getDatabase();
    const { name, query, filters } = data;

    const result = await db.query(`
      INSERT INTO saved_searches (name, query, filters)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [name, query, JSON.stringify(filters)]);

    return { id: result.rows[0].id, name, query, filters };
  }

  /**
   * 저장된 검색 삭제
   */
  async deleteSavedSearch(id) {
    const db = getDatabase();
    const result = await db.query('DELETE FROM saved_searches WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

module.exports = new SearchService();
