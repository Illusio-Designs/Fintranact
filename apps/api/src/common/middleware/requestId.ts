import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Attach a correlation id to every request/response for tracing + audit. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
