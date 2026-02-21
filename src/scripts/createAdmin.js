const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
const logger = require('../utils/logger');

// Load .env from root directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const createFirstAdmin = async () => {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      logger.error('❌ MONGODB_URI not found in environment variables');
      logger.info('Available env keys:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      process.exit(1);
    }

    logger.info('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      logger.info('❌ Admin user already exists');
      logger.info('Existing admin:', existingAdmin.name, existingAdmin.phone);
      await mongoose.disconnect();
      process.exit(0);
    }

    logger.info('🔄 Creating admin user...');

    // Create admin user
    const admin = await User.create({
      phone: '+919999999999', // ⚠️ CHANGE THIS to your admin phone
      name: 'Super Admin',
      email: 'admin@lynin.in', // ADMIN EMAIL - UPDATE AS NEEDED
      firebaseUid: 'ADMIN_UID_' + Date.now(), // Temporary UID - update with real Firebase UID
      role: 'admin',
      isActive: true,
      setupCompleted: true,
    });

    logger.info('✅ Admin user created successfully');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Admin Details:');
    logger.info('  ID:', admin._id);
    logger.info('  Name:', admin.name);
    logger.info('  Phone:', admin.phone);
    logger.info('  Email:', admin.email);
    logger.info('  Role:', admin.role);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('⚠️  IMPORTANT: Update firebaseUid with real Firebase UID');
    logger.info('⚠️  Then login via your auth system to get JWT token');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error creating admin:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createFirstAdmin();
