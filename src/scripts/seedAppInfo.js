const mongoose = require('mongoose');
const AppInfo = require('../models/AppInfo');
require('dotenv').config();

const appInfoData = {
  appName: 'Lynin',
  appDescription: 'Lynin is a modern salon booking and management platform that connects customers with salons and helps salon owners manage their business efficiently.',
  appLogo: 'https://your-cdn.com/logo.png',
  
  companyName: 'Lynin Technologies',
  yearOfLaunch: 2026,
  websiteUrl: 'https://lynin.in',
  
  privacyPolicyUrl: 'https://lynin.in/privacy-policy',
  termsAndConditionsUrl: 'https://lynin.in/terms',
  refundPolicyUrl: 'https://lynin.in/refund-policy',
  
  supportEmail: 'support@lynin.in',
  supportPhone: '+91-1234567890',
  
  socialMedia: {
    facebook: 'https://facebook.com/lynin',
    instagram: 'https://instagram.com/lynin',
    twitter: 'https://twitter.com/lynin',
    linkedin: 'https://linkedin.com/company/lynin',
    youtube: 'https://youtube.com/@lynin',
  },
  
  openSourceLicenses: [
    {
      name: 'Flutter',
      license: 'BSD-3-Clause',
      url: 'https://github.com/flutter/flutter',
      version: '3.x',
    },
    {
      name: 'Node.js',
      license: 'MIT',
      url: 'https://github.com/nodejs/node',
      version: '20.x',
    },
    {
      name: 'MongoDB',
      license: 'SSPL',
      url: 'https://github.com/mongodb/mongo',
      version: '7.x',
    },
  ],
  
  isActive: true,
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await AppInfo.deleteMany({});
    console.log('🗑️  Cleared existing app info');

    await AppInfo.create(appInfoData);
    console.log('✅ Seeded app info');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
