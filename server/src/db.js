// Default-import pattern: @prisma/client is CommonJS and its named exports
// aren't statically detectable by the ESM loader on clean installs (Cloud
// Functions), so destructuring works everywhere while named imports break.
import prismaPkg from '@prisma/client';
const { PrismaClient } = prismaPkg;
import config from './config.js';

/**
 * Prisma Client singleton.
 * In development we attach the client to globalThis to survive nodemon's
 * hot-reload without exhausting database connections.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__ergonPrisma ??
  new PrismaClient({
    log: config.env === 'development' ? ['warn', 'error'] : ['error'],
  });

if (config.env === 'development') {
  globalForPrisma.__ergonPrisma = prisma;
}
