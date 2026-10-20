import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const CORRELATION_HEADER = 'x-correlation-id';
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Incoming correlation IDs are only accepted in a bounded UUID format. */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const supplied = req.headers[CORRELATION_HEADER];
  const id = typeof supplied === 'string' && UUID_SHAPE.test(supplied)
    ? supplied
    : randomUUID();
  res.setHeader(CORRELATION_HEADER, id);
  next();
}
