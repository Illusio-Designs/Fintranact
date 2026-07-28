/** Typed application errors mapped to HTTP status + stable error codes. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  unauthorized: (msg = 'Authentication required') =>
    new AppError(401, 'unauthorized', msg),
  forbidden: (msg = 'You do not have permission for this action') =>
    new AppError(403, 'forbidden', msg),
  notFound: (msg = 'Not found') => new AppError(404, 'not_found', msg),
  validation: (msg: string, field?: string) =>
    new AppError(422, 'validation_error', msg, field),
  conflict: (msg: string) => new AppError(409, 'conflict', msg),
  internal: (msg = 'Something went wrong') => new AppError(500, 'internal', msg),
};
