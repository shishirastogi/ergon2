import { createApp } from './app.js';
import config from './config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Ergon API listening on http://localhost:${config.port}`);
  console.log(`Database source: ${config.database.source} (${config.env})`);
});

// Graceful shutdown — close HTTP first, then let Prisma release connections.
async function shutdown(signal) {
  console.log(`${signal} received — shutting down`);
  server.close(async () => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
