const { getDatabase } = require('../database/db');

class TemplateService {
  /**
   * 모든 템플릿 조회
   */
  async getAllTemplates() {
    const db = getDatabase();

    try {
      const result = await db.query(`
        SELECT * FROM meeting_templates
        ORDER BY is_default DESC, name ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * 템플릿 ID로 조회
   */
  async getTemplateById(id) {
    const db = getDatabase();

    try {
      const result = await db.query(
        'SELECT * FROM meeting_templates WHERE id = $1',
        [id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    }
  }

  /**
   * 기본 템플릿 조회
   */
  async getDefaultTemplates() {
    const db = getDatabase();

    try {
      const result = await db.query(
        'SELECT * FROM meeting_templates WHERE is_default = true ORDER BY name ASC'
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting default templates:', error);
      throw error;
    }
  }

  /**
   * 새 템플릿 생성
   */
  async createTemplate(templateData) {
    const db = getDatabase();
    const { name, description, meetingType, templateContent, isDefault } = templateData;

    try {
      const result = await db.query(`
        INSERT INTO meeting_templates (
          name, description, meeting_type, template_content, is_default
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name, description, meetingType, templateContent, isDefault || false]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * 템플릿 수정
   */
  async updateTemplate(id, templateData) {
    const db = getDatabase();
    const { name, description, meetingType, templateContent, isDefault } = templateData;

    try {
      const result = await db.query(`
        UPDATE meeting_templates
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          meeting_type = COALESCE($3, meeting_type),
          template_content = COALESCE($4, template_content),
          is_default = COALESCE($5, is_default),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [name, description, meetingType, templateContent, isDefault, id]);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * 템플릿 삭제
   */
  async deleteTemplate(id) {
    const db = getDatabase();

    try {
      await db.query('DELETE FROM meeting_templates WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * 템플릿으로부터 미팅 생성
   */
  async createMeetingFromTemplate(templateId, meetingData) {
    const db = getDatabase();

    try {
      const template = await this.getTemplateById(templateId);

      if (!template) {
        throw new Error('템플릿을 찾을 수 없습니다.');
      }

      // 템플릿 내용을 미팅 내용으로 사용
      const rawContent = meetingData.content || template.template_content;

      const result = await db.query(`
        INSERT INTO meetings (
          title, date, start_time, end_time, location,
          meeting_type, template_id, raw_content, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        meetingData.title,
        meetingData.date,
        meetingData.startTime || null,
        meetingData.endTime || null,
        meetingData.location || null,
        template.meeting_type,
        templateId,
        rawContent,
        meetingData.status || 'draft'
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating meeting from template:', error);
      throw error;
    }
  }

  /**
   * 기본 템플릿 초기화
   */
  async initializeDefaultTemplates() {
    const db = getDatabase();

    const defaultTemplates = [
      {
        name: '일일 스탠드업',
        description: '팀의 일일 진행 상황을 공유하는 짧은 미팅',
        meeting_type: 'standup',
        template_content: `# 일일 스탠드업

## 날짜: [날짜]
## 참석자: [팀원 이름]

### 어제 한 일
-

### 오늘 할 일
-

### 블로커/이슈
-

### 기타 공유사항
- `,
        is_default: true
      },
      {
        name: '주간 회고',
        description: '지난 주를 돌아보고 개선점을 찾는 회고 미팅',
        meeting_type: 'retrospective',
        template_content: `# 주간 회고

## 날짜: [날짜]
## 참석자: [팀원 이름]

### 잘한 점 (Keep)
-

### 개선할 점 (Problem)
-

### 시도할 것 (Try)
-

### 액션 아이템
- [ ]
- [ ]

### 다음 회고 안건
- `,
        is_default: true
      },
      {
        name: '1:1 미팅',
        description: '매니저와 팀원의 일대일 미팅',
        meeting_type: 'one_on_one',
        template_content: `# 1:1 미팅

## 날짜: [날짜]
## 참석자: [매니저], [팀원]

### 최근 업무 현황
-

### 목표 달성 진행도
-

### 어려운 점 / 도움이 필요한 부분
-

### 커리어 개발 / 성장
-

### 피드백
-

### 다음 미팅까지 액션 아이템
- [ ]
- [ ] `,
        is_default: true
      },
      {
        name: '프로젝트 킥오프',
        description: '새 프로젝트 시작을 위한 킥오프 미팅',
        meeting_type: 'kickoff',
        template_content: `# 프로젝트 킥오프

## 프로젝트명: [프로젝트명]
## 날짜: [날짜]
## 참석자: [팀원 이름]

### 프로젝트 개요
- 목적:
- 범위:
- 주요 목표:

### 타임라인
- 시작일:
- 마일스톤:
- 완료 예정일:

### 역할 및 책임
-

### 요구사항
-

### 리스크 및 의존성
-

### 다음 단계
- [ ]
- [ ] `,
        is_default: true
      },
      {
        name: '브레인스토밍',
        description: '아이디어 발산 및 토론을 위한 미팅',
        meeting_type: 'brainstorming',
        template_content: `# 브레인스토밍 세션

## 주제: [주제]
## 날짜: [날짜]
## 참석자: [팀원 이름]

### 목표
-

### 아이디어
1.
2.
3.

### 토론 내용
-

### 선정된 아이디어
-

### 다음 단계
- [ ]
- [ ] `,
        is_default: true
      },
      {
        name: '스프린트 계획',
        description: '스프린트 작업을 계획하는 미팅',
        meeting_type: 'sprint_planning',
        template_content: `# 스프린트 계획

## 스프린트: [스프린트 번호]
## 기간: [시작일] ~ [종료일]
## 참석자: [팀원 이름]

### 스프린트 목표
-

### 완료할 스토리
- [ ]
- [ ]

### 추정 포인트: [총 포인트]

### 주요 마일스톤
-

### 리스크
-

### 의존성
- `,
        is_default: true
      }
    ];

    try {
      // 기존 기본 템플릿 확인
      const existing = await db.query(
        'SELECT COUNT(*) as count FROM meeting_templates WHERE is_default = true'
      );

      if (existing.rows[0].count > 0) {
        console.log('Default templates already exist');
        return;
      }

      // 기본 템플릿 생성
      for (const template of defaultTemplates) {
        await db.query(`
          INSERT INTO meeting_templates (name, description, meeting_type, template_content, is_default)
          VALUES ($1, $2, $3, $4, $5)
        `, [template.name, template.description, template.meeting_type, template.template_content, template.is_default]);
      }

      console.log('✓ Default templates initialized');
    } catch (error) {
      console.error('Error initializing default templates:', error);
    }
  }
}

module.exports = new TemplateService();
