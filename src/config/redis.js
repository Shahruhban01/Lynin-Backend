// config/redis.js
const { createClient } = require('redis');
const logger = require('../utils/logger');

const client = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    connectTimeout:    5_000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: max reconnect attempts reached');
        return new Error('Redis max retries');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.warn(`Redis: reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
  },
});

client.on('connect',     ()    => logger.info('✅ Redis connected'));
client.on('ready',       ()    => logger.info('✅ Redis ready'));
client.on('error',       (err) => logger.error(`Redis error: ${err.message}`));
client.on('reconnecting', ()   => logger.warn('Redis reconnecting...'));
client.on('end',          ()   => logger.warn('Redis connection closed'));

// Connect immediately — rate limiters depend on this being ready
(async () => {
  try {
    await client.connect();
  } catch (err) {
    logger.error(`Redis initial connection failed: ${err.message}`);
    // Do NOT crash — rate limiter will fallback if store is unavailable
  }
})();

module.exports = client;
