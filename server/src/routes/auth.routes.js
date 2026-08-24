import { Router } from 'express';
import { signup, login, googleAuth, guestLogin } from '../services/authService.js';
import config from '../config.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { rateLimit } from '../utils/rateLimit.js';

const router = Router();

/**
 * Brute-force protection: per-IP windows on every auth endpoint.
 * Strict in production; relaxed in development (single shared IP).
 */
const loginLimiter = rateLimit({ ...config.rateLimits.login, name: 'login' });
const signupLimiter = rateLimit({ ...config.rateLimits.signup, name: 'signup' });
const googleLimiter = rateLimit({ ...config.rateLimits.google, name: 'google' });

function noStore(req, res, next) {
  // Credentials/tokens must never be cached by browsers or proxies.
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/**
 * POST /api/auth/signup
 * Body:    { email (required), password (required, ≥8 chars), name?, studioName? }
 * Success: 201 { data: { token, user } }
 * NOTE: password never appears in logs — bodies are not logged anywhere.
 */
router.post(
  '/signup',
  signupLimiter,
  noStore,
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await signup(req.body ?? {}) });
  })
);

/**
 * POST /api/auth/login
 * Body:    { email, password }
 * Success: 200 { data: { token, user } }
 * Errors:  401 (identical message for unknown email and wrong password),
 *          429 when rate-limited
 */
router.post(
  '/login',
  loginLimiter,
  noStore,
  asyncHandler(async (req, res) => {
    res.json({ data: await login(req.body ?? {}) });
  })
);

/**
 * POST /api/auth/google
 * Body:    { credential } — a Google ID token obtained client-side via
 *          Google Identity Services (web) or Google Sign-In SDK (Android).
 * Success: 200 { data: { token, user } } — token is OUR app JWT; the Google
 *          token is verified (RS256 signature via Google JWKS, issuer,
 *          audience == GOOGLE_CLIENT_ID, expiry, email_verified) and then discarded.
 * Errors:  401 GOOGLE_TOKEN_INVALID · 503 OAUTH_NOT_CONFIGURED (no client id set)
 *
 * Accounts are linked by VERIFIED email only. New accounts get an unusable
 * random password so they can never be accessed via password login.
 */
router.post(
  '/google',
  googleLimiter,
  noStore,
  asyncHandler(async (req, res) => {
    res.json({ data: await googleAuth(req.body ?? {}) });
  })
);

/**
 * POST /api/auth/guest — one-click demo session (the "(guest mode)" button).
 * Issues a real JWT for the pre-seeded showcase account with dummy data.
 * No credentials by design; rate-limited like the other auth routes.
 */
router.post(
  '/guest',
  googleLimiter,
  noStore,
  asyncHandler(async (req, res) => {
    res.json({ data: await guestLogin() });
  })
);

export default router;
