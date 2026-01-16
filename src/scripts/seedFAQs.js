/**
 * Seed FAQs for Help & Support
 * Run:
 * node src/scripts/seedFAQs.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('../models/FAQ');

// Hard stop if env is broken
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

const faqs = [
  // Getting Started → general
  {
    question: 'How do I set up my salon?',
    answer:
      'After signing up, you will be guided through a simple setup process where you can add your salon details, services, and staff members. The setup takes less than 5 minutes.',
    category: 'general',
    order: 1,
    tags: ['setup', 'salon', 'onboarding'],
    isActive: true,
  },
  {
    question: 'How do I add services?',
    answer:
      'Go to Settings > Salon Settings > Services. Click on "Add Service" and fill in the service name, duration, and price.',
    category: 'services',
    order: 2,
    tags: ['services', 'pricing'],
    isActive: true,
  },
  {
    question: 'What is the Staff System toggle?',
    answer:
      'The Staff System lets you switch between single-barber and multi-barber modes. Enable it from Settings.',
    category: 'staff',
    order: 3,
    tags: ['staff', 'system'],
    isActive: true,
  },

  // Queue Management → bookings
  {
    question: 'How does the queue system work?',
    answer:
      'Customers join the queue and receive a position. You can manage and start services directly from the Queue screen.',
    category: 'bookings',
    order: 1,
    tags: ['queue', 'bookings'],
    isActive: true,
  },
  {
    question: 'What are walk-in bookings?',
    answer:
      'Walk-in bookings are for customers without prior appointments. They receive a token and join the queue.',
    category: 'bookings',
    order: 2,
    tags: ['walk-in', 'queue'],
    isActive: true,
  },
  {
    question: 'Can I skip customers in the queue?',
    answer:
      'Yes. Skipped customers move to the end of the queue while keeping their booking.',
    category: 'bookings',
    order: 3,
    tags: ['queue', 'skip'],
    isActive: true,
  },

  // Staff Management → staff
  {
    question: 'How do I add staff members?',
    answer:
      'Go to Staff Management > Add Staff and enter their details like name, role, and phone number.',
    category: 'staff',
    order: 1,
    tags: ['staff', 'management'],
    isActive: true,
  },
  {
    question: 'Can I track individual staff performance?',
    answer:
      'Yes. Staff performance reports show completed bookings, revenue, and ratings.',
    category: 'staff',
    order: 2,
    tags: ['staff', 'reports'],
    isActive: true,
  },

  // Reports & Analytics → general
  {
    question: 'What reports are available?',
    answer:
      'You can view daily reports, staff performance reports, and revenue trends.',
    category: 'general',
    order: 1,
    tags: ['reports', 'analytics'],
    isActive: true,
  },

  // Billing & Payments → payments
  {
    question: 'How do I mark a booking as paid?',
    answer:
      'Select the payment method when completing a service. The booking will be marked as paid.',
    category: 'payments',
    order: 1,
    tags: ['payments', 'billing'],
    isActive: true,
  },
  {
    question: 'Can customers pay online?',
    answer:
      'Online payments are coming soon. Currently, cash, card, and UPI payments are supported.',
    category: 'payments',
    order: 2,
    tags: ['payments', 'upi'],
    isActive: true,
  },

  // Notifications → technical
  {
    question: 'Why am I not receiving notifications?',
    answer:
      'Check your phone notification settings and ensure notifications are enabled inside the app.',
    category: 'technical',
    order: 1,
    tags: ['notifications', 'troubleshooting'],
    isActive: true,
  },

  // Account & Security → account
  {
    question: 'How do I delete my account?',
    answer:
      'Go to Settings > Account Settings > Delete Account. This action is permanent.',
    category: 'account',
    order: 1,
    tags: ['account', 'delete'],
    isActive: true,
  },
];


async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await FAQ.deleteMany({});
    console.log('🗑️  Existing FAQs cleared');

    await FAQ.insertMany(faqs);
    console.log(`✅ ${faqs.length} FAQs seeded successfully`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
