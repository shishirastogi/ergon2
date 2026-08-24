import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createApp } from './app.js';

/**
 * Firebase Cloud Functions entrypoint.
 *
 * The SAME Express app that runs locally is exposed as an authenticated-free
 * public HTTPS function; all sensitive values come from Google Secret Manager
 * (set via `npx firebase functions:secrets:set <NAME>`), never from files in
 * the deployment bundle. Firebase Hosting rewrites /api/** to this function,
 * so browser calls stay same-origin and CORS never enters the picture.
 */

const DATABASE_URL = defineSecret('DATABASE_URL');
const JWT_SECRET = defineSecret('JWT_SECRET');
const NEON_AUTH_BASE_URL = defineSecret('NEON_AUTH_BASE_URL');
const NEON_AUTH_ORIGIN = defineSecret('NEON_AUTH_ORIGIN');

export const api = onRequest(
  {
    region: 'us-central1',
    runtime: 'nodejs22',
    memory: '512MiB',
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    invoker: 'public',
    envVariables: {
      NODE_ENV: 'production',
      PORT: '8080',
    },
    secrets: [DATABASE_URL, JWT_SECRET, NEON_AUTH_BASE_URL, NEON_AUTH_ORIGIN],
  },
  (req, res) => {
    // Lazy-create the app on first use so secret values are already injected.
    if (!globalThis.__ergonApp) {
      globalThis.__ergonApp = createApp();
    }
    return globalThis.__ergonApp(req, res);
  }
);
