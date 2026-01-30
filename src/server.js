require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const connectDatabase = require('./config/database');
const ReminderService = require('./services/reminderService');

// ===== Route Imports (ALL FIRST) =====
const authRoutes = require('./routes/authRoutes');
const salonRoutes = require('./routes/salonRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const salonSetupRoutes = require('./routes/salonSetupRoutes');
const queueRoutes = require('./routes/queueRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const scheduledBookingRoutes = require('./routes/scheduledBookingRoutes');
const staffRoutes = require('./routes/staff');
const reportsRoutes = require('./routes/reports');
const faqRoutes = require('./routes/faqs');
const featureFlagRoutes = require('./routes/featureFlags');
const appInfoRoutes = require('./routes/appInfo');

// Import admin routes
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
// const adminRoutes = require('./routes/adminRoutes');




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
// app.use((req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (authHeader) {
//     const token = authHeader.split(' ')[1];
//     console.log('🔐 JWT RECEIVED:', token);
//   } else {
//     console.log('❌ No Authorization header');
//   }

//   next();
// });

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

// ===== Route Registration =====
app.use('/api/auth', authRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/salon-setup', salonSetupRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/scheduled-bookings', scheduledBookingRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/feature-flags', featureFlagRoutes);
app.use('/api/app-info', appInfoRoutes);

// Register admin routes
// Register admin routes (order matters!)
app.use('/api/admin/auth', adminAuthRoutes); // Auth endpoints
app.use('/api/admin', adminRoutes); // Protected admin endpoints
// app.use('/api/admin', adminRoutes);










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

// // Socket.io connection handling
// io.on('connection', (socket) => {
//   console.log(`🔌 Socket connected: ${socket.id}`);

//   // User joins their own room (for targeted notifications)
//   socket.on('join_user_room', (userId) => {
//     socket.join(`user_${userId}`);
//     console.log(`✅ User ${userId} joined personal room`);
//   });

//   // Join salon room (for queue updates)
//   socket.on('join_salon_room', (salonId) => {
//     socket.join(`salon_${salonId}`);
//     console.log(`✅ Joined salon room: ${salonId}`);
//   });

//   // Leave salon room
//   socket.on('leave_salon_room', (salonId) => {
//     socket.leave(`salon_${salonId}`);
//     console.log(`👋 Left salon room: ${salonId}`);
//   });

//   // Disconnect
//   socket.on('disconnect', () => {
//     console.log(`🔌 Socket disconnected: ${socket.id}`);
//   });
// });

// Export io for use in controllers
global.io = io;

// Socket.io connection handling - UPDATE THIS SECTION
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ✅ AUTHENTICATE SOCKET
  socket.on('authenticate', (data) => {
    if (data && data.userId) {
      socket.userId = data.userId;
      console.log(`🔐 Socket authenticated: ${socket.id} → User: ${data.userId}`);
      socket.emit('authenticated', { success: true });
    } else {
      console.warn(`⚠️ Socket authentication failed: ${socket.id}`);
      socket.emit('authenticated', { success: false, error: 'Invalid user ID' });
    }
  });

  // User joins their own room (for targeted notifications)
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`✅ User ${userId} joined personal room`);
  });

  // ✅ JOIN SALON ROOM WITH INITIAL WAIT TIME
  socket.on('join_salon_room', async (salonId) => {
    socket.join(`salon_${salonId}`);
    console.log(`✅ Socket ${socket.id} joined salon room: ${salonId}`);

    // Send initial personalized wait time
    try {
      const Salon = require('./models/Salon');
      const WaitTimeService = require('./services/waitTimeService');
      
      const salon = await Salon.findById(salonId);
      if (salon) {
        const userId = socket.userId || null;
        const waitTime = await WaitTimeService.calculateWaitTime(salonId, userId, salon);
        
        socket.emit('wait_time_updated', {
          salonId: salonId,
          waitTime: waitTime,
          timestamp: Date.now()
        });
        
        console.log(`   ✅ Sent initial wait time to ${socket.id}: ${waitTime.displayText}`);
      }
    } catch (error) {
      console.error('Error sending initial wait time:', error);
    }
  });

  // Leave salon room
  socket.on('leave_salon_room', (salonId) => {
    socket.leave(`salon_${salonId}`);
    console.log(`👋 Socket ${socket.id} left salon room: ${salonId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers
global.io = io;

// ✅ AUTO-REFRESH WAIT TIMES EVERY 30 SECONDS
setInterval(async () => {
  try {
    const Booking = require('./models/Booking');
    const { emitWaitTimeUpdate } = require('./utils/waitTimeHelpers');
    
    // Get all salons with active queues
    const activeSalons = await Booking.distinct('salonId', {
      status: { $in: ['pending', 'in-progress'] }
    });
    
    if (activeSalons.length > 0) {
      console.log(`⏰ Auto-refresh: Updating ${activeSalons.length} salons with active queues`);
      
      // Broadcast updates for each salon
      for (const salonId of activeSalons) {
        await emitWaitTimeUpdate(salonId);
      }
    }
  } catch (error) {
    console.error('❌ Auto-refresh error:', error);
  }
}, 30000); // 30 seconds


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

