const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const { scheduleDailyRewards } = require('./jobs/dailyRewards.job');
const logger = require('./utils/logger');

async function start() {
  await connectDB();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port} [${config.env}]`);
    logger.info(`API base path: ${config.apiBasePath}`);
    logger.info(`Swagger docs:  http://localhost:${config.port}/api-docs`);
  });

  scheduleDailyRewards();

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', err);
  process.exit(1);
});

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
