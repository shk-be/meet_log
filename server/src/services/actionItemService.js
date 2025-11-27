const { getDatabase } = require('../config/database');

class ActionItemService {
  /**
   * 액션 아이템 목록 조회
   */
  getActionItems(filters = {}) {
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

    if (status) {
      query += ' AND ai.status = ?';
      params.push(status);
    }

    if (assigneeId) {
      query += ' AND ai.assignee_id = ?';
      params.push(assigneeId);
    }

    if (priority) {
      query += ' AND ai.priority = ?';
      params.push(priority);
    }

    if (meetingId) {
      query += ' AND ai.meeting_id = ?';
      params.push(meetingId);
    }

    if (overdue) {
      query += ' AND ai.due_date < date("now") AND ai.status != "completed"';
    }

    query += ' ORDER BY ai.due_date ASC, ai.priority DESC';

    return db.prepare(query).all(...params);
  }

  /**
   * 액션 아이템 조회
   */
  getActionItemById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT ai.*, p.name as assignee_name, m.title as meeting_title
      FROM action_items ai
      LEFT JOIN participants p ON ai.assignee_id = p.id
      LEFT JOIN meetings m ON ai.meeting_id = m.id
      WHERE ai.id = ?
    `).get(id);
  }

  /**
   * 액션 아이템 생성
   */
  createActionItem(data) {
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
      let participant = db.prepare('SELECT id FROM participants WHERE name = ?').get(assignee);

      if (!participant) {
        const result = db.prepare('INSERT INTO participants (name) VALUES (?)').run(assignee);
        finalAssigneeId = result.lastInsertRowid;
      } else {
        finalAssigneeId = participant.id;
      }
    }

    // meeting_id가 없으면 NULL 허용하도록 스키마 변경 필요
    // 임시로 meeting_id 없이도 생성 가능하도록 처리
    let sql, params;

    if (finalMeetingId) {
      sql = `INSERT INTO action_items (meeting_id, description, assignee_id, due_date, priority, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`;
      params = [finalMeetingId, finalDescription, finalAssigneeId, finalDueDate, finalPriority, notes, finalStatus];
    } else {
      // meeting_id가 없는 경우 - 가장 최근 미팅에 연결하거나 임시 미팅 생성
      const recentMeeting = db.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').get();
      const tempMeetingId = recentMeeting ? recentMeeting.id : this.createTempMeeting(db);

      sql = `INSERT INTO action_items (meeting_id, description, assignee_id, due_date, priority, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`;
      params = [tempMeetingId, finalDescription, finalAssigneeId, finalDueDate, finalPriority, notes, finalStatus];
    }

    const result = db.prepare(sql).run(...params);
    return this.getActionItemById(result.lastInsertRowid);
  }

  /**
   * 임시 미팅 생성 (액션 아이템만 있는 경우)
   */
  createTempMeeting(db) {
    const result = db.prepare(`
      INSERT INTO meetings (title, date, raw_content, summary)
      VALUES (?, date('now'), ?, ?)
    `).run('일반 액션 아이템', '미팅과 연결되지 않은 액션 아이템입니다.', '일반 액션 아이템 관리용');

    return result.lastInsertRowid;
  }

  /**
   * 액션 아이템 수정
   */
  updateActionItem(id, updates) {
    const db = getDatabase();
    const fields = [];
    const params = [];

    // title과 description 모두 처리
    const finalDescription = updates.title || updates.description;
    if (finalDescription !== undefined) {
      fields.push('description = ?');
      params.push(finalDescription);
    }

    // assignee 이름 처리
    if (updates.assignee && !updates.assigneeId && !updates.assignee_id) {
      let participant = db.prepare('SELECT id FROM participants WHERE name = ?').get(updates.assignee);

      if (!participant) {
        const result = db.prepare('INSERT INTO participants (name) VALUES (?)').run(updates.assignee);
        updates.assigneeId = result.lastInsertRowid;
      } else {
        updates.assigneeId = participant.id;
      }
    }

    const finalAssigneeId = updates.assigneeId || updates.assignee_id;
    if (finalAssigneeId !== undefined) {
      fields.push('assignee_id = ?');
      params.push(finalAssigneeId);
    }

    const finalDueDate = updates.dueDate || updates.due_date;
    if (finalDueDate !== undefined) {
      fields.push('due_date = ?');
      params.push(finalDueDate);
    }

    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      params.push(updates.priority);
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);

      if (updates.status === 'completed') {
        fields.push('completion_date = CURRENT_TIMESTAMP');
      }
    }

    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      params.push(updates.notes);
    }

    if (fields.length === 0) {
      return this.getActionItemById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(`UPDATE action_items SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    return this.getActionItemById(id);
  }

  /**
   * 액션 아이템 삭제
   */
  deleteActionItem(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM action_items WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * 액션 아이템 통계
   */
  getSummary() {
    const db = getDatabase();

    const total = db.prepare('SELECT COUNT(*) as count FROM action_items').get().count;
    const pending = db.prepare('SELECT COUNT(*) as count FROM action_items WHERE status = "pending"').get().count;
    const inProgress = db.prepare('SELECT COUNT(*) as count FROM action_items WHERE status = "in_progress"').get().count;
    const completed = db.prepare('SELECT COUNT(*) as count FROM action_items WHERE status = "completed"').get().count;
    const overdue = db.prepare(
      'SELECT COUNT(*) as count FROM action_items WHERE due_date < date("now") AND status != "completed"'
    ).get().count;

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
