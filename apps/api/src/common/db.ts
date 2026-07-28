import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { config } from '../config.js';

/** Shared MySQL connection pool. Every query is tenant-scoped by the caller. */
export const pool: Pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: 'Z', // store/read UTC
  decimalNumbers: false, // keep DECIMAL as string to avoid float drift
});

/** Run work inside a transaction; commits on success, rolls back on throw. */
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function ping(): Promise<boolean> {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return Array.isArray(rows) && (rows as Array<{ ok: number }>)[0]?.ok === 1;
}
