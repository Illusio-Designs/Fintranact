import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { SessionContext } from '@fintranact/types';
import { config } from '../../config.js';
import { Errors } from '../errors.js';

/**
 * Verify the bearer access token and populate req.session.
 * Multi-tenant context (company/branch) comes from the token; the X-Company-Id /
 * X-Branch-Id headers are validated against the user's granted scope (Phase 1).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(Errors.unauthorized());
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as SessionContext & {
      iat: number;
      exp: number;
    };
    req.session = {
      userId: payload.userId,
      companyId: payload.companyId,
      branchId: payload.branchId ?? null,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
    next();
  } catch {
    next(Errors.unauthorized('Invalid or expired token'));
  }
}
