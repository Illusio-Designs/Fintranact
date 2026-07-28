import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse } from '@fintranact/types';

/** Wrap an async route handler so thrown errors reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/** Send the standard API envelope (see PRD §10.1). */
export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>): void {
  const body: ApiResponse<T> = { data, ...(meta ? { meta } : {}) };
  res.json(body);
}
