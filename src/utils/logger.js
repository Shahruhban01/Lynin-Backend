// utils/logger.js
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

const isProd   = process.env.NODE_ENV === 'production';
const LOG_DIR  = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (isProd && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Sanitize sensitive fields from logged objects
const sanitize = format((info) => {
  const body = info.body || info.message;
  if (typeof body === 'object' && body !== null) {
    const clone = { ...body };
    for (const key of ['password', 'token', 'idToken', 'firebaseToken', 'otp', 'secret']) {
      if (clone[key]) clone[key] = '[REDACTED]';
    }
    info.message = clone;
  }
  return info;
});

const devFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) =>
    `${timestamp} ${level}: ${typeof message === 'object' ? JSON.stringify(message) : message}`
  )
);

const prodFormat = format.combine(
  sanitize(),
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd ? prodFormat : devFormat,

  transports: [
    new transports.Console({
      // In production, only warn+ to console (stdout captured by PM2/CloudWatch)
      level: isProd ? 'warn' : 'debug',
    }),
    ...(isProd
      ? [
          new transports.File({
            filename:  path.join(LOG_DIR, 'error.log'),
            level:     'error',
            maxsize:   10 * 1024 * 1024, // 10MB
            maxFiles:  7,
            tailable:  true,
            format:    format.combine(format.timestamp(), format.json()),
          }),
          new transports.File({
            filename:  path.join(LOG_DIR, 'combined.log'),
            maxsize:   20 * 1024 * 1024, // 20MB
            maxFiles:  14,
            tailable:  true,
          }),
        ]
      : []),
  ],

  // Prevents Winston from crashing on its own errors
  exitOnError: false,
});

// Alias for Morgan's stream
logger.http = (msg) => logger.info(msg);

module.exports = logger;
