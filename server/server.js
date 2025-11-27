const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// OpenAI 설정
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 미팅 저장 디렉토리
const MEETINGS_DIR = path.join(__dirname, '../meetings');

// 디렉토리 생성 확인
async function ensureMeetingsDir() {
    try {
        await fs.access(MEETINGS_DIR);
    } catch {
        await fs.mkdir(MEETINGS_DIR, { recursive: true });
    }
}

// 파일명 생성 (날짜-제목.md)
function generateFilename(title, date) {
    const safeTitle = title
        .replace(/[^a-zA-Z0-9가-힣\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
    return `${date}-${safeTitle}.md`;
}

// API: 새 미팅로그 저장
app.post('/api/meetings', async (req, res) => {
    try {
        await ensureMeetingsDir();

        const { title, date, participants, content } = req.body;

        if (!title || !date || !content) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        // OpenAI로 미팅 내용 정리
        const summarizedContent = await summarizeMeeting({
            title,
            date,
            participants,
            content
        });

        // MD 파일로 저장
        const filename = generateFilename(title, date);
        const filepath = path.join(MEETINGS_DIR, filename);

        await fs.writeFile(filepath, summarizedContent, 'utf8');

        res.json({
            success: true,
            message: '미팅로그가 저장되었습니다.',
            filename
        });
    } catch (error) {
        console.error('Error saving meeting:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: 미팅로그 목록 조회
app.get('/api/meetings', async (req, res) => {
    try {
        await ensureMeetingsDir();

        const files = await fs.readdir(MEETINGS_DIR);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        const meetings = await Promise.all(
            mdFiles.map(async (filename) => {
                const filepath = path.join(MEETINGS_DIR, filename);
                const content = await fs.readFile(filepath, 'utf8');

                // 파일에서 메타데이터 추출
                const lines = content.split('\n');
                const titleLine = lines.find(l => l.startsWith('# '));
                const dateLine = lines.find(l => l.startsWith('**날짜:**'));

                return {
                    filename,
                    title: titleLine ? titleLine.replace('# ', '') : filename,
                    date: dateLine ? dateLine.replace('**날짜:**', '').trim() : '',
                    content,
                    excerpt: content.substring(0, 200)
                };
            })
        );

        // 날짜 기준 내림차순 정렬
        meetings.sort((a, b) => b.filename.localeCompare(a.filename));

        res.json(meetings);
    } catch (error) {
        console.error('Error loading meetings:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: 질문 검색 및 답변 생성
app.post('/api/search', async (req, res) => {
    try {
        await ensureMeetingsDir();

        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: '질문이 필요합니다.' });
        }

        // 모든 미팅로그 읽기
        const files = await fs.readdir(MEETINGS_DIR);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        const meetings = await Promise.all(
            mdFiles.map(async (filename) => {
                const filepath = path.join(MEETINGS_DIR, filename);
                const content = await fs.readFile(filepath, 'utf8');

                const lines = content.split('\n');
                const titleLine = lines.find(l => l.startsWith('# '));
                const dateLine = lines.find(l => l.startsWith('**날짜:**'));

                return {
                    filename,
                    title: titleLine ? titleLine.replace('# ', '') : filename,
                    date: dateLine ? dateLine.replace('**날짜:**', '').trim() : '',
                    content
                };
            })
        );

        // OpenAI로 관련 내용 찾고 답변 생성
        const result = await searchAndAnswer(question, meetings);

        res.json(result);
    } catch (error) {
        console.error('Error searching meetings:', error);
        res.status(500).json({ error: error.message });
    }
});

// OpenAI: 미팅 내용 정리
async function summarizeMeeting(meeting) {
    const prompt = `다음 미팅 내용을 구조화된 마크다운 형식으로 정리해주세요.

제목: ${meeting.title}
날짜: ${meeting.date}
참석자: ${meeting.participants || '미기재'}

내용:
${meeting.content}

다음 형식으로 정리해주세요:
1. 미팅 개요
2. 주요 논의 사항 (불릿 포인트)
3. 결정 사항
4. 액션 아이템 (담당자 포함)
5. 다음 미팅 안건 (있다면)

전문적이고 명확하게 작성하되, 원본 내용의 모든 중요한 정보를 포함해주세요.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content: '당신은 전문적인 미팅 기록 정리 전문가입니다. 미팅 내용을 구조화되고 읽기 쉬운 형식으로 정리합니다.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.7
    });

    const summarized = response.choices[0].message.content;

    // 메타데이터 추가
    return `# ${meeting.title}

**날짜:** ${meeting.date}
**참석자:** ${meeting.participants || '미기재'}

---

${summarized}`;
}

// OpenAI: 질문 검색 및 답변 생성
async function searchAndAnswer(question, meetings) {
    // 모든 미팅 내용을 컨텍스트로 구성
    const context = meetings
        .map(m => `[${m.title} - ${m.date}]\n${m.content}`)
        .join('\n\n---\n\n');

    const prompt = `다음은 저장된 미팅로그들입니다:

${context}

질문: ${question}

위 미팅로그들을 기반으로 질문에 대한 답변을 작성해주세요.
답변 시 관련 미팅의 날짜와 제목을 언급하며, 구체적인 내용을 인용해주세요.
관련 정보가 없다면 솔직하게 "관련 정보를 찾을 수 없습니다"라고 답변해주세요.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
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

    const answer = response.choices[0].message.content;

    // 관련 미팅 찾기 (간단한 키워드 매칭)
    const keywords = question.toLowerCase().split(/\s+/);
    const relatedMeetings = meetings
        .filter(m => {
            const contentLower = m.content.toLowerCase();
            return keywords.some(keyword => contentLower.includes(keyword));
        })
        .slice(0, 5)
        .map(m => ({
            title: m.title,
            date: m.date,
            excerpt: m.content.substring(0, 200) + '...'
        }));

    return {
        answer,
        relatedMeetings
    };
}

// 서버 시작
app.listen(PORT, () => {
    console.log(`Meeting Logger server running on http://localhost:${PORT}`);
    console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
