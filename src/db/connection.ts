import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/kenzi_intel',
});

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
}
