const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    const sqlPath = path.join(__dirname, '../sql/schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('Database initialized successfully');

    await client.query(` INSERT INTO users (name, email, password, role, role_selected) VALUES ('Test User', 'test@test.com', '$2a$10$testhashedpassword', 'buyer', true) ON CONFLICT (email) DO NOTHING`);
    console.log('Test user created');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

initDatabase();