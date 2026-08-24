import express from 'express';
import cors from 'cors';
import config, { assertRuntimeConfig } from './config.js';
import authRoutes from './routes/auth.routes.js';
import clientRoutes from './routes/clients.routes.js';
import projectRoutes from './routes/projects.routes.js';
import quoteRoutes from './routes/quotes.routes.js';
import invoiceRoutes from './routes/invoices.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import studioRoutes from './routes/studios.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { rateLimit } from './utils/rateLimit.js';

/**
 * Baseline API hardening (helmet-equivalent subset for a JSON+PDF API).
 * CORS is handled separately by the cors() middleware below.
 */
function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Meaningful only over TLS in production; harmless in local dev.
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
}

export function createApp() {
  // Fail fast on missing runtime config (secrets) — at app creation, never
  // at module import, so deploy-time code analysis stays side-effect free.
  assertRuntimeConfig(config);

  const app = express();

  // Behind no reverse proxy today; enable trust proxy for correct client IPs
  // when deployed (Render/Fly/nginx). `1` trusts exactly one hop.
  app.set('trust proxy', 1);

  // Disable x-powered-by fingerprinting.
  app.disable('x-powered-by');

  const origins = config.corsOrigins;
  app.use(
    cors({
      origin: origins.includes('*') ? true : origins,
      credentials: false, // bearer-token auth; no cookies needed
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  );

  app.use(securityHeaders);

  // Coarse global throttle per IP: generous for real use, hostile to scripts.
  const globalLimiter = rateLimit({ ...config.rateLimits.global, name: 'global' });
  app.use('/api', globalLimiter);

  // JSON body parsing â€” reject oversized payloads early.
  app.use(express.json({ limit: '256kb' }));

  // Lightweight request logging WITHOUT bodies/tokens (spec Â§5).
  if (config.env !== 'test') {
    app.use((req, _res, next) => {
      if (!req.path.startsWith('/api')) return next();
      console.log(`${req.method} ${req.originalUrl}`);
      next();
    });
  }

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok', env: config.env } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/quotes', quoteRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/studios', studioRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
