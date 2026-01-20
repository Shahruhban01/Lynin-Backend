const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');

// Load .env from root directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const createFirstAdmin = async () => {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('Available env keys:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('❌ Admin user already exists');
      console.log('Existing admin:', existingAdmin.name, existingAdmin.phone);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('🔄 Creating admin user...');

    // Create admin user
    const admin = await User.create({
      phone: '+919999999999', // ⚠️ CHANGE THIS to your admin phone
      name: 'Super Admin',
      email: 'admin@trimzo.com', // ⚠️ CHANGE THIS
      firebaseUid: 'ADMIN_UID_' + Date.now(), // Temporary UID - update with real Firebase UID
      role: 'admin',
      isActive: true,
      setupCompleted: true,
    });

    console.log('✅ Admin user created successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Details:');
    console.log('  ID:', admin._id);
    console.log('  Name:', admin.name);
    console.log('  Phone:', admin.phone);
    console.log('  Email:', admin.email);
    console.log('  Role:', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANT: Update firebaseUid with real Firebase UID');
    console.log('⚠️  Then login via your auth system to get JWT token');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createFirstAdmin();
