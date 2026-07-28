/**
 * Minimal forward-only migration runner. Applies every .sql file in
 * db/migrations in filename order that hasn't been recorded yet.
 * Usage: pnpm --filter @fintranact/api migrate
 *
 * Uses a dedicated connection with multipleStatements enabled (the app pool
 * deliberately keeps that OFF to reduce SQL-injection surface).
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config } from '../config.js';
import { logger } from '../common/logger.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');

/** Apply any pending .sql migrations (forward-only, versioned via schema_migrations). */
export async function runMigrations(): Promise<void> {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });

  await conn.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name VARCHAR(255) PRIMARY KEY,
       applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  const [doneRows] = await conn.query('SELECT name FROM schema_migrations');
  const done = new Set((doneRows as Array<{ name: string }>).map((r) => r.name));
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    logger.info(`Applying migration ${file}`);
    try {
      await conn.beginTransaction();
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      logger.error({ err }, `Migration ${file} failed`);
      await conn.end();
      throw err;
    }
  }

  logger.info('Migrations up to date');
  await conn.end();
}

// CLI entry: `pnpm migrate`
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(() => process.exit(1));
}
