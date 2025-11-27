const { getDatabase } = require('../config/database');

class TagService {
  /**
   * 모든 태그 조회
   */
  getAllTags() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tags ORDER BY usage_count DESC, name ASC').all();
  }

  /**
   * 태그 조회
   */
  getTagById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  }

  /**
   * 태그 생성
   */
  createTag(data) {
    const db = getDatabase();
    const { name, color, description } = data;

    const result = db.prepare(`
      INSERT INTO tags (name, color, description)
      VALUES (?, ?, ?)
    `).run(name, color, description);

    return this.getTagById(result.lastInsertRowid);
  }

  /**
   * 태그 수정
   */
  updateTag(id, updates) {
    const db = getDatabase();
    const fields = [];
    const params = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }

    if (updates.color !== undefined) {
      fields.push('color = ?');
      params.push(updates.color);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }

    if (fields.length === 0) return this.getTagById(id);

    params.push(id);
    db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    return this.getTagById(id);
  }

  /**
   * 태그 삭제
   */
  deleteTag(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * 미팅별 태그 조회
   */
  getTagsByMeetingId(meetingId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT t.*, mt.confidence
      FROM tags t
      JOIN meeting_tags mt ON t.id = mt.tag_id
      WHERE mt.meeting_id = ?
    `).all(meetingId);
  }
}

module.exports = new TagService();
