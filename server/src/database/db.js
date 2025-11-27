const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// PostgreSQL 연결 풀 생성
let pool = null;

function createPool() {
  if (pool) {
    return pool;
  }

  // 환경 변수 또는 기본값 사용
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (connectionString) {
    // Render.com 또는 기타 호스팅 서비스의 DATABASE_URL 사용
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
  } else {
    // 로컬 개발 환경
    pool = new Pool({
      user: process.env.POSTGRES_USER || 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      database: process.env.POSTGRES_DB || 'meeting_logger',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
    });
  }

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
}

// 데이터베이스 초기화 (스키마 적용)
async function initializeDatabase() {
  const pool = createPool();

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 스키마 실행
    await pool.query(schema);

    console.log('Database initialized successfully');
    return pool;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// 데이터베이스 연결 가져오기
function getDatabase() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

// 연결 종료
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase,
  createPool
};
