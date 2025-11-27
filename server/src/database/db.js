const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../../data/database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// 데이터베이스 연결 생성
function createConnection() {
  // data 디렉토리가 없으면 생성
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // WAL 모드 활성화 (성능 향상)
  db.pragma('journal_mode = WAL');

  return db;
}

// 데이터베이스 초기화 (스키마 적용)
function initializeDatabase() {
  const db = createConnection();

  try {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// 싱글톤 인스턴스
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

module.exports = {
  getDatabase,
  initializeDatabase,
  createConnection
};
