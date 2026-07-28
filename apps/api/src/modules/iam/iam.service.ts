import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { AuthTokens, SessionContext } from '@fintranact/types';
import type { LoginInput } from '@fintranact/validation';
import { config } from '../../config.js';
import { Errors } from '../../common/errors.js';
import { audit } from '../../common/audit.js';
import {
  findPermissionsForRoles,
  findUserByEmail,
  findUserScopes,
} from './iam.repo.js';

export interface LoginResult extends AuthTokens {
  session: SessionContext;
}

/**
 * Authenticate a user and mint an access token scoped to their first company.
 * (Company/branch switching + refresh-token rotation land in Phase 1.)
 */
export async function login(
  input: LoginInput,
  meta: { ip?: string; userAgent?: string; requestId?: string },
): Promise<LoginResult> {
  const user = await findUserByEmail(input.email);
  if (!user || user.status !== 'active') {
    throw Errors.unauthorized('Invalid credentials');
  }
  const valid = await argon2.verify(user.password_hash, input.password).catch(() => false);
  if (!valid) throw Errors.unauthorized('Invalid credentials');

  const scopes = await findUserScopes(user.id);
  if (scopes.length === 0) {
    throw Errors.forbidden('No company access assigned');
  }
  const primary = scopes[0]!;
  const roleKeys = scopes
    .filter((s) => s.company_id === primary.company_id)
    .map((s) => s.role_key);
  const permissions = await findPermissionsForRoles(primary.company_id, roleKeys);

  const session: SessionContext = {
    userId: user.id,
    companyId: primary.company_id,
    branchId: primary.branch_id,
    roles: roleKeys,
    permissions,
  };

  const accessToken = jwt.sign(session, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  await audit(
    {
      companyId: primary.company_id,
      branchId: primary.branch_id,
      actorUserId: user.id,
      action: 'auth.login',
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    },
  ).catch(() => undefined);

  return { accessToken, expiresIn: config.jwt.expiresIn, session };
}
