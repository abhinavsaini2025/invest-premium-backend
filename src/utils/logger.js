// Minimal leveled logger. Swap for pino/winston later without touching call sites.
const level = process.env.LOG_LEVEL || 'info';

const levels = { error: 0, warn: 1, info: 2, debug: 3 };

function log(lvl, ...args) {
  if (levels[lvl] <= levels[level]) {
    // eslint-disable-next-line no-console
    console[lvl === 'debug' ? 'log' : lvl](`[${new Date().toISOString()}] [${lvl.toUpperCase()}]`, ...args);
  }
}

module.exports = {
  error: (...a) => log('error', ...a),
  warn: (...a) => log('warn', ...a),
  info: (...a) => log('info', ...a),
  debug: (...a) => log('debug', ...a),
};
