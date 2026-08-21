import pkg from 'pg';
const { Pool } = pkg;

// Use a fallback for local development if DATABASE_URL is not set, 
// though it will throw an error if no DB is available.
const connectionString = 
  process.env.STORAGE_POSTGRES_URL || 
  process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/postgres';

const pool = new Pool({
  connectionString,
  // Required for Vercel Postgres and most managed DBs (Neon, Supabase, etc.)
  ssl: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? {
    rejectUnauthorized: false
  } : false
});

let initialized = false;

export async function initDb() {
  if (initialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    initialized = true;
  } catch (err) {
    console.error('Failed to initialize database table:', err);
    throw err;
  }
}

export async function findUserByUsername(username) {
  await initDb();
  try {
    const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return res.rows[0]; // undefined if not found
  } catch (err) {
    console.error('Database error in findUserByUsername:', err);
    throw err;
  }
}

export async function createUser(username, hashedPassword) {
  await initDb();
  try {
    const res = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
      [username, hashedPassword]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Database error in createUser:', err);
    throw err;
  }
}
