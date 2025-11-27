const { getDatabase } = require('../config/database');

class ActionItemService {
  /**
   * 액션 아이템 목록 조회
   */
  async getActionItems(filters = {}) {
    const db = getDatabase();
    const { status, assigneeId, priority, overdue, meetingId } = filters;

    let query = `
      SELECT
        ai.*,
        ai.description as title,
        p.name as assignee,
        m.title as meeting_title,
        m.date as meeting_date
      FROM action_items ai
      LEFT JOIN participants p ON ai.assignee_id = p.id
      LEFT JOIN meetings m ON ai.meeting_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND ai.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (assigneeId) {
      query += ` AND ai.assignee_id = $${paramIndex}`;
      params.push(assigneeId);
      paramIndex++;
    }

    if (priority) {
      query += ` AND ai.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (meetingId) {
      query += ` AND ai.meeting_id = $${paramIndex}`;
      params.push(meetingId);
      paramIndex++;
    }

    if (overdue) {
      query += ' AND ai.due_date < CURRENT_DATE AND ai.status != \'completed\'';
    }

    query += ' ORDER BY ai.due_date ASC, ai.priority DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * 액션 아이템 조회
   */
  async getActionItemById(id) {
    const db = getDatabase();
    const result = await db.query(`
      SELECT ai.*, p.name as assignee_name, m.title as meeting_title
      FROM action_items ai
      LEFT JOIN participants p ON ai.assignee_id = p.id
      LEFT JOIN meetings m ON ai.meeting_id = m.id
      WHERE ai.id = $1
    `, [id]);
    return result.rows[0];
  }

  /**
   * 액션 아이템 생성
   */
  async createActionItem(data) {
    const db = getDatabase();
    const { meetingId, meeting_id, title, description, assignee, assigneeId, assignee_id, dueDate, due_date, priority, notes, status } = data;

    // 필드명 통합 처리
    const finalMeetingId = meetingId || meeting_id || null;
    const finalDescription = title || description;
    const finalDueDate = dueDate || due_date || null;
    const finalPriority = priority || 'medium';
    const finalStatus = status || 'pending';

    // assignee가 이름인 경우 participant 찾거나 생성
    let finalAssigneeId = assigneeId || assignee_id || null;

    if (assignee && !finalAssigneeId) {
      // 참석자 이름으로 ID 찾기 또는 생성
      const participantResult = await db.query('SELECT id FROM participants WHERE name = $1', [assignee]);

      if (participantResult.rows.length === 0) {
        const insertResult = await db.query('INSERT INTO participants (name) VALUES ($1) RETURNING id', [assignee]);
        finalAssigneeId = insertResult.rows[0].id;
      } else {
        finalAssigneeId = participantResult.rows[0].id;
      }
    }

    // meeting_id가 없으면 NULL 허용하도록 스키마 변경 필요
    // 임시로 meeting_id 없이도 생성 가능하도록 처리
    let sql, params;

    if (finalMeetingId) {
      sql = `INSERT INTO action_items (meeting_id, description, assignee_id, due_date, priority, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
      params = [finalMeetingId, finalDescription, finalAssigneeId, finalDueDate, finalPriority, notes, finalStatus];
    } else {
      // meeting_id가 없는 경우 - 가장 최근 미팅에 연결하거나 임시 미팅 생성
      const recentMeetingResult = await db.query('SELECT id FROM meetings ORDER BY date DESC LIMIT 1');
      const tempMeetingId = recentMeetingResult.rows.length > 0 ? recentMeetingResult.rows[0].id : await this.createTempMeeting(db);

      sql = `INSERT INTO action_items (meeting_id, description, assignee_id, due_date, priority, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
      params = [tempMeetingId, finalDescription, finalAssigneeId, finalDueDate, finalPriority, notes, finalStatus];
    }

    const result = await db.query(sql, params);
    return await this.getActionItemById(result.rows[0].id);
  }

  /**
   * 임시 미팅 생성 (액션 아이템만 있는 경우)
   */
  async createTempMeeting(db) {
    const result = await db.query(`
      INSERT INTO meetings (title, date, raw_content, summary)
      VALUES ($1, CURRENT_DATE, $2, $3) RETURNING id
    `, ['일반 액션 아이템', '미팅과 연결되지 않은 액션 아이템입니다.', '일반 액션 아이템 관리용']);

    return result.rows[0].id;
  }

  /**
   * 액션 아이템 수정
   */
  async updateActionItem(id, updates) {
    const db = getDatabase();
    const fields = [];
    const params = [];
    let paramIndex = 1;

    // title과 description 모두 처리
    const finalDescription = updates.title || updates.description;
    if (finalDescription !== undefined) {
      fields.push(`description = $${paramIndex}`);
      params.push(finalDescription);
      paramIndex++;
    }

    // assignee 이름 처리
    if (updates.assignee && !updates.assigneeId && !updates.assignee_id) {
      const participantResult = await db.query('SELECT id FROM participants WHERE name = $1', [updates.assignee]);

      if (participantResult.rows.length === 0) {
        const insertResult = await db.query('INSERT INTO participants (name) VALUES ($1) RETURNING id', [updates.assignee]);
        updates.assigneeId = insertResult.rows[0].id;
      } else {
        updates.assigneeId = participantResult.rows[0].id;
      }
    }

    const finalAssigneeId = updates.assigneeId || updates.assignee_id;
    if (finalAssigneeId !== undefined) {
      fields.push(`assignee_id = $${paramIndex}`);
      params.push(finalAssigneeId);
      paramIndex++;
    }

    const finalDueDate = updates.dueDate || updates.due_date;
    if (finalDueDate !== undefined) {
      fields.push(`due_date = $${paramIndex}`);
      params.push(finalDueDate);
      paramIndex++;
    }

    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramIndex}`);
      params.push(updates.priority);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      params.push(updates.status);
      paramIndex++;

      if (updates.status === 'completed') {
        fields.push('completion_date = CURRENT_TIMESTAMP');
      }
    }

    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      params.push(updates.notes);
      paramIndex++;
    }

    if (fields.length === 0) {
      return await this.getActionItemById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await db.query(`UPDATE action_items SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params);

    return await this.getActionItemById(id);
  }

  /**
   * 액션 아이템 삭제
   */
  async deleteActionItem(id) {
    const db = getDatabase();
    const result = await db.query('DELETE FROM action_items WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * 액션 아이템 통계
   */
  async getSummary() {
    const db = getDatabase();

    const totalResult = await db.query('SELECT COUNT(*) as count FROM action_items');
    const total = parseInt(totalResult.rows[0].count);

    const pendingResult = await db.query('SELECT COUNT(*) as count FROM action_items WHERE status = $1', ['pending']);
    const pending = parseInt(pendingResult.rows[0].count);

    const inProgressResult = await db.query('SELECT COUNT(*) as count FROM action_items WHERE status = $1', ['in_progress']);
    const inProgress = parseInt(inProgressResult.rows[0].count);

    const completedResult = await db.query('SELECT COUNT(*) as count FROM action_items WHERE status = $1', ['completed']);
    const completed = parseInt(completedResult.rows[0].count);

    const overdueResult = await db.query(
      'SELECT COUNT(*) as count FROM action_items WHERE due_date < CURRENT_DATE AND status != $1',
      ['completed']
    );
    const overdue = parseInt(overdueResult.rows[0].count);

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue
    };
  }
}

module.exports = new ActionItemService();
