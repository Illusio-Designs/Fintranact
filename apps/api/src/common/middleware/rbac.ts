import type { NextFunction, Request, Response } from 'express';
import type { Permission } from '@fintranact/types';
import { Errors } from '../errors.js';

/**
 * Guard a route with a required permission. Enforcement is server-side on every
 * request (never trust the client) — see PRD §7.2. `admin` is a superuser wildcard.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const session = req.session;
    if (!session) return next(Errors.unauthorized());
    const allowed =
      session.roles.includes('admin') ||
      session.permissions.includes('*') ||
      session.permissions.includes(permission);
    if (!allowed) {
      return next(Errors.forbidden(`Missing permission: ${permission}`));
    }
    next();
  };
}
