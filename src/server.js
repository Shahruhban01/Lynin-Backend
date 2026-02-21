require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { Server } = require('socket.io');

const connectDatabase = require('./config/database');
const ReminderService = require('./services/reminderService');
const logger = require('./utils/logger'); // see below

// ── Route Imports ────────────────────────────────────────────────────────────
const authRoutes                = require('./routes/authRoutes');
const salonRoutes               = require('./routes/salonRoutes');
const bookingRoutes             = require('./routes/bookingRoutes');
const reviewRoutes              = require('./routes/reviewRoutes');
const analyticsRoutes           = require('./routes/analyticsRoutes');
const favoriteRoutes            = require('./routes/favoriteRoutes');
const salonSetupRoutes          = require('./routes/salonSetupRoutes');
const queueRoutes               = require('./routes/queueRoutes');
const dashboardRoutes           = require('./routes/dashboardRoutes');
const scheduledBookingRoutes    = require('./routes/scheduledBookingRoutes');
const staffRoutes               = require('./routes/staff');
const reportsRoutes             = require('./routes/reports');
const faqRoutes                 = require('./routes/faqs');
const featureFlagRoutes         = require('./routes/featureFlags');
const appInfoRoutes             = require('./routes/appInfo');
const adminAuthRoutes           = require('./routes/adminAuthRoutes');
const adminRoutes               = require('./routes/adminRoutes');

// ── App & Server Setup ───────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

const isProd = process.env.NODE_ENV === 'production';

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: isProd
      ? (process.env.ALLOWED_ORIGINS || '').split(',')
      : '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout:  60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

// ── Database & Services ──────────────────────────────────────────────────────
connectDatabase();
ReminderService.startScheduler();

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: isProd
    ? (process.env.ALLOWED_ORIGINS || '').split(',')
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
}));

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

// ── General Middleware ───────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan(isProd ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.path === '/api/health',
}));

// Trust proxy (needed behind Nginx / load balancers)
if (isProd) app.set('trust proxy', 1);

// Make io accessible in routes/controllers
app.set('io', io);
global.io = io;

// Request ID for tracing
app.use((req, _res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
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

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success:     true,
    message:     'Lyn-in Backend API is running',
    timestamp:   new Date().toISOString(),
    uptime:      Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used:  `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
    },
  });
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  logger.error(`[${req.id}] ${err.stack || err.message}`);

  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack, requestId: req.id }),
  });
});

// ── Socket.io ────────────────────────────────────────────────────────────────

// Track connected sockets per salon for metrics
const salonSocketCount = new Map();

io.on('connection', (socket) => {
  logger.info(`🔌 Socket connected: ${socket.id}`);

  // Authenticate
  socket.on('authenticate', (data) => {
    if (data?.userId) {
      socket.userId = data.userId;
      logger.info(`🔐 Socket authenticated: ${socket.id} → ${data.userId}`);
      socket.emit('authenticated', { success: true });
    } else {
      logger.warn(`⚠️  Socket auth failed: ${socket.id}`);
      socket.emit('authenticated', { success: false, error: 'Invalid user ID' });
    }
  });

  // User personal room
  socket.on('join_user_room', (userId) => {
    if (!userId) return;
    socket.join(`user_${userId}`);
    logger.info(`✅ User ${userId} joined personal room`);
  });

  // Salon room + initial wait time
  socket.on('join_salon_room', async (salonId) => {
    if (!salonId) return;
    socket.join(`salon_${salonId}`);

    // Track count
    salonSocketCount.set(salonId,
      (salonSocketCount.get(salonId) || 0) + 1);

    logger.info(`✅ Socket ${socket.id} joined salon room: ${salonId}`);

    try {
      const Salon           = require('./models/Salon');
      const WaitTimeService = require('./services/waitTimeService');

      const salon = await Salon.findById(salonId).lean();
      if (salon) {
        const waitTime = await WaitTimeService.calculateWaitTime(
          salonId, socket.userId || null, salon
        );
        socket.emit('wait_time_updated', {
          salonId,
          waitTime,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      logger.error(`Error sending initial wait time to ${socket.id}: ${err.message}`);
    }
  });

  // Leave salon room
  socket.on('leave_salon_room', (salonId) => {
    if (!salonId) return;
    socket.leave(`salon_${salonId}`);

    const count = (salonSocketCount.get(salonId) || 1) - 1;
    if (count <= 0) salonSocketCount.delete(salonId);
    else salonSocketCount.set(salonId, count);

    logger.info(`👋 Socket ${socket.id} left salon room: ${salonId}`);
  });

  socket.on('disconnect', (reason) => {
    logger.info(`🔌 Socket disconnected: ${socket.id} (${reason})`);
  });

  socket.on('error', (err) => {
    logger.error(`Socket error [${socket.id}]: ${err.message}`);
  });
});

// ── Wait-Time Auto-Refresh ───────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = parseInt(process.env.WAIT_TIME_REFRESH_MS || '30000', 10);

const waitTimeRefresher = setInterval(async () => {
  try {
    const Booking              = require('./models/Booking');
    const { emitWaitTimeUpdate } = require('./utils/waitTimeHelpers');

    const activeSalons = await Booking.distinct('salonId', {
      status: { $in: ['pending', 'in-progress'] },
    });

    if (activeSalons.length === 0) return;

    logger.info(`⏰ Auto-refresh: updating ${activeSalons.length} active salon(s)`);

    await Promise.allSettled(
      activeSalons.map((salonId) => emitWaitTimeUpdate(salonId))
    );
  } catch (err) {
    logger.error(`Auto-refresh error: ${err.message}`);
  }
}, REFRESH_INTERVAL_MS);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  const line = '='.repeat(60);
  logger.info(`\n${line}`);
  logger.info('🚀  LYN-IN BACKEND SERVER');
  logger.info(line);
  logger.info(`📍  Local:       http://localhost:${PORT}`);
  logger.info(`📍  Network:     http://${HOST}:${PORT}`);
  logger.info(`📱  Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('🔥  Firebase Admin SDK : ✅');
  logger.info('🔌  Socket.io          : ✅');
  logger.info('💾  MongoDB            : ✅');
  logger.info('⏰  Reminder Service   : ✅');
  logger.info('🛡️   Helmet / Rate Limit : ✅');
  logger.info(`${line}\n`);
});

// ── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.warn(`\n⚠️  ${signal} received — shutting down gracefully...`);

  clearInterval(waitTimeRefresher);

  server.close(async () => {
    logger.info('✅ HTTP server closed');

    // Close Socket.io
    await io.close();
    logger.info('✅ Socket.io closed');

    // Close MongoDB
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    logger.info('✅ MongoDB connection closed');

    process.exit(0);
  });

  // Force kill after 10s if still hanging
  setTimeout(() => {
    logger.error('❌ Force shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  if (isProd) shutdown('unhandledRejection');
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack}`);
  shutdown('uncaughtException');
});
