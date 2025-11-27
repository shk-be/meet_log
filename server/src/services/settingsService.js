const { getDatabase } = require('../config/database');
const fs = require('fs');
const path = require('path');

class SettingsService {
  constructor() {
    this.settingsFile = path.join(__dirname, '../../data/settings.json');
    this.initializeSettings();
  }

  initializeSettings() {
    // data 디렉토리가 없으면 생성
    const dataDir = path.dirname(this.settingsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.settingsFile)) {
      const defaultSettings = {
        aiGuidelines: {
          summary: `미팅 요약 시 다음 사항에 중점을 두세요:
- 핵심 결정사항과 그 배경
- 명확한 액션 아이템과 담당자
- 다음 스텝과 마일스톤
- 중요한 논의 포인트와 반대 의견`,

          actionItems: `액션 아이템 추출 시 다음을 확인하세요:
- 명확한 담당자가 지정되었는지
- 구체적인 마감일이 있는지
- 액션이 실행 가능한지 (구체적인지)
- 우선순위가 명확한지`,

          focus: `미팅록 정리 시 특별히 주의할 점:
- 수치나 데이터는 정확하게 기록
- 의사결정 과정과 근거를 명확히
- 누가, 언제, 무엇을, 어떻게를 명확히
- 다음 미팅까지의 체크포인트 설정`
        },

        meetingTypes: [
          {
            id: 'standup',
            name: '데일리 스탠드업',
            template: '진행 상황, 오늘 할 일, 블로커 중심으로 간단히 정리'
          },
          {
            id: 'planning',
            name: '기획 미팅',
            template: '목표, 요구사항, 제약사항, 일정, 담당자를 명확히 정리'
          },
          {
            id: 'retrospective',
            name: '회고',
            template: '잘한 점, 개선할 점, 액션 아이템 중심으로 정리'
          },
          {
            id: 'general',
            name: '일반 미팅',
            template: '논의사항, 결정사항, 액션아이템을 명확히 구분하여 정리'
          }
        ]
      };

      fs.writeFileSync(this.settingsFile, JSON.stringify(defaultSettings, null, 2));
    }
  }

  getSettings() {
    try {
      const data = fs.readFileSync(this.settingsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading settings:', error);
      return null;
    }
  }

  updateSettings(settings) {
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2));
      return settings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  getAIGuidelines() {
    const settings = this.getSettings();
    return settings?.aiGuidelines || {};
  }

  updateAIGuidelines(guidelines) {
    const settings = this.getSettings();
    settings.aiGuidelines = { ...settings.aiGuidelines, ...guidelines };
    return this.updateSettings(settings);
  }

  getMeetingTypes() {
    const settings = this.getSettings();
    return settings?.meetingTypes || [];
  }

  addMeetingType(meetingType) {
    const settings = this.getSettings();
    if (!settings.meetingTypes) {
      settings.meetingTypes = [];
    }

    meetingType.id = meetingType.id || Date.now().toString();
    settings.meetingTypes.push(meetingType);

    return this.updateSettings(settings);
  }

  updateMeetingType(id, updates) {
    const settings = this.getSettings();
    const index = settings.meetingTypes.findIndex(t => t.id === id);

    if (index === -1) {
      throw new Error('Meeting type not found');
    }

    settings.meetingTypes[index] = { ...settings.meetingTypes[index], ...updates };
    return this.updateSettings(settings);
  }

  deleteMeetingType(id) {
    const settings = this.getSettings();
    settings.meetingTypes = settings.meetingTypes.filter(t => t.id !== id);
    return this.updateSettings(settings);
  }
}

module.exports = new SettingsService();
