import type { SessionContext } from '@fintranact/types';

/** Augment Express Request with the authenticated session + request id. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      session?: SessionContext;
    }
  }
}

export {};
