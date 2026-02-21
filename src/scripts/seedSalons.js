require('dotenv').config();
const mongoose = require('mongoose');
const Salon = require('../models/Salon');
const User = require('../models/User');
const logger = require('../utils/logger');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('✅ MongoDB Connected');
};

const sampleSalons = [
  {
    name: 'Elite Hair Studio',
    description: 'Premium hair styling and grooming services for men and women',
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716], // Bangalore coordinates [lng, lat]
      address: 'MG Road, Near Trinity Metro Station',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
    },
    phone: '+919876543210',
    email: 'contact@elitehair.com',
    hours: {
      monday: { open: '09:00', close: '20:00', closed: false },
      tuesday: { open: '09:00', close: '20:00', closed: false },
      wednesday: { open: '09:00', close: '20:00', closed: false },
      thursday: { open: '09:00', close: '20:00', closed: false },
      friday: { open: '09:00', close: '20:00', closed: false },
      saturday: { open: '10:00', close: '21:00', closed: false },
      sunday: { open: '10:00', close: '18:00', closed: false },
    },
    services: [
      { name: 'Haircut', price: 300, duration: 30, description: 'Classic haircut' },
      { name: 'Beard Trim', price: 150, duration: 15, description: 'Professional beard styling' },
      { name: 'Hair Color', price: 1500, duration: 90, description: 'Full hair coloring' },
      { name: 'Facial', price: 500, duration: 45, description: 'Deep cleansing facial' },
    ],
    images: [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70',
      'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8',
    ],
    averageRating: 4.5,
    totalReviews: 120,
    avgServiceTime: 35,
  },
  {
    name: 'Quick Trim Barbers',
    description: 'Fast and affordable haircuts for everyone',
    location: {
      type: 'Point',
      coordinates: [77.6101, 12.9342],
      address: 'Indiranagar, 100 Feet Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
    },
    phone: '+919876543211',
    email: 'info@quicktrim.com',
    hours: {
      monday: { open: '08:00', close: '21:00', closed: false },
      tuesday: { open: '08:00', close: '21:00', closed: false },
      wednesday: { open: '08:00', close: '21:00', closed: false },
      thursday: { open: '08:00', close: '21:00', closed: false },
      friday: { open: '08:00', close: '21:00', closed: false },
      saturday: { open: '08:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '20:00', closed: false },
    },
    services: [
      { name: 'Basic Haircut', price: 150, duration: 20, description: 'Quick haircut' },
      { name: 'Shave', price: 100, duration: 15, description: 'Clean shave' },
      { name: 'Hair Wash', price: 80, duration: 10, description: 'Shampoo and wash' },
    ],
    images: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1',
    ],
    averageRating: 4.0,
    totalReviews: 85,
    avgServiceTime: 20,
  },
  {
    name: 'Luxury Spa & Salon',
    description: 'Premium spa and salon services with luxury treatments',
    location: {
      type: 'Point',
      coordinates: [77.6412, 12.9698],
      address: 'Koramangala, 5th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560095',
    },
    phone: '+919876543212',
    email: 'hello@luxuryspa.com',
    hours: {
      monday: { open: '10:00', close: '20:00', closed: false },
      tuesday: { open: '10:00', close: '20:00', closed: false },
      wednesday: { open: '10:00', close: '20:00', closed: false },
      thursday: { open: '10:00', close: '20:00', closed: false },
      friday: { open: '10:00', close: '20:00', closed: false },
      saturday: { open: '10:00', close: '21:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true },
    },
    services: [
      { name: 'Premium Haircut', price: 500, duration: 45, description: 'Luxury haircut experience' },
      { name: 'Spa Treatment', price: 2000, duration: 120, description: 'Full body spa' },
      { name: 'Manicure & Pedicure', price: 800, duration: 60, description: 'Hand and foot care' },
      { name: 'Hair Spa', price: 1200, duration: 90, description: 'Deep conditioning treatment' },
    ],
    images: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e',
    ],
    averageRating: 4.8,
    totalReviews: 200,
    avgServiceTime: 60,
  },
  {
    name: 'Style & Shine',
    description: 'Modern unisex salon with trendy styles',
    location: {
      type: 'Point',
      coordinates: [77.5833, 12.9633],
      address: 'Jayanagar 4th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560041',
    },
    phone: '+919876543213',
    email: 'contact@styleshine.com',
    hours: {
      monday: { open: '09:30', close: '20:30', closed: false },
      tuesday: { open: '09:30', close: '20:30', closed: false },
      wednesday: { open: '09:30', close: '20:30', closed: false },
      thursday: { open: '09:30', close: '20:30', closed: false },
      friday: { open: '09:30', close: '20:30', closed: false },
      saturday: { open: '09:00', close: '21:00', closed: false },
      sunday: { open: '10:00', close: '19:00', closed: false },
    },
    services: [
      { name: 'Stylish Haircut', price: 350, duration: 40, description: 'Trendy hairstyles' },
      { name: 'Beard Styling', price: 200, duration: 25, description: 'Modern beard designs' },
      { name: 'Hair Straightening', price: 2500, duration: 150, description: 'Permanent straightening' },
      { name: 'Highlights', price: 1800, duration: 120, description: 'Hair highlights' },
    ],
    images: [
      'https://images.unsplash.com/photo-1562322140-8baeececf3df',
    ],
    averageRating: 4.3,
    totalReviews: 95,
    avgServiceTime: 40,
  },
  {
    name: 'Gentlemen\'s Club',
    description: 'Exclusive grooming lounge for men',
    location: {
      type: 'Point',
      coordinates: [77.6249, 12.9352],
      address: 'HSR Layout, Sector 1',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560102',
    },
    phone: '+919876543214',
    email: 'info@gentlemensclub.com',
    hours: {
      monday: { open: '10:00', close: '21:00', closed: false },
      tuesday: { open: '10:00', close: '21:00', closed: false },
      wednesday: { open: '10:00', close: '21:00', closed: false },
      thursday: { open: '10:00', close: '21:00', closed: false },
      friday: { open: '10:00', close: '22:00', closed: false },
      saturday: { open: '10:00', close: '22:00', closed: false },
      sunday: { open: '11:00', close: '20:00', closed: false },
    },
    services: [
      { name: 'Executive Haircut', price: 400, duration: 35, description: 'Premium men\'s haircut' },
      { name: 'Royal Shave', price: 250, duration: 30, description: 'Hot towel shave' },
      { name: 'Head Massage', price: 300, duration: 20, description: 'Relaxing head massage' },
      { name: 'Grooming Package', price: 800, duration: 75, description: 'Complete grooming' },
    ],
    images: [
      'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38',
    ],
    averageRating: 4.6,
    totalReviews: 150,
    avgServiceTime: 35,
  },
];

const seedSalons = async () => {
  try {
    await connectDB();

    // Get first user as owner (or create dummy owner)
    let owner = await User.findOne();
    
    if (!owner) {
      logger.info('⚠️  No users found. Creating dummy owner...');
      owner = await User.create({
        phone: '+919999999999',
        name: 'Salon Owner',
        firebaseUid: 'dummy-owner-uid',
        email: 'owner@lynin.com',
      });
    }

    // Delete existing salons
    await Salon.deleteMany({});
    logger.info('🗑️  Existing salons deleted');

    // Add ownerId to each salon
    const salonsWithOwner = sampleSalons.map((salon) => ({
      ...salon,
      ownerId: owner._id,
    }));

    // Insert salons
    const createdSalons = await Salon.insertMany(salonsWithOwner);
    logger.info(`✅ ${createdSalons.length} salons created successfully!`);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedSalons();
