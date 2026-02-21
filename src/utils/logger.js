// utils/logger.js
const { createLogger, format, transports } = require('winston');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: isProd ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    isProd
      ? format.json()
      : format.combine(
          format.colorize(),
          format.printf(({ timestamp, level, message }) =>
            `${timestamp} [${level}]: ${message}`
          )
        )
  ),
  transports: [
    new transports.Console(),
    ...(isProd
      ? [
          new transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 5,
            tailable: true,
          }),
          new transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 20 * 1024 * 1024,
            maxFiles: 10,
            tailable: true,
          }),
        ]
      : []),
  ],
});

// Convenience alias
logger.http = (msg) => logger.info(msg);

module.exports = logger;
