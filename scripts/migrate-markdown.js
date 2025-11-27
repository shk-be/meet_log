const fs = require('fs').promises;
const path = require('path');
const { initializeDatabase } = require('../server/src/database/db');

const MEETINGS_DIR = path.join(__dirname, '../meetings');
const ARCHIVE_DIR = path.join(__dirname, '../data/meetings_archive');

async function ensureArchiveDir() {
  try {
    await fs.access(ARCHIVE_DIR);
  } catch {
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  }
}

// 마크다운 파일에서 메타데이터 추출
function extractMetadata(content) {
  const lines = content.split('\n');

  const titleLine = lines.find(l => l.startsWith('# '));
  const dateLine = lines.find(l => l.startsWith('**날짜:**'));
  const participantsLine = lines.find(l => l.startsWith('**참석자:**'));

  return {
    title: titleLine ? titleLine.replace('# ', '').trim() : '',
    date: dateLine ? dateLine.replace('**날짜:**', '').trim() : '',
    participants: participantsLine ? participantsLine.replace('**참석자:**', '').trim() : ''
  };
}

// 마크다운 파일을 파싱하여 섹션별로 분리
function parseMarkdownSections(content) {
  const sections = {
    overview: '',
    discussion: '',
    decisions: '',
    actionItems: '',
    nextSteps: ''
  };

  // 간단한 파싱 - 섹션 헤더로 구분
  const overviewMatch = content.match(/## 1\. 미팅 개요\n([\s\S]*?)(?=\n## |\n---|\Z)/);
  const discussionMatch = content.match(/## 2\. 주요 논의 사항\n([\s\S]*?)(?=\n## |\n---|\Z)/);
  const decisionsMatch = content.match(/## 3\. 결정 사항\n([\s\S]*?)(?=\n## |\n---|\Z)/);
  const actionMatch = content.match(/## 4\. 액션 아이템\n([\s\S]*?)(?=\n## |\n---|\Z)/);
  const nextMatch = content.match(/## 5\. 다음 미팅 안건\n([\s\S]*?)(?=\n## |\n---|\Z)/);

  if (overviewMatch) sections.overview = overviewMatch[1].trim();
  if (discussionMatch) sections.discussion = discussionMatch[1].trim();
  if (decisionsMatch) sections.decisions = decisionsMatch[1].trim();
  if (actionMatch) sections.actionItems = actionMatch[1].trim();
  if (nextMatch) sections.nextSteps = nextMatch[1].trim();

  return sections;
}

// 액션 아이템 추출
function extractActionItems(actionItemsText, meetingId, db) {
  if (!actionItemsText) return [];

  const lines = actionItemsText.split('\n').filter(l => l.trim().startsWith('-'));
  const actionItems = [];

  for (const line of lines) {
    // "- **담당자:** 설명" 형식 파싱
    const match = line.match(/-\s*\**담당자:\**\s*([^:]+):\s*(.+)/);
    if (match) {
      const assigneeName = match[1].trim();
      const description = match[2].trim();

      // 담당자 찾기 또는 생성
      let participant = db.prepare('SELECT id FROM participants WHERE name = ?').get(assigneeName);
      if (!participant) {
        const result = db.prepare('INSERT INTO participants (name) VALUES (?)').run(assigneeName);
        participant = { id: result.lastInsertRowid };
      }

      actionItems.push({
        meetingId,
        description,
        assigneeId: participant.id
      });
    } else {
      // 담당자 없는 액션 아이템
      const description = line.replace(/^-\s*\**/, '').trim();
      if (description) {
        actionItems.push({
          meetingId,
          description,
          assigneeId: null
        });
      }
    }
  }

  return actionItems;
}

// 참석자 추가
function addParticipants(participantsText, meetingId, db) {
  if (!participantsText || participantsText === '미기재') return [];

  const names = participantsText.split(',').map(n => n.trim()).filter(n => n);
  const participantIds = [];

  for (const name of names) {
    let participant = db.prepare('SELECT id FROM participants WHERE name = ?').get(name);
    if (!participant) {
      const result = db.prepare('INSERT INTO participants (name) VALUES (?)').run(name);
      participant = { id: result.lastInsertRowid };
    }

    // meeting_participants에 추가
    db.prepare(`
      INSERT OR IGNORE INTO meeting_participants (meeting_id, participant_id)
      VALUES (?, ?)
    `).run(meetingId, participant.id);

    participantIds.push(participant.id);
  }

  return participantIds;
}

// 메인 마이그레이션 함수
async function migrate() {
  console.log('Starting migration from markdown to SQLite...\n');

  try {
    // 데이터베이스 초기화
    const db = initializeDatabase();

    // meetings 디렉토리 확인
    try {
      await fs.access(MEETINGS_DIR);
    } catch {
      console.log('No meetings directory found. Nothing to migrate.');
      return;
    }

    // archive 디렉토리 생성
    await ensureArchiveDir();

    // 모든 .md 파일 읽기
    const files = await fs.readdir(MEETINGS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      console.log('No markdown files found to migrate.');
      return;
    }

    console.log(`Found ${mdFiles.length} markdown file(s) to migrate.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const filename of mdFiles) {
      try {
        const filepath = path.join(MEETINGS_DIR, filename);
        const content = await fs.readFile(filepath, 'utf8');

        // 메타데이터 추출
        const metadata = extractMetadata(content);
        const sections = parseMarkdownSections(content);

        console.log(`Migrating: ${filename}`);
        console.log(`  Title: ${metadata.title}`);
        console.log(`  Date: ${metadata.date}`);

        // meetings 테이블에 삽입
        const insertMeeting = db.prepare(`
          INSERT INTO meetings (
            title, date, raw_content, summary, overview,
            discussion, decisions, next_steps, markdown_file_path
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insertMeeting.run(
          metadata.title,
          metadata.date,
          content,
          content, // summary는 raw_content와 동일
          sections.overview,
          sections.discussion,
          sections.decisions,
          sections.nextSteps,
          filename
        );

        const meetingId = result.lastInsertRowid;

        // 참석자 추가
        addParticipants(metadata.participants, meetingId, db);

        // 액션 아이템 추출 및 추가
        const actionItems = extractActionItems(sections.actionItems, meetingId, db);
        const insertActionItem = db.prepare(`
          INSERT INTO action_items (meeting_id, description, assignee_id)
          VALUES (?, ?, ?)
        `);

        for (const item of actionItems) {
          insertActionItem.run(item.meetingId, item.description, item.assigneeId);
        }

        console.log(`  Action Items: ${actionItems.length}`);

        // 원본 파일을 archive로 복사
        const archivePath = path.join(ARCHIVE_DIR, filename);
        await fs.copyFile(filepath, archivePath);

        successCount++;
        console.log(`  ✓ Migrated successfully\n`);

      } catch (error) {
        console.error(`  ✗ Error migrating ${filename}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`\nOriginal files backed up to: ${ARCHIVE_DIR}`);

    // 통계 출력
    const stats = {
      meetings: db.prepare('SELECT COUNT(*) as count FROM meetings').get().count,
      participants: db.prepare('SELECT COUNT(*) as count FROM participants').get().count,
      actionItems: db.prepare('SELECT COUNT(*) as count FROM action_items').get().count
    };

    console.log('\n=== Database Statistics ===');
    console.log(`Meetings: ${stats.meetings}`);
    console.log(`Participants: ${stats.participants}`);
    console.log(`Action Items: ${stats.actionItems}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
