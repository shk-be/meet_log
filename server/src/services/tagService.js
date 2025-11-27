const { getDatabase } = require('../config/database');

class TagService {
  /**
   * 모든 태그 조회
   */
  async getAllTags() {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM tags ORDER BY usage_count DESC, name ASC');
    return result.rows;
  }

  /**
   * 태그 조회
   */
  async getTagById(id) {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM tags WHERE id = $1', [id]);
    return result.rows[0];
  }

  /**
   * 태그 생성
   */
  async createTag(data) {
    const db = getDatabase();
    const { name, color, description } = data;

    const result = await db.query(`
      INSERT INTO tags (name, color, description)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [name, color, description]);

    return await this.getTagById(result.rows[0].id);
  }

  /**
   * 태그 수정
   */
  async updateTag(id, updates) {
    const db = getDatabase();
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      params.push(updates.name);
      paramIndex++;
    }

    if (updates.color !== undefined) {
      fields.push(`color = $${paramIndex}`);
      params.push(updates.color);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      params.push(updates.description);
      paramIndex++;
    }

    if (fields.length === 0) return await this.getTagById(id);

    params.push(id);
    await db.query(`UPDATE tags SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);

    return await this.getTagById(id);
  }

  /**
   * 태그 삭제
   */
  async deleteTag(id) {
    const db = getDatabase();
    const result = await db.query('DELETE FROM tags WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * 미팅별 태그 조회
   */
  async getTagsByMeetingId(meetingId) {
    const db = getDatabase();
    const result = await db.query(`
      SELECT t.*, mt.confidence
      FROM tags t
      JOIN meeting_tags mt ON t.id = mt.tag_id
      WHERE mt.meeting_id = $1
    `, [meetingId]);
    return result.rows;
  }
}

module.exports = new TagService();
