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
        template: templateId ? await this.getTemplateContent(templateId) : null
      });

      // 섹션별로 파싱
      const sections = this.parseSummarizedContent(summarized);

      // 미팅 삽입
      const result = await db.query(`
        INSERT INTO meetings (
          title, date, start_time, end_time, location, meeting_type,
          template_id, raw_content, summary, overview,
          discussion, decisions, next_steps
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
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
      ]);

      const meetingId = result.rows[0].id;

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
      const existingTags = await this.getAllTagNames();
      const suggestedTags = await aiService.suggestTags(content, existingTags);
      if (suggestedTags.length > 0) {
        await this.addTags(meetingId, suggestedTags);
      }

      return await this.getMeetingById(meetingId);
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
  async getMeetingById(id) {
    const db = getDatabase();

    const result = await db.query('SELECT * FROM meetings WHERE id = $1', [id]);
    const meeting = result.rows[0];

    if (!meeting) return null;

    // 참석자 조회
    const participantsResult = await db.query(`
      SELECT p.* FROM participants p
      JOIN meeting_participants mp ON p.id = mp.participant_id
      WHERE mp.meeting_id = $1
    `, [id]);
    meeting.participants = participantsResult.rows;

    // 액션 아이템 조회
    const actionItemsResult = await db.query(`
      SELECT ai.*, p.name as assignee_name
      FROM action_items ai
      LEFT JOIN participants p ON ai.assignee_id = p.id
      WHERE ai.meeting_id = $1
    `, [id]);
    meeting.actionItems = actionItemsResult.rows;

    // 태그 조회
    const tagsResult = await db.query(`
      SELECT t.*, mt.confidence FROM tags t
      JOIN meeting_tags mt ON t.id = mt.tag_id
      WHERE mt.meeting_id = $1
    `, [id]);
    meeting.tags = tagsResult.rows;

    return meeting;
  }

  /**
   * 미팅 목록 조회 (필터링, 페이지네이션)
   */
  async getMeetings(filters = {}) {
    const db = getDatabase();
    const { page = 1, limit = 20, search, startDate, endDate, participantId, tagId, projectId, status } = filters;

    let query = 'SELECT * FROM meetings WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (title LIKE $${paramIndex} OR raw_content LIKE $${paramIndex + 1} OR summary LIKE $${paramIndex + 2})`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
      paramIndex += 3;
    }

    if (startDate) {
      query += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (participantId) {
      query += ` AND id IN (SELECT meeting_id FROM meeting_participants WHERE participant_id = $${paramIndex})`;
      params.push(participantId);
      paramIndex++;
    }

    if (tagId) {
      query += ` AND id IN (SELECT meeting_id FROM meeting_tags WHERE tag_id = $${paramIndex})`;
      params.push(tagId);
      paramIndex++;
    }

    if (projectId) {
      query += ` AND id IN (SELECT meeting_id FROM meeting_projects WHERE project_id = $${paramIndex})`;
      params.push(projectId);
      paramIndex++;
    }

    query += ' ORDER BY date DESC, created_at DESC';
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await db.query(query, params);
    const meetings = result.rows;

    // 각 미팅에 참석자 수, 액션 아이템 수 추가
    for (const meeting of meetings) {
      const participantCountResult = await db.query(
        'SELECT COUNT(*) as count FROM meeting_participants WHERE meeting_id = $1',
        [meeting.id]
      );
      meeting.participantCount = parseInt(participantCountResult.rows[0].count);

      const actionItemCountResult = await db.query(
        'SELECT COUNT(*) as count FROM action_items WHERE meeting_id = $1',
        [meeting.id]
      );
      meeting.actionItemCount = parseInt(actionItemCountResult.rows[0].count);

      const tagCountResult = await db.query(
        'SELECT COUNT(*) as count FROM meeting_tags WHERE meeting_id = $1',
        [meeting.id]
      );
      meeting.tagCount = parseInt(tagCountResult.rows[0].count);
    }

    // 전체 개수
    let countQuery = 'SELECT COUNT(*) as total FROM meetings WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (title LIKE $${countParamIndex} OR raw_content LIKE $${countParamIndex + 1} OR summary LIKE $${countParamIndex + 2})`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
      countParamIndex += 3;
    }
    if (startDate) {
      countQuery += ` AND date >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }
    if (endDate) {
      countQuery += ` AND date <= $${countParamIndex}`;
      countParams.push(endDate);
      countParamIndex++;
    }
    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    if (participantId) {
      countQuery += ` AND id IN (SELECT meeting_id FROM meeting_participants WHERE participant_id = $${countParamIndex})`;
      countParams.push(participantId);
      countParamIndex++;
    }
    if (tagId) {
      countQuery += ` AND id IN (SELECT meeting_id FROM meeting_tags WHERE tag_id = $${countParamIndex})`;
      countParams.push(tagId);
      countParamIndex++;
    }
    if (projectId) {
      countQuery += ` AND id IN (SELECT meeting_id FROM meeting_projects WHERE project_id = $${countParamIndex})`;
      countParams.push(projectId);
      countParamIndex++;
    }

    const totalResult = await db.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].total);

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
  async updateMeeting(id, updates) {
    const db = getDatabase();

    // 기존 미팅 조회
    const existingMeeting = await this.getMeetingById(id);
    if (!existingMeeting) {
      throw new Error('Meeting not found');
    }

    // 버전 생성
    const versionResult = await db.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM meeting_versions WHERE meeting_id = $1',
      [id]
    );
    const versionNumber = versionResult.rows[0].next_version;

    await db.query(`
      INSERT INTO meeting_versions (
        meeting_id, version_number, title, raw_content, summary,
        overview, discussion, decisions, next_steps, change_summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
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
    ]);

    // 미팅 업데이트
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (updates.title) {
      updateFields.push(`title = $${paramIndex}`);
      updateParams.push(updates.title);
      paramIndex++;
    }
    if (updates.date) {
      updateFields.push(`date = $${paramIndex}`);
      updateParams.push(updates.date);
      paramIndex++;
    }
    if (updates.rawContent) {
      updateFields.push(`raw_content = $${paramIndex}`);
      updateParams.push(updates.rawContent);
      paramIndex++;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(id);

    await db.query(`
      UPDATE meetings SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
    `, updateParams);

    return await this.getMeetingById(id);
  }

  /**
   * 미팅 삭제
   */
  async deleteMeeting(id) {
    const db = getDatabase();
    const result = await db.query('DELETE FROM meetings WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * 참석자 추가
   */
  async addParticipants(meetingId, participantNames) {
    const db = getDatabase();

    for (const name of participantNames) {
      const participantResult = await db.query('SELECT id FROM participants WHERE name = $1', [name]);
      let participantId;

      if (participantResult.rows.length === 0) {
        const insertResult = await db.query('INSERT INTO participants (name) VALUES ($1) RETURNING id', [name]);
        participantId = insertResult.rows[0].id;
      } else {
        participantId = participantResult.rows[0].id;
      }

      await db.query(`
        INSERT INTO meeting_participants (meeting_id, participant_id)
        VALUES ($1, $2)
        ON CONFLICT (meeting_id, participant_id) DO NOTHING
      `, [meetingId, participantId]);
    }
  }

  /**
   * 액션 아이템 추가
   */
  async addActionItems(meetingId, actionItems) {
    const db = getDatabase();

    for (const item of actionItems) {
      let assigneeId = null;

      if (item.assignee) {
        const participantResult = await db.query('SELECT id FROM participants WHERE name = $1', [item.assignee]);

        if (participantResult.rows.length === 0) {
          const insertResult = await db.query('INSERT INTO participants (name) VALUES ($1) RETURNING id', [item.assignee]);
          assigneeId = insertResult.rows[0].id;
        } else {
          assigneeId = participantResult.rows[0].id;
        }
      }

      await db.query(`
        INSERT INTO action_items (meeting_id, description, assignee_id, priority, due_date)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        meetingId,
        item.description,
        assigneeId,
        item.priority || 'medium',
        item.dueDate || null
      ]);
    }
  }

  /**
   * 태그 추가
   */
  async addTags(meetingId, tags) {
    const db = getDatabase();

    for (const tag of tags) {
      const tagResult = await db.query('SELECT id FROM tags WHERE name = $1', [tag.name]);
      let tagId;

      if (tagResult.rows.length === 0) {
        const insertResult = await db.query(`
          INSERT INTO tags (name, is_ai_suggested, usage_count)
          VALUES ($1, true, 0)
          RETURNING id
        `, [tag.name]);
        tagId = insertResult.rows[0].id;
      } else {
        tagId = tagResult.rows[0].id;
      }

      // 태그 사용 횟수 증가
      await db.query('UPDATE tags SET usage_count = usage_count + 1 WHERE id = $1', [tagId]);

      // 미팅에 태그 연결
      await db.query(`
        INSERT INTO meeting_tags (meeting_id, tag_id, confidence)
        VALUES ($1, $2, $3)
        ON CONFLICT (meeting_id, tag_id) DO NOTHING
      `, [meetingId, tagId, tag.confidence || 1.0]);
    }
  }

  /**
   * 모든 태그 이름 조회
   */
  async getAllTagNames() {
    const db = getDatabase();
    const result = await db.query('SELECT name FROM tags');
    return result.rows.map(t => t.name);
  }

  /**
   * 템플릿 내용 조회
   */
  async getTemplateContent(templateId) {
    const db = getDatabase();
    const result = await db.query('SELECT template_content FROM meeting_templates WHERE id = $1', [templateId]);
    return result.rows.length > 0 ? result.rows[0].template_content : null;
  }

  /**
   * 버전 히스토리 조회
   */
  async getVersionHistory(meetingId) {
    const db = getDatabase();
    const result = await db.query(`
      SELECT * FROM meeting_versions
      WHERE meeting_id = $1
      ORDER BY version_number DESC
    `, [meetingId]);
    return result.rows;
  }

  /**
   * 버전 복원
   */
  async restoreVersion(meetingId, versionNumber) {
    const db = getDatabase();

    const result = await db.query(`
      SELECT * FROM meeting_versions WHERE meeting_id = $1 AND version_number = $2
    `, [meetingId, versionNumber]);

    if (result.rows.length === 0) {
      throw new Error('Version not found');
    }

    const version = result.rows[0];

    // 현재 버전을 히스토리에 저장하고 복원
    await this.updateMeeting(meetingId, {
      title: version.title,
      rawContent: version.raw_content,
      changeSummary: `Restored from version ${versionNumber}`
    });

    return await this.getMeetingById(meetingId);
  }
}

module.exports = new MeetingService();
