import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './common/logger.js';
import { runMigrations } from './db/migrate.js';
import { runSeed } from './db/seed.js';

const app = createApp();

/** On boot, bring the schema up to date and seed the admin (both versioned/idempotent). */
async function bootstrap(): Promise<void> {
  if (process.env.AUTO_MIGRATE !== 'false') {
    try {
      await runMigrations();
      await runSeed();
    } catch (err) {
      logger.error({ err }, 'Startup migrate/seed failed');
      if (config.env === 'production') throw err; // fail fast in prod
    }
  }
}

const serverRef: { server?: import('node:http').Server } = {};
bootstrap().finally(() => {
  serverRef.server = app.listen(config.port, () => {
    logger.info(`Fintranact API listening on :${config.port} (${config.env})`);
  });
});

function shutdown(signal: string): void {
  logger.info(`${signal} received — shutting down`);
  if (serverRef.server) serverRef.server.close(() => process.exit(0));
  else process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
