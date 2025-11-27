const openai = require('../config/openai');
const settingsService = require('./settingsService');

class AIService {
  /**
   * 미팅 내용을 구조화된 형식으로 요약
   */
  async summarizeMeeting(meetingData) {
    const { title, date, participants, content, template } = meetingData;

    // 설정된 AI 가이드라인 가져오기
    const guidelines = settingsService.getAIGuidelines();

    const prompt = `다음 미팅 내용을 구조화된 마크다운 형식으로 정리해주세요.

제목: ${title}
날짜: ${date}
참석자: ${participants || '미기재'}

내용:
${content}

${template ? `다음 템플릿 형식을 참고하세요:\n${template}\n` : ''}

다음 형식으로 정리해주세요:
1. 미팅 개요 (전체 미팅의 목적과 주요 내용 요약)
2. 주요 논의 사항 (불릿 포인트로 정리)
3. 결정 사항 (구체적인 결정 내용)
4. 액션 아이템 (담당자 포함 - 형식: "- **담당자:** [이름]: [액션 아이템]")
5. 다음 미팅 안건 (있다면)

전문적이고 명확하게 작성하되, 원본 내용의 모든 중요한 정보를 포함해주세요.

=== 정리 가이드라인 ===
${guidelines.summary ? `\n[요약 가이드라인]\n${guidelines.summary}\n` : ''}
${guidelines.focus ? `\n[주요 포커스]\n${guidelines.focus}\n` : ''}`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 전문적인 미팅 기록 정리 전문가입니다. 미팅 내용을 구조화되고 읽기 쉬운 형식으로 정리합니다. 설정된 가이드라인을 참고하여 정리합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI summarization error:', error);
      throw new Error('AI 요약 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 미팅 내용에서 액션 아이템 추출
   */
  async extractActionItems(content) {
    // 설정된 AI 가이드라인 가져오기
    const guidelines = settingsService.getAIGuidelines();

    const prompt = `다음 미팅 내용에서 액션 아이템만 추출해주세요.

미팅 내용:
${content}

각 액션 아이템을 다음 JSON 형식으로 반환해주세요:
[
  {
    "description": "액션 아이템 설명",
    "assignee": "담당자 이름 (없으면 null)",
    "priority": "high/medium/low",
    "dueDate": "기한 (YYYY-MM-DD 형식, 없으면 null)"
  }
]

액션 아이템이 없으면 빈 배열 []을 반환하세요.

${guidelines.actionItems ? `=== 액션 아이템 추출 가이드라인 ===\n${guidelines.actionItems}` : ''}`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 미팅 내용을 분석하여 액션 아이템을 추출하는 전문가입니다. 항상 valid JSON만 반환하세요. 설정된 가이드라인을 참고하여 추출합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.actionItems || [];
    } catch (error) {
      console.error('Action item extraction error:', error);
      return [];
    }
  }

  /**
   * 태그 제안
   */
  async suggestTags(content, existingTags = []) {
    const prompt = `다음 미팅 내용을 분석하여 적절한 태그를 제안해주세요.

미팅 내용:
${content}

${existingTags.length > 0 ? `기존 태그 목록: ${existingTags.join(', ')}` : ''}

다음 JSON 형식으로 태그를 제안해주세요:
{
  "tags": [
    {
      "name": "태그명",
      "confidence": 0.95 (0~1 사이의 신뢰도)
    }
  ]
}

최대 5개까지 제안하세요. 기존 태그가 있으면 우선적으로 사용하고, 필요시 새 태그를 제안하세요.`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 문서 분류 및 태깅 전문가입니다. 내용을 분석하여 적절한 태그를 제안합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.tags || [];
    } catch (error) {
      console.error('Tag suggestion error:', error);
      return [];
    }
  }

  /**
   * 질문에 대한 답변 생성 (검색)
   */
  async searchAndAnswer(question, meetings) {
    const context = meetings
      .map(m => `[${m.title} - ${m.date}]\n${m.summary || m.raw_content}`)
      .join('\n\n---\n\n');

    const prompt = `다음은 저장된 미팅로그들입니다:

${context}

질문: ${question}

위 미팅로그들을 기반으로 질문에 대한 답변을 작성해주세요.
답변 시 관련 미팅의 날짜와 제목을 언급하며, 구체적인 내용을 인용해주세요.
관련 정보가 없다면 솔직하게 "관련 정보를 찾을 수 없습니다"라고 답변해주세요.`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 미팅로그 검색 및 분석 전문가입니다. 저장된 미팅 기록을 분석하여 사용자의 질문에 정확하고 상세하게 답변합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Search and answer error:', error);
      throw new Error('AI 검색 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 인사이트 생성
   */
  async generateInsights(meetings) {
    if (meetings.length === 0) return [];

    const summary = meetings
      .slice(0, 50) // 최근 50개만
      .map(m => `[${m.date}] ${m.title}`)
      .join('\n');

    const prompt = `다음은 최근 미팅 목록입니다:

${summary}

이 미팅들을 분석하여 유용한 인사이트를 제공해주세요. 다음 JSON 형식으로 반환하세요:
{
  "insights": [
    {
      "type": "recurring_issue / trend / milestone",
      "title": "인사이트 제목",
      "description": "상세 설명",
      "confidence": 0.85 (신뢰도 0~1),
      "relatedMeetingIndices": [0, 1, 2] (관련 미팅 인덱스)
    }
  ]
}

최대 5개까지 제안하세요.`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 데이터 분석가입니다. 미팅 패턴을 분석하여 유용한 인사이트를 도출합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.insights || [];
    } catch (error) {
      console.error('Insight generation error:', error);
      return [];
    }
  }

  /**
   * 감정 분석
   */
  async analyzeSentiment(content) {
    const prompt = `다음 미팅 내용의 전반적인 분위기와 감정을 분석해주세요:

${content}

다음 JSON 형식으로 반환하세요:
{
  "overall": "positive/neutral/negative",
  "score": 0.75 (-1~1 사이, -1이 가장 부정적),
  "summary": "분위기 요약"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 감정 분석 전문가입니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return { overall: 'neutral', score: 0, summary: '분석 불가' };
    }
  }
}

module.exports = new AIService();
