import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local dev secrets live in dev.env (NOT .env — firebase-tools auto-ingests
// .env files at deploy time, which we never want). On Cloud Functions the
// real values arrive via Secret Manager instead. Loading must NEVER throw at
// import time: the deploy pipeline imports this module WITHOUT secrets just
// to enumerate function definitions.
dotenv.config({ path: path.resolve(__dirname, '../dev.env') });

function resolveDatabaseUrl() {
  let url = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
  if (url) {
    const direct = process.env.DIRECT_URL?.trim() || url;
    return { url, directUrl: direct, source: url.includes('localhost') ? 'local' : 'cloud' };
  }
  url = process.env.DATABASE_URL_LOCAL && process.env.DATABASE_URL_LOCAL.trim();
  if (url) {
    process.env.DATABASE_URL = url;
    process.env.DIRECT_URL = url;
    return { url, directUrl: url, source: 'local' };
  }
  return null; // validated later by assertRuntimeConfig()
}

/** Fail-fast check — call from server startup / app creation, never at import. */
export function assertRuntimeConfig(cfg) {
  if (!cfg.database.url) {
    throw new Error(
      'No database configured. Set DATABASE_URL (Secret Manager on Firebase) or DATABASE_URL_LOCAL/dev.env locally.'
    );
  }
  if (!cfg.jwtSecret || cfg.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters.');
  }
}

let _cfg = null;
function init() {
  if (_cfg) return _cfg;
  const db = resolveDatabaseUrl();
  _cfg = {
    env: process.env.NODE_ENV || 'development',
    port: Number.parseInt(process.env.PORT || '4000', 10),
    database: db ?? { url: null, directUrl: null, source: 'unconfigured' },
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
    bcryptRounds: Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    corsOrigins: (process.env.CORS_ORIGIN || '*')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    googleClientId: (process.env.GOOGLE_CLIENT_ID || '').trim() || null,
    neonAuthBaseUrl: (process.env.NEON_AUTH_BASE_URL || '').trim().replace(/\/+$/, '') || null,
  };

  const isDev = _cfg.env === 'development';
  _cfg.rateLimits = {
    login: {
      windowMs: 15 * 60 * 1000,
      max: Number.parseInt(process.env.RATE_LIMIT_LOGIN || '', 10) || (isDev ? 60 : 10),
    },
    signup: {
      windowMs: 60 * 60 * 1000,
      max: Number.parseInt(process.env.RATE_LIMIT_SIGNUP || '', 10) || (isDev ? 40 : 5),
    },
    google: {
      windowMs: 15 * 60 * 1000,
      max: Number.parseInt(process.env.RATE_LIMIT_GOOGLE || '', 10) || (isDev ? 60 : 15),
    },
    global: {
      windowMs: 60 * 1000,
      max: Number.parseInt(process.env.RATE_LIMIT_GLOBAL || '', 10) || (isDev ? 600 : 240),
    },
  };
  return _cfg;
}

// Lazy proxy: existing `config.x` usage keeps working, values computed on
// first access instead of at module evaluation.
export default new Proxy(
  {},
  {
    get(_t, prop) {
      return init()[prop];
    },
    has(_t, prop) {
      return prop in init();
    },
    ownKeys() {
      return Reflect.ownKeys(init());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const obj = init();
      if (prop in obj) return { configurable: true, enumerable: true, value: obj[prop] };
      return undefined;
    },
  }
);
