import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { prisma } from '../db.js';
import { badRequest, conflict, unauthorized } from '../utils/httpError.js';
import { email as normalizeEmail, requireString } from '../utils/validate.js';
import { serializeUser } from '../serializers/index.js';
import { verifyGoogleIdToken } from './oauthService.js';
import { neonSignUp, neonSignIn } from './neonAuthService.js';

/**
 * Single-tenant MVP auth: any user may sign up (first user becomes the studio
 * owner in practice), but ALL business data is scoped per-user via userId
 * foreign keys, so multi-user support later needs no schema rewrite.
 *
 * Credential storage modes:
 *  - NEON_AUTH_BASE_URL set → Neon Auth (Managed Better Auth) owns passwords;
 *    local `password` column holds an unusable random hash. Users sync into
 *    the neon_auth.user table of our database (source of truth for identity).
 *  - unset → local bcrypt (legacy/dev mode).
 *
 * Existing local accounts migrate transparently: first login after enabling
 * Neon Auth verifies locally, then creates the managed account with that same
 * password so every subsequent login is Neon-managed.
 */

// bcrypt hash of an unguessable random value — used as the comparison target
// when the account doesn't exist so login timing is identical whether or not
// an email is registered (anti user-enumeration). Generated at boot because
// bcrypt.compare requires a structurally valid hash.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), config.bcryptRounds);

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: 'ergon-api',
    audience: 'ergon-app',
  });
}

/** Local row for a Neon-managed account — password is never stored in clear. */
async function unusablePassword() {
  return bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.bcryptRounds);
}

export async function signup({ email, password, name, studioName }) {
  const normalizedEmail = normalizeEmail(email);
  if (typeof password !== 'string' || password.length < 8) {
    throw badRequest("'password' must be at least 8 characters");
  }
  requireString(password, 'password', { min: 8, max: 128 });
  const displayName = name ? name.trim().slice(0, 120) : null;

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw conflict('An account with this email already exists');

  if (config.neonAuthBaseUrl) {
    // Delegate credential creation; throws classified errors on failure.
    await neonSignUp({ email: normalizedEmail, password, name: displayName });
  }
  const passwordHash = config.neonAuthBaseUrl
    ? await unusablePassword()
    : await bcrypt.hash(password, config.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: passwordHash,
      name: displayName,
      studioName: studioName ? String(studioName).trim().slice(0, 120) : null,
    },
  });

  return { token: signToken(user), user: serializeUser(user) };
}

export async function login({ email, password }) {
  if (!email || !password) throw badRequest('Email and password are required');
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // ── Neon-managed mode ──────────────────────────────────────────────────────
  if (config.neonAuthBaseUrl) {
    try {
      await neonSignIn({ email: normalizedEmail, password });
    } catch (err) {
      // One-time migration: pre-existing LOCAL account that has never been in
      // Neon. Verify against the old local hash; on success register the same
      // credentials with Neon Auth so future logins are fully managed.
      if (
        err.code === 'AUTH_FAILED' &&
        user &&
        (await verifyLocalHash(user.password, password))
      ) {
        try {
          await neonSignUp({ email: normalizedEmail, password, name: user.name });
        } catch (signupErr) {
          if (signupErr.code !== 'USER_EXISTS') throw signupErr;
        }
        return issueFor(user); // migrated
      }
      throw err; // AUTH_FAILED / PROVIDER_UNAVAILABLE — no weaker fallback
    }

    // Credentials are valid at Neon. Local row is auto-provisioned if missing.
    let account = user;
    if (!account) {
      account = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: null,
          password: await unusablePassword(),
        },
      });
    }
    return issueFor(account);
  }

  // ── Legacy local mode ──────────────────────────────────────────────────────
  // Always run a bcrypt comparison — even for unknown emails — so response
  // timing does not reveal whether an account exists (user enumeration).
  let ok;
  try {
    ok = await bcrypt.compare(String(password), user?.password || DUMMY_HASH);
  } catch {
    ok = false; // malformed stored hash can never authenticate
  }

  if (!user || !ok) throw unauthorized('Invalid email or password');
  return issueFor(user);
}

async function verifyLocalHash(hash, password) {
  try {
    return await bcrypt.compare(String(password), hash);
  } catch {
    return false;
  }
}

function issueFor(user) {
  return { token: signToken(user), user: serializeUser(user) };
}

/**
 * Guest/demo access: issues a real session for the shared SHOWCASE account
 * (`alex@ergonstudio.design`), which is pre-seeded with dummy clients,
 * projects, quotes and invoices so visitors can explore every feature.
 *
 * INTENTIONAL OPEN DOOR — this endpoint takes no credentials by design.
 * The account is a demo identity; do NOT attach real business data to it.
 * Rate-limited at the route level like all auth endpoints.
 */
const GUEST_EMAIL = 'alex@ergonstudio.design';

export async function guestLogin() {
  let user = await prisma.user.findUnique({ where: { email: GUEST_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: GUEST_EMAIL,
        name: 'Alex Rivera',
        studioName: 'Ergon Design Studio',
        password: await unusablePassword(),
      },
    });
  }
  return issueFor(user);
}

/**
 * Google Sign-In: verify the client-supplied Google ID token, then link or
 * create the Ergon account behind it.
 *
 * Linking policy — SAFE because oauthService rejects tokens whose email is
 * not verified by Google:
 *   - existing local account with same email → signed into (linked implicitly)
 *   - no account → created with an unusable random password (Google-only)
 *
 * The issued token is OUR app JWT (never passthrough of Google's).
 */
export async function googleAuth({ credential }) {
  if (!credential) throw badRequest("Google 'credential' (ID token) is required");
  if (typeof credential !== 'string' || credential.split('.').length !== 3) {
    throw unauthorized('Invalid or expired session');
  }

  let claims;
  try {
    claims = await verifyGoogleIdToken(credential); // signature+iss+aud+exp+email_verified
  } catch (err) {
    if (err.status === 503) throw err; // not configured → keep 503 + code
    // Map every verification failure onto one generic auth error.
    throw unauthorized('Google sign-in could not be verified');
  }

  const user = await prisma.user.upsert({
    where: { email: claims.email },
    update: {}, // never clobber local profile data on repeat logins
    create: {
      email: claims.email,
      name: claims.name?.slice(0, 120) ?? null,
      password: await unusablePassword(),
    },
  });

  return { token: signToken(user), user: serializeUser(user) };
}
