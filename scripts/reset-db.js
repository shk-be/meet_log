const { Pool } = require('pg');

const DATABASE_URL = process.argv[2];

if (!DATABASE_URL) {
  console.error('Usage: node reset-db.js <DATABASE_URL>');
  process.exit(1);
}

async function resetDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');

    // Drop all tables
    console.log('Dropping schema...');
    await pool.query('DROP SCHEMA public CASCADE');

    console.log('Creating schema...');
    await pool.query('CREATE SCHEMA public');

    console.log('✓ Database reset successfully!');
    console.log('Run the server to create tables from schema.sql');

  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
