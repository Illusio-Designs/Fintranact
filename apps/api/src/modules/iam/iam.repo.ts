import type { RowDataPacket } from 'mysql2';
import { pool } from '../../common/db.js';

export interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  status: 'active' | 'suspended';
  mfa_enabled: number;
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT * FROM users WHERE email = :email LIMIT 1',
    { email },
  );
  return rows[0];
}

export interface ScopeRow extends RowDataPacket {
  company_id: string;
  branch_id: string | null;
  role_key: string;
}

/** Roles a user holds, with company/branch scope. */
export async function findUserScopes(userId: string): Promise<ScopeRow[]> {
  const [rows] = await pool.query<ScopeRow[]>(
    `SELECT ucr.company_id, ucr.branch_id, r.\`key\` AS role_key
       FROM user_company_roles ucr
       JOIN roles r ON r.id = ucr.role_id
      WHERE ucr.user_id = :userId`,
    { userId },
  );
  return rows;
}

/** All permissions granted to a set of role keys within a company. */
export async function findPermissionsForRoles(
  companyId: string,
  roleKeys: string[],
): Promise<string[]> {
  if (roleKeys.length === 0) return [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT p.\`key\` AS perm
       FROM roles r
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE r.company_id = :companyId AND r.\`key\` IN (:roleKeys)`,
    { companyId, roleKeys },
  );
  return rows.map((r) => r.perm as string);
}
