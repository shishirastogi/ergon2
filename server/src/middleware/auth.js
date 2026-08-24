import jwt from 'jsonwebtoken';
import config from '../config.js';
import { prisma } from '../db.js';
import { unauthorized } from '../utils/httpError.js';

/**
 * Verifies the `Authorization: Bearer <token>` header, resolves the User from
 * the token subject, and attaches `req.user = { id, email }`.
 *
 * Fails CLOSED: missing/garbage/unknown-user tokens all get 401 — never
 * an open pass-through. Used by every router except /api/auth and /api/health.
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, {
        issuer: 'ergon-api',
        audience: 'ergon-app',
      });
    } catch (err) {
      // Token expired / signature invalid / malformed → same 401 shape for all,
      // so we never leak *why* a token was rejected.
      throw unauthorized('Invalid or expired session');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!user) throw unauthorized();

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
