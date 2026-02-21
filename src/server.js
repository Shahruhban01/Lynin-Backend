require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const compression = require('compression');
const morgan     = require('morgan');
const mongoose   = require('mongoose');
const { Server } = require('socket.io');
const { isValidObjectId } = require('mongoose');

const connectDatabase    = require('./config/database');
const ReminderService    = require('./services/reminderService');
const logger             = require('./utils/logger');
const redis              = require('./config/redis');   // ← new file, see below

// ── Models & Services (top-level — never inside handlers) ────────────────────
const Salon            = require('./models/Salon');
const Booking          = require('./models/Booking');
const WaitTimeService  = require('./services/waitTimeService');
const { emitWaitTimeUpdate } = require('./utils/waitTimeHelpers');

// ── Route Imports ─────────────────────────────────────────────────────────────
const authRoutes             = require('./routes/authRoutes');
const salonRoutes            = require('./routes/salonRoutes');
const bookingRoutes          = require('./routes/bookingRoutes');
const reviewRoutes           = require('./routes/reviewRoutes');
const analyticsRoutes        = require('./routes/analyticsRoutes');
const favoriteRoutes         = require('./routes/favoriteRoutes');
const salonSetupRoutes       = require('./routes/salonSetupRoutes');
const queueRoutes            = require('./routes/queueRoutes');
const dashboardRoutes        = require('./routes/dashboardRoutes');
const scheduledBookingRoutes = require('./routes/scheduledBookingRoutes');
const staffRoutes            = require('./routes/staff');
const reportsRoutes          = require('./routes/reports');
const faqRoutes              = require('./routes/faqs');
const featureFlagRoutes      = require('./routes/featureFlags');
const appInfoRoutes          = require('./routes/appInfo');
const adminAuthRoutes        = require('./routes/adminAuthRoutes');
const adminRoutes            = require('./routes/adminRoutes');

// ─────────────────────────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = isProd
  ? (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim())
  : '*';

// ── App & Server ──────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── HTTP Timeout Hardening ────────────────────────────────────────────────────
// Must be set before any request is served
server.headersTimeout  = 15_000;   // Abort if client doesn't finish headers in 15s (Slowloris defence)
server.requestTimeout  = 30_000;   // Abort if full request body not received in 30s
server.keepAliveTimeout = 65_000;  // > Nginx keepalive_timeout (60s) to prevent 502s
server.timeout          = 120_000; // Hard socket idle timeout

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
  pingTimeout:  60_000,
  pingInterval: 25_000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e5, // 100KB max socket message — prevents memory bombs
  connectTimeout: 10_000,
});

// ── Socket.io JWT Middleware (handshake-level auth) ──────────────────────────
// Rejects unauthenticated connections BEFORE they're established.
// Client must pass: io(URL, { auth: { token: '<firebase_id_token>' } })
const admin = require('./config/firebase'); // your firebase-admin instance

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('AUTH_REQUIRED'));

    const decoded     = await admin.auth().verifyIdToken(token);
    socket.userId     = decoded.uid;
    socket.userRole   = decoded.role   ?? 'customer';
    socket.userSalon  = decoded.salonId ?? null;
    next();
  } catch (err) {
    logger.warn(`Socket auth rejected [${socket.handshake.address}]: ${err.message}`);
    next(new Error('AUTH_INVALID'));
  }
});

// ── Database & Services ───────────────────────────────────────────────────────
connectDatabase();
ReminderService.startScheduler();

// ── Connection Tracking (for graceful shutdown) ───────────────────────────────
const connections   = new Map(); // socket → { idle: boolean }
let   isShuttingDown = false;

server.on('connection', (socket) => {
  connections.set(socket, { idle: true });
  socket.on('close', () => connections.delete(socket));
});

// ── Request ID Middleware ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-Id', req.id);

  // Mark connection as active, destroy after response if shutting down
  if (connections.has(req.socket)) connections.get(req.socket).idle = false;
  res.on('finish', () => {
    const entry = connections.get(req.socket);
    if (entry) {
      entry.idle = true;
      if (isShuttingDown) req.socket.destroy();
    }
  });
  next();
});

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: isProd ? undefined : false, // Enable CSP in prod only
}));

app.use(cors({
  origin:         ALLOWED_ORIGINS,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  credentials:    true,
}));

// Trust proxy — required for correct IP behind Nginx
app.set('trust proxy', 1);

// ── Rate Limiters ─────────────────────────────────────────────────────────────
// node-redis v4: sendCommand takes an array, not spread args
const makeRedisStore = (prefix) => new RedisStore({
  sendCommand: async (...args) => redis.sendCommand(args),
  prefix,
});

const clientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;

const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    clientIp,
  store:           makeRedisStore('rl:global:'),
  message:         { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    clientIp,
  store:           makeRedisStore('rl:auth:'),
  message:         { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);


// ── General Middleware ────────────────────────────────────────────────────────
app.use(compression({
  // Never compress SSE / streaming responses
  filter: (req, res) => {
    if (req.headers.accept === 'text/event-stream') return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses > 1KB
}));

// Tight body limits per route type — not a blanket 10MB
app.use('/api/auth',   express.json({ limit: '50kb' }));
app.use('/api/admin',  express.json({ limit: '1mb' }));
app.use(express.json({ limit: '500kb' }));             // Default for everything else
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// HTTP request logging (skip health checks to reduce noise)
app.use(morgan(isProd ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip:   (req) => req.path === '/api/health',
}));

// Make io accessible in route controllers
app.set('io', io);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',               authLimiter, authRoutes);
app.use('/api/salons',             salonRoutes);
app.use('/api/bookings',           bookingRoutes);
app.use('/api/reviews',            reviewRoutes);
app.use('/api/analytics',          analyticsRoutes);
app.use('/api/favorites',          favoriteRoutes);
app.use('/api/salon-setup',        salonSetupRoutes);
app.use('/api/queue',              queueRoutes);
app.use('/api/dashboard',          dashboardRoutes);
app.use('/api/scheduled-bookings', scheduledBookingRoutes);
app.use('/api/staff',              staffRoutes);
app.use('/api/reports',            reportsRoutes);
app.use('/api/faqs',               faqRoutes);
app.use('/api/feature-flags',      featureFlagRoutes);
app.use('/api/app-info',           appInfoRoutes);
app.use('/api/admin/auth',         authLimiter, adminAuthRoutes);
app.use('/api/admin',              adminRoutes);

// ── Health Check (load-balancer aware) ───────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  const dbOk    = dbState === 1;

  // Check Redis
  let redisOk = false;
  try {
    await redis.ping();
    redisOk = true;
  } catch { /* silent */ }

  const healthy = dbOk && redisOk;

  res.status(healthy ? 200 : 503).json({
    success:   healthy,
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk    ? 'connected'    : 'disconnected',
      redis:    redisOk ? 'connected'    : 'disconnected',
    },
    memory: {
      used:  `${Math.round(process.memoryUsage().heapUsed  / 1024 / 1024)} MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
    },
    ...(isProd ? {} : { environment: process.env.NODE_ENV }),
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  logger.error(`[${req.id}] ${status} — ${err.stack || err.message}`);

  res.status(status).json({
    success:   false,
    message:   status === 500 ? 'Internal server error' : err.message,
    requestId: req.id,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

// ── Socket.io Event Handlers ──────────────────────────────────────────────────
const salonSocketCount = new Map();

io.on('connection', (socket) => {
  logger.info(`🔌 Socket connected: ${socket.id} | user: ${socket.userId}`);

  // ── join_user_room ──────────────────────────────────────────────────────
  socket.on('join_user_room', (userId) => {
    // Prevent joining another user's room
    if (!userId || userId !== socket.userId) {
      return socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot join another user room' });
    }
    socket.join(`user_${userId}`);
    logger.debug(`User ${userId} joined personal room`);
  });

  // ── join_salon_room ─────────────────────────────────────────────────────
  socket.on('join_salon_room', async (salonId) => {
    if (!salonId || !isValidObjectId(salonId)) {
      return socket.emit('error', { code: 'INVALID_SALON_ID' });
    }

    socket.join(`salon_${salonId}`);
    salonSocketCount.set(salonId, (salonSocketCount.get(salonId) || 0) + 1);

    logger.debug(`Socket ${socket.id} joined salon room: ${salonId}`);

    try {
      const salon = await Salon.findById(salonId).lean();
      if (salon) {
        const waitTime = await WaitTimeService.calculateWaitTime(
          salonId, socket.userId, salon
        );
        socket.emit('wait_time_updated', { salonId, waitTime, timestamp: Date.now() });
      }
    } catch (err) {
      logger.error(`Initial wait time error [${socket.id}]: ${err.message}`);
    }
  });

  // ── leave_salon_room ────────────────────────────────────────────────────
  socket.on('leave_salon_room', (salonId) => {
    if (!salonId || !isValidObjectId(salonId)) return;
    socket.leave(`salon_${salonId}`);

    const count = (salonSocketCount.get(salonId) || 1) - 1;
    count <= 0
      ? salonSocketCount.delete(salonId)
      : salonSocketCount.set(salonId, count);

    logger.debug(`Socket ${socket.id} left salon room: ${salonId}`);
  });

  socket.on('disconnect', (reason) => {
    logger.info(`🔌 Disconnected: ${socket.id} | user: ${socket.userId} | reason: ${reason}`);
  });

  socket.on('error', (err) => {
    logger.error(`Socket error [${socket.id}]: ${err.message}`);
  });
});

// ── Wait-Time Auto-Refresh ────────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = parseInt(process.env.WAIT_TIME_REFRESH_MS || '30000', 10);
let isRefreshing = false;

const waitTimeRefresher = setInterval(async () => {
  if (isRefreshing) return; // Skip if previous run is still running
  isRefreshing = true;
  try {
    const activeSalons = await Booking.distinct('salonId', {
      status: { $in: ['pending', 'in-progress'] },
    });
    if (activeSalons.length === 0) return;

    logger.debug(`⏰ Auto-refresh: ${activeSalons.length} active salon(s)`);
    await Promise.allSettled(activeSalons.map(emitWaitTimeUpdate));
  } catch (err) {
    logger.error(`Auto-refresh error: ${err.message}`);
  } finally {
    isRefreshing = false;
  }
}, REFRESH_INTERVAL_MS);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  const line = '─'.repeat(55);
  logger.info(line);
  logger.info('🚀  LYN-IN BACKEND — ONLINE');
  logger.info(line);
  logger.info(`   Local   → http://localhost:${PORT}`);
  logger.info(`   Network → http://${HOST}:${PORT}`);
  logger.info(`   Env     → ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   Redis   → ${process.env.REDIS_URL ? 'configured' : 'localhost fallback'}`);
  logger.info(line);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  if (isShuttingDown) return; // Prevent double-invocation
  isShuttingDown = true;
  logger.warn(`⚠️  ${signal} — graceful shutdown initiated`);

  // 1. Stop accepting new connections
  clearInterval(waitTimeRefresher);

  // 2. Destroy all IDLE keep-alive connections immediately
  //    Active connections will be destroyed after their response finishes (see request ID middleware)
  for (const [sock, { idle }] of connections) {
    if (idle) sock.destroy();
  }

  // 3. Stop accepting new HTTP requests
  server.close(async () => {
    logger.info('✅ HTTP server closed');
    try {
      // 4. Close Socket.io (stops new WS upgrades)
      await new Promise((resolve) => io.close(resolve));
      logger.info('✅ Socket.io closed');

      // 5. Close MongoDB
      await mongoose.connection.close(false); // false = don't force
      logger.info('✅ MongoDB closed');

      // 6. Close Redis
      await redis.quit();
      logger.info('✅ Redis closed');

      process.exit(0);
    } catch (err) {
      logger.error(`Shutdown cleanup error: ${err.message}`);
      process.exit(1);
    }
  });

  // Force-kill safety net — increase to 15s for real traffic drain
  setTimeout(() => {
    logger.error('❌ Force shutdown after timeout');
    process.exit(1);
  }, 15_000).unref(); // .unref() — doesn't prevent earlier exit
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled Rejection — log and continue (do NOT shutdown) ─────────────────
// Shutting down on every unhandled rejection is too aggressive for production.
// Use it only to log and alert; let PM2 restart if needed.
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} | reason: ${reason}`);
  // Alert your monitoring service here (e.g. Sentry)
});

// ── Uncaught Exception — process is in undefined state, exit immediately ──────
process.on('uncaughtException', (err) => {
  // Synchronous log only — do NOT run async cleanup from here
  logger.error(`UNCAUGHT EXCEPTION — immediate exit: ${err.stack}`);
  process.exit(1); // PM2 / systemd will restart the process
});
