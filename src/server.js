require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDatabase = require('./config/database');
const ReminderService = require('./services/reminderService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB
connectDatabase();

// Start reminder scheduler
ReminderService.startScheduler();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.path.includes('/auth/verify-token')) {
      console.log('🔍 Auth Request:', {
        method: req.method,
        hasToken: !!req.body.idToken || !!req.body.firebaseToken,
        hasPhone: !!req.body.phone,
      });
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.path.includes('/bookings')) {
      console.log('🔍 Booking Request:', {
        method: req.method,
        path: req.path,
      });
    }
    next();
  });
}

// Make io accessible in routes
app.set('io', io);

// Add this line with other route imports
// const dashboardRoutes = require('./routes/dashboard');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/salons', require('./routes/salonRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/favorites', require('./routes/favoriteRoutes'));
app.use('/api/dashboard', require('./routes/dashboard'));
// app.use('/api/dashboard', dashboardRoutes);


// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Trimzo Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins their own room (for targeted notifications)
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`✅ User ${userId} joined personal room`);
  });

  // Join salon room (for queue updates)
  socket.on('join_salon_room', (salonId) => {
    socket.join(`salon_${salonId}`);
    console.log(`✅ Joined salon room: ${salonId}`);
  });

  // Leave salon room
  socket.on('leave_salon_room', (salonId) => {
    socket.leave(`salon_${salonId}`);
    console.log(`👋 Left salon room: ${salonId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers
global.io = io;

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 TRIMZO BACKEND SERVER`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Server running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://100.112.160.11:${PORT}`);
  console.log(`\n📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Firebase Admin SDK: ✅ Initialized`);
  console.log(`🔌 Socket.io: ✅ Enabled`);
  console.log(`💾 MongoDB: ✅ Connected`);
  console.log(`⏰ Reminder Service: ✅ Running (checks every 5 mins)`);
  console.log(`🎁 Loyalty Points: ✅ Active (1pt per ₹10)`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Ready to accept requests from Flutter apps\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
