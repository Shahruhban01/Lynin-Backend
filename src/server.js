require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDatabase = require('./config/database');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path.includes('/auth/verify-token')) {
    console.log('🔍 Request to verify-token:');
    console.log('   Method:', req.method);
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));
    console.log('   Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use((req, res, next) => {
  if (req.path.includes('/bookings')) {
    console.log('🔍 Booking request:');
    console.log('   Method:', req.method);
    console.log('   Path:', req.path);
    console.log('   Full URL:', req.originalUrl);
  }
  next();
});

// Make io accessible in routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/salons', require('./routes/salonRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Trimzo Backend API is running',
    timestamp: new Date().toISOString(),
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
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // User joins their own room (for targeted notifications)
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`✅ User ${userId} joined their room`);
  });

  // Join salon room (for queue updates)
  socket.on('join_salon_room', (salonId) => {
    socket.join(`salon_${salonId}`);
    console.log(`✅ User joined salon room: ${salonId}`);
  });

  // Leave salon room
  socket.on('leave_salon_room', (salonId) => {
    socket.leave(`salon_${salonId}`);
    console.log(`👋 User left salon room: ${salonId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers
global.io = io;

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Server running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://100.112.160.11:${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔥 Firebase Admin SDK initialized`);
  console.log(`🔌 Socket.io enabled`);
  console.log(`\n✅ Ready to accept requests from Flutter app\n`);
});
