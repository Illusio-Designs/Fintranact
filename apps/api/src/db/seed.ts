/**
 * Seed a first admin user for RAVI Metal Treatment (dev/demo only).
 * Password comes from SEED_ADMIN_PASSWORD or defaults to "ChangeMe!123".
 * Usage: pnpm --filter @fintranact/api exec tsx src/db/seed.ts
 */
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { pool } from '../common/db.js';
import { logger } from '../common/logger.js';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const ADMIN_ROLE_ID = 'a0000000-0000-0000-0000-000000000001';
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@raviMetal.com';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Ravi@1234';

async function run(): Promise<void> {
  const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [EMAIL]);
  let userId = (existing as Array<{ id: string }>)[0]?.id;

  if (userId) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    logger.info(`Updated admin password for ${EMAIL}`);
  } else {
    userId = randomUUID();
    await pool.query(
      'INSERT INTO users (id, email, name, password_hash, status) VALUES (?, ?, ?, ?, \'active\')',
      [userId, EMAIL, 'RAVI Admin', hash],
    );
    logger.info(`Created admin user ${EMAIL}`);
  }

  await pool.query(
    `INSERT IGNORE INTO user_company_roles (user_id, company_id, branch_id, role_id)
     VALUES (?, ?, NULL, ?)`,
    [userId, COMPANY_ID, ADMIN_ROLE_ID],
  );

  logger.info(`Seed complete. Login: ${EMAIL} / ${PASSWORD}`);
  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
