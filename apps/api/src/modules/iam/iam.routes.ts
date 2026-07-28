import { Router } from 'express';
import { loginSchema } from '@fintranact/validation';
import { asyncHandler, ok } from '../../common/http.js';
import { requireAuth } from '../../common/middleware/auth.js';
import * as iam from './iam.service.js';

export const iamRouter: Router = Router();

/** POST /api/v1/auth/login */
iamRouter.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await iam.login(input, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });
    ok(res, {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      session: result.session,
    });
  }),
);

/** GET /api/v1/auth/me — current session (requires bearer token). */
iamRouter.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, req.session);
  }),
);
