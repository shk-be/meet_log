const { getDatabase } = require('../config/database');
const aiService = require('./aiService');

class MeetingService {
  /**
   * 미팅 생성
   */
  async createMeeting(meetingData) {
    const db = getDatabase();
    const { title, date, startTime, endTime, location, meetingType, participants, content, templateId } = meetingData;

    try {
      // AI로 내용 요약
      const summarized = await aiService.summarizeMeeting({
        title,
        date,
        participants: participants?.join(', '),
        content,
        template: templateId ? this.getTemplateContent(templateId) : null
      });

      // 섹션별로 파싱
      const sections = this.parseSummarizedContent(summarized);

      // 미팅 삽입
      const insertMeeting = db.prepare(`
        INSERT INTO meetings (
          title, date, start_time, end_time, location, meeting_type,
          template_id, raw_content, summary, overview,
          discussion, decisions, next_steps
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertMeeting.run(
        title,
        date,
        startTime,
        endTime,
        location,
        meetingType,
        templateId,
        content,
        summarized,
        sections.overview,
        sections.discussion,
        sections.decisions,
        sections.nextSteps
      );

      const meetingId = result.lastInsertRowid;

      // 참석자 추가
      if (participants && participants.length > 0) {
        await this.addParticipants(meetingId, participants);
      }

      // 액션 아이템 자동 추출
      const actionItems = await aiService.extractActionItems(content);
      if (actionItems.length > 0) {
        await this.addActionItems(meetingId, actionItems);
      }

      // 태그 자동 제안
      const existingTags = this.getAllTagNames();
      const suggestedTags = await aiService.suggestTags(content, existingTags);
      if (suggestedTags.length > 0) {
        await this.addTags(meetingId, suggestedTags);
      }

      return this.getMeetingById(meetingId);
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * 요약된 내용을 섹션별로 파싱
   */
  parseSummarizedContent(content) {
    const sections = {
      overview: '',
      discussion: '',
      decisions: '',
      nextSteps: ''
    };

    const overviewMatch = content.match(/## 1\. 미팅 개요\n([\s\S]*?)(?=\n## |\Z)/);
    const discussionMatch = content.match(/## 2\. 주요 논의 사항\n([\s\S]*?)(?=\n## |\Z)/);
    const decisionsMatch = content.match(/## 3\. 결정 사항\n([\s\S]*?)(?=\n## |\Z)/);
    const actionMatch = content.match(/## 4\. 액션 아이템\n([\s\S]*?)(?=\n## |\Z)/);
    const nextMatch = content.match(/## 5\. 다음 미팅 안건\n([\s\S]*?)(?=\n## |\Z)/);

    if (overviewMatch) sections.overview = overviewMatch[1].trim();
    if (discussionMatch) sections.discussion = discussionMatch[1].trim();
    if (decisionsMatch) sections.decisions = decisionsMatch[1].trim();
    if (nextMatch) sections.nextSteps = nextMatch[1].trim();

    return sections;
  }

  /**
   * 미팅 조회 (ID)
   */
  getMeetingById(id) {
    const db = getDatabase();

    const meeting = db.prepare(`
      SELECT * FROM meetings WHERE id = ?
    `).get(id);

    if (!meeting) return null;

    // 참석자 조회
    meeting.participants = db.prepare(`
      SELECT p.* FROM participants p
      JOIN meeting_participants mp ON p.id = mp.participant_id
      WHERE mp.meeting_id = ?
    `).all(id);

    // 액션 아이템 조회
    meeting.actionItems = db.prepare(`
      SELECT ai.*, p.name as assignee_name
      FROM action_items ai
      LEFT JOIN participants p ON ai.assignee_id = p.id
      WHERE ai.meeting_id = ?
    `).all(id);

    // 태그 조회
    meeting.tags = db.prepare(`
      SELECT t.*, mt.confidence FROM tags t
      JOIN meeting_tags mt ON t.id = mt.tag_id
      WHERE mt.meeting_id = ?
    `).all(id);

    return meeting;
  }

  /**
   * 미팅 목록 조회 (필터링, 페이지네이션)
   */
  getMeetings(filters = {}) {
    const db = getDatabase();
    const { page = 1, limit = 20, search, startDate, endDate, participantId, tagId, projectId, status } = filters;

    let query = 'SELECT * FROM meetings WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (title LIKE ? OR raw_content LIKE ? OR summary LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (participantId) {
      query += ' AND id IN (SELECT meeting_id FROM meeting_participants WHERE participant_id = ?)';
      params.push(participantId);
    }

    if (tagId) {
      query += ' AND id IN (SELECT meeting_id FROM meeting_tags WHERE tag_id = ?)';
      params.push(tagId);
    }

    if (projectId) {
      query += ' AND id IN (SELECT meeting_id FROM meeting_projects WHERE project_id = ?)';
      params.push(projectId);
    }

    query += ' ORDER BY date DESC, created_at DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const meetings = db.prepare(query).all(...params);

    // 각 미팅에 참석자 수, 액션 아이템 수 추가
    meetings.forEach(meeting => {
      meeting.participantCount = db.prepare(
        'SELECT COUNT(*) as count FROM meeting_participants WHERE meeting_id = ?'
      ).get(meeting.id).count;

      meeting.actionItemCount = db.prepare(
        'SELECT COUNT(*) as count FROM action_items WHERE meeting_id = ?'
      ).get(meeting.id).count;

      meeting.tagCount = db.prepare(
        'SELECT COUNT(*) as count FROM meeting_tags WHERE meeting_id = ?'
      ).get(meeting.id).count;
    });

    // 전체 개수
    let countQuery = 'SELECT COUNT(*) as total FROM meetings WHERE 1=1';
    const countParams = params.slice(0, -2); // LIMIT과 OFFSET 제외

    if (search) {
      countQuery += ' AND (title LIKE ? OR raw_content LIKE ? OR summary LIKE ?)';
    }
    if (startDate) countQuery += ' AND date >= ?';
    if (endDate) countQuery += ' AND date <= ?';
    if (status) countQuery += ' AND status = ?';
    if (participantId) countQuery += ' AND id IN (SELECT meeting_id FROM meeting_participants WHERE participant_id = ?)';
    if (tagId) countQuery += ' AND id IN (SELECT meeting_id FROM meeting_tags WHERE tag_id = ?)';
    if (projectId) countQuery += ' AND id IN (SELECT meeting_id FROM meeting_projects WHERE project_id = ?)';

    const total = db.prepare(countQuery).get(...countParams).total;

    return {
      meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 미팅 수정 (버전 생성)
   */
  updateMeeting(id, updates) {
    const db = getDatabase();

    // 기존 미팅 조회
    const existingMeeting = this.getMeetingById(id);
    if (!existingMeeting) {
      throw new Error('Meeting not found');
    }

    // 버전 생성
    const versionNumber = db.prepare(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM meeting_versions WHERE meeting_id = ?'
    ).get(id).next_version;

    db.prepare(`
      INSERT INTO meeting_versions (
        meeting_id, version_number, title, raw_content, summary,
        overview, discussion, decisions, next_steps, change_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      versionNumber,
      existingMeeting.title,
      existingMeeting.raw_content,
      existingMeeting.summary,
      existingMeeting.overview,
      existingMeeting.discussion,
      existingMeeting.decisions,
      existingMeeting.next_steps,
      updates.changeSummary || 'Updated'
    );

    // 미팅 업데이트
    const updateFields = [];
    const updateParams = [];

    if (updates.title) {
      updateFields.push('title = ?');
      updateParams.push(updates.title);
    }
    if (updates.date) {
      updateFields.push('date = ?');
      updateParams.push(updates.date);
    }
    if (updates.rawContent) {
      updateFields.push('raw_content = ?');
      updateParams.push(updates.rawContent);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(id);

    db.prepare(`
      UPDATE meetings SET ${updateFields.join(', ')} WHERE id = ?
    `).run(...updateParams);

    return this.getMeetingById(id);
  }

  /**
   * 미팅 삭제
   */
  deleteMeeting(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * 참석자 추가
   */
  async addParticipants(meetingId, participantNames) {
    const db = getDatabase();

    for (const name of participantNames) {
      let participant = db.prepare('SELECT id FROM participants WHERE name = ?').get(name);

      if (!participant) {
        const result = db.prepare('INSERT INTO participants (name) VALUES (?)').run(name);
        participant = { id: result.lastInsertRowid };
      }

      db.prepare(`
        INSERT OR IGNORE INTO meeting_participants (meeting_id, participant_id)
        VALUES (?, ?)
      `).run(meetingId, participant.id);
    }
  }

  /**
   * 액션 아이템 추가
   */
  async addActionItems(meetingId, actionItems) {
    const db = getDatabase();
    const insertActionItem = db.prepare(`
      INSERT INTO action_items (meeting_id, description, assignee_id, priority, due_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of actionItems) {
      let assigneeId = null;

      if (item.assignee) {
        let participant = db.prepare('SELECT id FROM participants WHERE name = ?').get(item.assignee);
        if (!participant) {
          const result = db.prepare('INSERT INTO participants (name) VALUES (?)').run(item.assignee);
          participant = { id: result.lastInsertRowid };
        }
        assigneeId = participant.id;
      }

      insertActionItem.run(
        meetingId,
        item.description,
        assigneeId,
        item.priority || 'medium',
        item.dueDate || null
      );
    }
  }

  /**
   * 태그 추가
   */
  async addTags(meetingId, tags) {
    const db = getDatabase();

    for (const tag of tags) {
      let tagRecord = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag.name);

      if (!tagRecord) {
        const result = db.prepare(`
          INSERT INTO tags (name, is_ai_suggested, usage_count)
          VALUES (?, 1, 0)
        `).run(tag.name);
        tagRecord = { id: result.lastInsertRowid };
      }

      // 태그 사용 횟수 증가
      db.prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?').run(tagRecord.id);

      // 미팅에 태그 연결
      db.prepare(`
        INSERT OR IGNORE INTO meeting_tags (meeting_id, tag_id, confidence)
        VALUES (?, ?, ?)
      `).run(meetingId, tagRecord.id, tag.confidence || 1.0);
    }
  }

  /**
   * 모든 태그 이름 조회
   */
  getAllTagNames() {
    const db = getDatabase();
    const tags = db.prepare('SELECT name FROM tags').all();
    return tags.map(t => t.name);
  }

  /**
   * 템플릿 내용 조회
   */
  getTemplateContent(templateId) {
    const db = getDatabase();
    const template = db.prepare('SELECT template_content FROM meeting_templates WHERE id = ?').get(templateId);
    return template ? template.template_content : null;
  }

  /**
   * 버전 히스토리 조회
   */
  getVersionHistory(meetingId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM meeting_versions
      WHERE meeting_id = ?
      ORDER BY version_number DESC
    `).all(meetingId);
  }

  /**
   * 버전 복원
   */
  restoreVersion(meetingId, versionNumber) {
    const db = getDatabase();

    const version = db.prepare(`
      SELECT * FROM meeting_versions WHERE meeting_id = ? AND version_number = ?
    `).get(meetingId, versionNumber);

    if (!version) {
      throw new Error('Version not found');
    }

    // 현재 버전을 히스토리에 저장하고 복원
    this.updateMeeting(meetingId, {
      title: version.title,
      rawContent: version.raw_content,
      changeSummary: `Restored from version ${versionNumber}`
    });

    return this.getMeetingById(meetingId);
  }
}

module.exports = new MeetingService();
