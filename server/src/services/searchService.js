const { getDatabase } = require('../config/database');
const aiService = require('./aiService');

class SearchService {
  /**
   * 기본 검색 + AI Q&A
   */
  async search(question) {
    const db = getDatabase();

    // 모든 미팅 조회 (참석자 정보 포함)
    const meetings = db.prepare(`
      SELECT
        m.id,
        m.title,
        m.date,
        m.summary,
        m.raw_content,
        m.overview,
        m.discussion,
        m.decisions,
        GROUP_CONCAT(DISTINCT p.name) as participants
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN participants p ON mp.participant_id = p.id
      GROUP BY m.id
      ORDER BY m.date DESC
    `).all();

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
  advancedSearch(query, filters = {}) {
    const db = getDatabase();

    // TODO: AND, OR, NOT 연산자 파싱
    // 현재는 기본 검색만 구현

    let sql = `SELECT
      m.*,
      GROUP_CONCAT(DISTINCT p.name) as participants
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN participants p ON mp.participant_id = p.id
      WHERE 1=1`;
    const params = [];

    if (query && query.trim()) {
      sql += ' AND (m.title LIKE ? OR m.raw_content LIKE ? OR m.summary LIKE ? OR m.overview LIKE ? OR m.discussion LIKE ? OR m.decisions LIKE ?)';
      const pattern = `%${query}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    if (filters.dateFrom) {
      sql += ' AND m.date >= ?';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      sql += ' AND m.date <= ?';
      params.push(filters.dateTo);
    }

    if (filters.participants && filters.participants.trim()) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${filters.participants.trim()}%`);
    }

    if (filters.tagId) {
      sql += ' AND m.id IN (SELECT meeting_id FROM meeting_tags WHERE tag_id = ?)';
      params.push(filters.tagId);
    }

    sql += ' GROUP BY m.id ORDER BY m.date DESC LIMIT 50';

    return db.prepare(sql).all(...params);
  }

  /**
   * 저장된 검색 조회
   */
  getSavedSearches() {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM saved_searches
      ORDER BY last_used DESC
    `).all();
  }

  /**
   * 검색 저장
   */
  saveSearch(data) {
    const db = getDatabase();
    const { name, query, filters } = data;

    const result = db.prepare(`
      INSERT INTO saved_searches (name, query, filters)
      VALUES (?, ?, ?)
    `).run(name, query, JSON.stringify(filters));

    return { id: result.lastInsertRowid, name, query, filters };
  }

  /**
   * 저장된 검색 삭제
   */
  deleteSavedSearch(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM saved_searches WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

module.exports = new SearchService();
