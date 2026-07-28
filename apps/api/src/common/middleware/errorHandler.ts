import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiResponse } from '@fintranact/types';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';

/** Central error middleware — maps errors to the standard API envelope. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const body: ApiResponse<null> = {
      data: null,
      errors: err.issues.map((i) => ({
        code: 'validation_error',
        message: i.message,
        field: i.path.join('.'),
      })),
    };
    res.status(422).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ApiResponse<null> = {
      data: null,
      errors: [{ code: err.code, message: err.message, ...(err.field ? { field: err.field } : {}) }],
    };
    res.status(err.status).json(body);
    return;
  }

  logger.error({ err, requestId: req.requestId }, 'Unhandled error');
  const body: ApiResponse<null> = {
    data: null,
    errors: [{ code: 'internal', message: 'Something went wrong' }],
  };
  res.status(500).json(body);
}
