import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './common/logger.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`Fintranact API listening on :${config.port} (${config.env})`);
});

function shutdown(signal: string): void {
  logger.info(`${signal} received — shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
