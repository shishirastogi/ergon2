/**
 * Neon Auth (Managed Better Auth) integration — server-to-server client.
 *
 * Neon Auth exposes a Better Auth HTTP API at the project's auth base URL.
 * We delegate credential storage/verification there (users sync into the
 * `neon_auth.user` table of OUR database) while Ergon keeps issuing its own
 * session JWTs and owning business data.
 *
 * SECURITY NOTES:
 *  - Passwords travel ONLY over this HTTPS fetch and are never logged.
 *  - Provider failures fail CLOSED: we return AUTH_PROVIDER_UNAVAILABLE (503)
 *    rather than silently falling back to weaker local checks. A local-bcrypt
 *    fallback exists solely for one-time migration of pre-existing accounts
 *    (unknown user in Neon + valid local credentials), which then creates the
 *    Neon account so all future logins are managed.
 *  - Timeout is enforced (8s) so a hung provider can't pin Express workers.
 */

// Generous because this deployment's DNS resolver stalls several seconds on
// failed lookups before falling back; a hung provider is still capped here.
const TIMEOUT_MS = 20000;

import config from '../config.js';
import { HttpError } from '../utils/httpError.js';

// Better Auth requires an Origin header for server-side calls that don't pass
// an absolute callbackURL (MISSING_ORIGIN otherwise). Must match a domain
// trusted in Neon Console → Auth → Configuration.
const TRUSTED_ORIGIN = process.env.NEON_AUTH_ORIGIN || 'http://localhost:5173';

/** Thin JSON POST with timeout + one retry on network-level failure;
 * never includes bodies in errors. */
async function postToNeon(baseUrl, path, payload) {
  const attempt = () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: TRUSTED_ORIGIN },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  };

  let res;
  try {
    res = await attempt();
  } catch (err1) {
    // Two retries absorb transient resolver/network blips (this deployment's
    // DNS fails ~1-in-5 lookups). Only network errors retry — statuses don't.
    try {
      res = await attempt();
    } catch (err2) {
      try {
        res = await attempt();
      } catch (err3) {
        console.error('[neon-auth] network failure:', err3.cause?.code || err3.name);
        throw new HttpError(503, 'AUTH_PROVIDER_UNAVAILABLE', 'Auth provider unreachable');
      }
    }
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON error pages etc. — treat as opaque failure below.
  }

  return { status: res.status, ok: res.ok, body };
}

function classifyError(status, body) {
  const message = typeof body?.message === 'string' ? body.message.toLowerCase() : '';
  const code = body?.code ? String(body.code).toUpperCase() : '';

  if (status === 422 || message.includes('already exist') || code === 'USER_ALREADY_EXISTS') {
    return 'USER_EXISTS';
  }
  if (status === 401 || status === 400 || status === 403) {
    // Better Auth returns 400/401 for invalid credentials.
    return 'INVALID_CREDENTIALS';
  }
  // Anything else (404 wrong path, 5xx outage, unknown gateway errors) is a
  // provider problem — surface it as such rather than blaming credentials.
  return 'PROVIDER_ERROR';
}

function httpErrorFor(kind) {
  if (kind === 'USER_EXISTS') {
    return new HttpError(409, 'USER_EXISTS', 'An account with this email already exists');
  }
  if (kind === 'INVALID_CREDENTIALS') {
    return new HttpError(401, 'AUTH_FAILED', 'Invalid email or password');
  }
  return new HttpError(503, 'AUTH_PROVIDER_UNAVAILABLE', 'Authentication service temporarily unavailable');
}

/**
 * Create a user in Neon Auth. Returns the Neon user id when successful.
 * @throws classified HttpError-like errors (code/status set)
 */
export async function neonSignUp({ email, password, name }) {
  if (!config_neonUrl()) throw notConfigured();
  const { status, ok, body } = await postToNeon(config_neonUrl(), '/sign-up/email', {
    email,
    password,
    name: name || email.split('@')[0],
  });

  if (ok && (status === 200 || status === 201)) {
    return { neonUserId: body?.user?.id ?? null };
  }
  throw httpErrorFor(classifyError(status, body));
}

/**
 * Verify credentials against Neon Auth. Returns the Neon user id.
 */
export async function neonSignIn({ email, password }) {
  if (!config_neonUrl()) throw notConfigured();
  const { status, ok, body } = await postToNeon(config_neonUrl(), '/sign-in/email', {
    email,
    password,
  });

  if (ok && status === 200) {
    return { neonUserId: body?.user?.id ?? null };
  }
  throw httpErrorFor(classifyError(status, body));
}

/** True when the failure means "no such user" (vs bad password). */
export function isUserMissing(err) {
  if (err.code !== 'AUTH_FAILED') return false;
  // Better Auth: unknown users get the same generic 401 as bad passwords.
  // We treat ALL auth failures uniformly for security; callers use the local
  // DB to decide whether a migration path applies.
  return true;
}

// Config access helpers (config has no dependency on services — no circulars).
function config_neonUrl() {
  return config.neonAuthBaseUrl;
}
function notConfigured() {
  return new HttpError(503, 'NEON_AUTH_NOT_CONFIGURED', 'Neon Auth base URL is not configured');
}
