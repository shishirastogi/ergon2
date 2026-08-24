/**
 * Google Sign-In (OAuth 2.0 ID token) verification.
 *
 * Flow: the client obtains an ID token via Google Identity Services (web) or
 * Credential Manager/Google Sign-In SDK (Android) and POSTs it to
 * /api/auth/google. We verify it end-to-end before trusting ANY claim:
 *
 *   1. Signature — RS256 against Google's published JWKS (rotating cache,
 *      handled by `jose`'s createRemoteJWKSet with cooldown + refetch).
 *   2. alg pinning — ONLY RS256 accepted (prevents algorithm-confusion).
 *   3. iss — must be https://accounts.google.com or accounts.google.com.
 *   4. aud — must equal OUR OAuth client id (tokens minted for other apps
 *      are rejected even if signed by Google).
 *   5. exp — checked by jwtVerify (30s clock-tolerance for skew).
 *   6. email_verified — MUST be true; unverified emails are never linked to
 *      or used to create Ergon accounts (account-takeover defense).
 *
 * GOOGLE_CLIENT_ID comes from server/.env. If unset, the route answers 503 —
 * the feature fails closed instead of half-working.
 */
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';
import config from '../config.js';
import { HttpError } from '../utils/httpError.js';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS_URL = process.env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs';

// Remote JWKS handle caches keys internally and rotates on unknown `kid`.
const jwks = config.googleClientId
  ? createRemoteJWKSet(new URL(GOOGLE_JWKS_URL), { cooldownDuration: 30_000 })
  : null;

/**
 * @param {string} credential - the Google ID token (compact JWT)
 * @returns {{ sub,email,name,picture }} verified claims we act on
 * @throws Error('GOOGLE_TOKEN_INVALID') / ('EMAIL_NOT_VERIFIED')
 */
export async function verifyGoogleIdToken(credential) {
  if (!config.googleClientId || !jwks) throw googleConfigError();
  if (typeof credential !== 'string' || credential.length < 20) throw invalidToken();

  let payload;
  try {
    ({ payload } = await jwtVerify(credential, jwks, {
      algorithms: ['RS256'],
      issuer: GOOGLE_ISSUERS,
      audience: config.googleClientId,
      clockTolerance: 30,
    }));
  } catch (err) {
    if (
      err instanceof joseErrors.JWTExpired ||
      err instanceof joseErrors.JWTInvalid ||
      err instanceof joseErrors.JWSSignatureVerificationFailed ||
      err instanceof joseErrors.JWTClaimsValidationFailed ||
      err instanceof joseErrors.JWTClaimValidationFailed ||
      err instanceof joseErrors.JWSInvalid ||
      err instanceof joseErrors.JOSEError
    ) {
      throw invalidToken(err.code || err.name);
    }
    // JWKS fetch failure etc. — do not leak internals to clients.
    console.error('[oauth] verification error:', err.name);
    throw invalidToken();
  }

  // email_verified arrives as boolean true from Google; accept only that.
  if (payload.email_verified !== true || typeof payload.email !== 'string') {
    throw new HttpError(401, 'GOOGLE_TOKEN_INVALID', 'Google account email is not verified');
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === 'string' ? payload.name : null,
    picture: typeof payload.picture === 'string' ? payload.picture : null,
  };
}

function invalidToken(detail) {
  if (process.env.NODE_ENV !== 'production' && detail) {
    console.warn(`[oauth] rejected token: ${detail}`); // never log tokens themselves
  }
  return new HttpError(401, 'GOOGLE_TOKEN_INVALID', 'The Google sign-in could not be verified');
}

function googleConfigError() {
  return new HttpError(503, 'OAUTH_NOT_CONFIGURED', 'Google sign-in is not configured on this server');
}
