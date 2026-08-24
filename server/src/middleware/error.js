import config from '../config.js';
import { HttpError } from '../utils/httpError.js';
import prismaPkg from '@prisma/client';
const { Prisma } = prismaPkg;

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { message: `Route ${req.method} ${req.path} not found`, code: 'ROUTE_NOT_FOUND' },
  });
}

/**
 * Central error middleware — ALWAYS responds in the standard
 * `{ error: { message, code } }` shape and NEVER leaks stack traces or
 * internal details to the client.
 *
 * Logging hygiene: logs only method/path/status/error.message — never request
 * bodies, headers, passwords or tokens (spec §5).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err instanceof HttpError ? err.status : 500;
  let code = err instanceof HttpError ? err.code : 'INTERNAL_ERROR';
  let message = err instanceof HttpError ? err.message : 'Something went wrong on our end';

  // Body-parser and similar middleware attach an accurate 4xx status
  // (e.g. malformed JSON → 400). Honor those; never trust >=500 from libs.
  if (!(err instanceof HttpError) && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    status = err.status;
    code = err.type === 'entity.parse.failed' ? 'INVALID_JSON' : 'BAD_REQUEST';
    message = status === 400 ? 'Request body is not valid JSON or is malformed' : err.message;
  }

  // Map common Prisma errors onto clean API errors instead of leaking internals.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      code = 'DUPLICATE';
      message = 'A record with this value already exists';
    } else if (err.code === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'Resource not found';
    }
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}] ${status}`, err);
  } else if (config.env === 'development') {
    console.warn(`[${req.method} ${req.originalUrl}] ${status} ${code}: ${message}`);
  }

  res.status(status).json({ error: { message, code } });
}
