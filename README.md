# 📱 **LYNIN - Smart Salon Booking Platform**



> **Real-time salon booking and queue management system with live wait times, staff management, and multi-platform support.**

***

## 📑 **Table of Contents**

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Installation & Setup](#installation--setup)
8. [Configuration](#configuration)
9. [Running the Application](#running-the-application)
10. [Database Schema](#database-schema)
11. [API Endpoints](#api-endpoints)
12. [Real-Time Events](#real-time-events)
13. [Authentication Flow](#authentication-flow)
14. [Core Business Logic](#core-business-logic)
15. [Testing](#testing)
16. [Deployment](#deployment)
17. [Environment Variables](#environment-variables)
18. [Troubleshooting](#troubleshooting)
19. [Performance Optimization](#performance-optimization)
20. [Contributing](#contributing)
21. [Changelog](#changelog)
22. [License](#license)

***

## 🎯 **Overview**

**Lynin** is a comprehensive salon booking and management platform that revolutionizes how customers discover salons and how salon owners manage their businesses. The platform features real-time queue management, personalized wait time calculations, staff management, and a dual booking system (immediate + scheduled).

### **What Problem Does Lynin Solve?**

- **For Customers:** Eliminates waiting uncertainty with real-time queue visibility and accurate wait time estimates
- **For Salon Owners:** Streamlines operations with digital queue management, staff tracking, and analytics
- **For Admins:** Provides platform oversight with audit logs, user management, and analytics

### **Platform Components**

```
┌─────────────────────────────────────────────────────────┐
│                    LYNIN ECOSYSTEM                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📱 Customer Mobile App (Flutter)                       │
│     - Browse salons                                      │
│     - Join queue / Schedule booking                      │
│     - Track wait time in real-time                       │
│     - Rate & review                                      │
│                                                          │
│  💼 Salon Owner/Staff Mobile App (Flutter)              │
│     - Manage queue                                       │
│     - Add walk-ins                                       │
│     - Start/complete services                            │
│     - View dashboard & analytics                         │
│                                                          │
│  🖥️ Admin Web Dashboard (React.js)                      │
│     - Platform statistics                                │
│     - User/salon management                              │
│     - Verify salons                                      │
│     - Audit logs                                         │
│                                                          │
│  ⚙️ Backend API (Node.js + Express) ← THIS REPO        │
│     - RESTful API                                        │
│     - Real-time Socket.IO                                │
│     - Push notifications                                 │
│     - Business logic                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

***

## ✨ **Key Features**

### **🎫 Queue Management**
- **Real-time queue tracking** with live position updates
- **Personalized wait times** (different for each user based on their position)
- **Walk-in token system** (4-digit tokens for anonymous customers)
- **Skip & restore** functionality for queue management
- **Priority queue** with daily limits (senior citizens, medical urgency, children)

### **📅 Dual Booking System**
- **Immediate booking** - Join queue instantly
- **Scheduled booking** - Book appointment for future date/time
- **Available slot finder** - 30-minute time slots
- **Arrival tracking** - Mark scheduled customers as arrived

### **👥 Staff Management**
- **Multi-staff support** with roles (barber, stylist, manager, receptionist)
- **Staff assignment** to bookings
- **Performance tracking** (revenue, bookings, ratings)
- **Commission calculation** (percentage or fixed per service)
- **Working hours configuration** per staff member

### **📍 Geospatial Discovery**
- **Location-based search** with MongoDB 2dsphere indexes
- **Find nearby salons** within radius (5km default, max 50km)
- **City-based filtering**
- **Real-time availability** status

### **🔔 Push Notifications (FCM)**
- New booking alerts (to salon owner)
- Queue position updates (to customer)
- "Almost your turn" notifications
- Service started/completed alerts
- Salon closure notifications
- Priority service alerts

### **🌐 Real-Time Updates (Socket.IO)**
- Live queue updates
- Personalized wait time broadcasts
- Service status changes
- Customer arrival notifications
- Queue reordering events

### **⭐ Reviews & Ratings**
- 5-star rating system
- Text reviews
- Salon average rating calculation
- Staff rating tracking
- Review history

### **💰 Payment & Loyalty**
- Multi-payment method support (cash, card, UPI, wallet)
- **Auto-payment marking** on service completion
- **Loyalty points** - 1 point per ₹10 spent
- Payment tracking & history

### **🛡️ Admin Panel**
- Platform-wide statistics
- User management (soft delete, restore)
- Salon verification & management
- Audit logging (all admin actions tracked)
- FAQ management
- Feature flags (live chat toggle)
- App info management (privacy policy, social links)

### **🚀 Salon Setup Wizard**
- **4-step onboarding** for new salon owners:
  1. Profile (name, location, images)
  2. Operating hours
  3. Services (categorized: Hair, Beard, Body, Add-on)
  4. Capacity (barber count)
- Progress tracking
- Validation at each step

### **📊 Analytics & Reports**
- Daily summary reports
- Staff performance comparison
- Revenue reports (daily/weekly/monthly)
- Peak hours analysis
- No-show rate tracking
- Wait time accuracy metrics

***

## 🏗️ **System Architecture**

### **High-Level Architecture**

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
├──────────────────────────────────────────────────────────────────┤
│  Flutter Apps (iOS/Android)  │  React Web Dashboard (Admin)      │
│  - Customer App               │  - Admin Panel                    │
│  - Salon Owner/Staff App      │  - Analytics Dashboard            │
└────────────────┬──────────────┴────────────────┬─────────────────┘
                 │                                 │
                 │ HTTPS/WSS                       │ HTTPS/WSS
                 ▼                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY LAYER                            │
├────────────────────────────────────────────────────────────────────┤
│  Express.js Server (Node.js)                                        │
│  ├─ RESTful API Endpoints                                          │
│  ├─ Socket.IO Server (Real-time)                                   │
│  ├─ JWT Middleware (Authentication)                                │
│  └─ Role-based Access Control (Authorization)                      │
└────────────────┬───────────────────────────────────────────────────┘
                 │
                 ├──────────────┬──────────────┬──────────────┐
                 ▼              ▼              ▼              ▼
┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐  ┌──────────┐
│ BUSINESS LOGIC   │  │ EXTERNAL SERVICES│  │  DATABASE   │  │  CACHE   │
├──────────────────┤  ├──────────────────┤  ├─────────────┤  ├──────────┤
│ - Queue Manager  │  │ Firebase Admin   │  │  MongoDB    │  │ In-Memory│
│ - Wait Time Calc │  │ ├─ Auth (Phone) │  │  (Primary)  │  │ (Node.js)│
│ - Notification   │  │ ├─ FCM (Push)   │  │             │  │          │
│ - Reminder       │  │ └─ Storage      │  │ Collections:│  │ For:     │
│ - Analytics      │  │                  │  │ - users     │  │ - FAQs   │
│ - Staff Mgmt     │  │                  │  │ - salons    │  │ - Flags  │
│ - Booking Mgmt   │  │                  │  │ - bookings  │  │ - AppInfo│
│ - Review System  │  │                  │  │ - staff     │  │          │
└──────────────────┘  └──────────────────┘  └─────────────┘  └──────────┘
```

### **Data Flow - Customer Books Salon**

```
┌──────────┐
│ Customer │ Opens app, authenticates with phone OTP
└────┬─────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│ 1. Authentication                                         │
│    POST /api/auth/verify-token                           │
│    { firebaseToken, phone }                              │
│    ↓                                                     │
│    Backend verifies with Firebase                        │
│    Creates/updates user in MongoDB                       │
│    Returns JWT token                                     │
└────┬─────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Discovery                                             │
│    GET /api/salons/nearby?lat=19.0760&lng=72.8777       │
│    Authorization: Bearer <JWT>                           │
│    ↓                                                     │
│    MongoDB 2dsphere query finds salons within radius     │
│    For each salon:                                       │
│      - Calculate personalized wait time (if user=null)  │
│      - Check if salon open/closed                        │
│      - Check queue status                                │
│    Returns list with wait times                          │
└────┬─────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Real-time Monitoring                                  │
│    socket.emit('join_salon', { salonId })                │
│    ↓                                                     │
│    Client joins Socket.IO room: salon_<salonId>          │
│    Receives live updates:                                │
│      - wait_time_updated (personalized)                  │
│      - queue_updated                                     │
└────┬─────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Booking                                               │
│    POST /api/bookings/join-queue                         │
│    { salonId, services, paymentMethod }                  │
│    ↓                                                     │
│    Validations:                                          │
│      ✓ Salon is open                                    │
│      ✓ User not already in queue                        │
│      ✓ Services exist                                   │
│    Creates booking:                                      │
│      - Calculate queue position (last + 1)              │
│      - Calculate estimated start time                    │
│      - Set status: pending                               │
│    Side effects:                                         │
│      ✓ Send FCM to owner: "New booking"                 │
│      ✓ Send FCM to customer: "You're #4"                │
│      ✓ Emit socket: queue_updated                        │
│      ✓ Broadcast personalized wait times                 │
└────┬─────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│ 5. Queue Monitoring                                      │
│    As salon processes queue:                             │
│    ↓                                                     │
│    Position 3 completed → socket: wait_time_updated      │
│      Customer sees: "Your turn in ~30 min"               │
│    Position 2 completed → socket: wait_time_updated      │
│      Customer sees: "Your turn in ~15 min"               │
│    Position 1 → FCM: "Almost Your Turn!"                 │
└────┬─────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│ 6. Service                                               │
│    Owner: POST /api/queue/:salonId/start/:bookingId      │
│    ↓                                                     │
│    Status: pending → in-progress                         │
│    FCM to customer: "Service Started"                    │
│    Socket: service_started                               │
│    ↓                                                     │
│    Owner: POST /api/queue/:salonId/complete/:bookingId   │
│    ↓                                                     │
│    Status: in-progress → completed                       │
│    Auto-mark payment as paid                             │
│    Award loyalty points (1 per ₹10)                      │
│    FCM to customer: "Service Complete! Rate us"          │
│    Socket: service_completed                             │
│    Reorder queue, update wait times                      │
└────┬─────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│ 7. Review                                                │
│    POST /api/reviews/booking/:bookingId                  │
│    { rating: 5, review: "Great service!" }               │
│    ↓                                                     │
│    Save review to booking                                │
│    Update salon.averageRating                            │
│    Update staff rating (if assigned)                     │
└──────────────────────────────────────────────────────────┘
```

***

## 🛠️ **Technology Stack**

### **Backend Runtime**
- **Node.js** 18.x - JavaScript runtime
- **Express.js** 4.x - Web framework
- **Socket.IO** 4.x - Real-time bidirectional communication

### **Database**
- **MongoDB** 6.x - NoSQL database
- **Mongoose** - ODM (Object Data Modeling)
- **MongoDB Atlas** - Cloud database (production)

### **Authentication & Authorization**
- **Firebase Admin SDK** - Phone authentication & FCM
- **JWT (jsonwebtoken)** - Stateless authentication tokens

### **Real-Time & Notifications**
- **Socket.IO** - WebSocket connections for live updates
- **Firebase Cloud Messaging (FCM)** - Push notifications

### **Security**
- **bcryptjs** - Password hashing (if needed)
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - API rate limiting (recommended)

### **Utilities**
- **dotenv** - Environment variable management
- **moment** / **date-fns** - Date/time manipulation
- **validator** - Input validation

### **Development Tools**
- **nodemon** - Auto-restart on file changes
- **morgan** - HTTP request logger
- **eslint** - Code linting
- **prettier** - Code formatting

***

## 📂 **Project Structure**

```
lynin-backend/
│
├── config/                      # Configuration files
│   ├── database.js             # MongoDB connection setup
│   └── firebase.js             # Firebase Admin SDK initialization
│
├── controllers/                 # Request handlers (business logic)
│   ├── authController.js       # User authentication (login, profile)
│   ├── adminAuthController.js  # Admin authentication
│   ├── adminController.js      # Admin operations (users, salons, audit)
│   ├── salonController.js      # Salon CRUD, discovery, settings
│   ├── bookingController.js    # Booking lifecycle
│   ├── queueController.js      # Queue management (start, complete, skip)
│   ├── scheduledBookingController.js  # Scheduled bookings
│   ├── staffController.js      # Staff CRUD, performance
│   ├── salonSetupController.js # Onboarding wizard (4 steps)
│   ├── dashboardController.js  # Dashboard statistics
│   ├── reviewController.js     # Reviews & ratings
│   ├── favoriteController.js   # Favorites/wishlist
│   ├── analyticsController.js  # Analytics queries
│   ├── reportsController.js    # Advanced reports
│   ├── faqController.js        # FAQ management
│   ├── featureFlagController.js # Feature toggles
│   └── appInfoController.js    # App metadata
│
├── middleware/                  # Express middleware
│   ├── auth.js                 # JWT verification, role checks
│   └── errorHandler.js         # Global error handler (if exists)
│
├── models/                      # Mongoose schemas
│   ├── User.js                 # User model (customer/owner/staff/admin)
│   ├── Salon.js                # Salon model with geospatial index
│   ├── Booking.js              # Booking/Queue model
│   ├── Staff.js                # Staff member model
│   ├── AdminAuditLog.js        # Admin action logs
│   ├── PriorityLog.js          # Priority queue logs
│   ├── FAQ.js                  # Help center FAQs
│   ├── FeatureFlag.js          # Live chat toggle
│   └── AppInfo.js              # App info (privacy policy, etc.)
│
├── routes/                      # API route definitions
│   ├── authRoutes.js           # /api/auth/*
│   ├── adminAuthRoutes.js      # /api/admin/auth/*
│   ├── adminRoutes.js          # /api/admin/*
│   ├── salonRoutes.js          # /api/salons/*
│   ├── bookingRoutes.js        # /api/bookings/*
│   ├── queueRoutes.js          # /api/queue/*
│   ├── scheduledBookingRoutes.js  # /api/scheduled-bookings/*
│   ├── staff.js                # /api/staff/*
│   ├── salonSetupRoutes.js     # /api/salon-setup/*
│   ├── dashboardRoutes.js      # /api/dashboard/*
│   ├── reviewRoutes.js         # /api/reviews/*
│   ├── favoriteRoutes.js       # /api/favorites/*
│   ├── analyticsRoutes.js      # /api/analytics/*
│   ├── reports.js              # /api/reports/*
│   ├── faqs.js                 # /api/faqs/*
│   ├── featureFlags.js         # /api/feature-flags/*
│   └── appInfo.js              # /api/app-info/*
│
├── services/                    # Business logic services
│   ├── notificationService.js  # FCM push notifications
│   ├── reminderService.js      # Scheduled reminders (30-min alerts)
│   └── waitTimeService.js      # Wait time calculation algorithm
│
├── utils/                       # Utility functions
│   ├── waitTimeHelpers.js      # Wait time broadcasting
│   └── validators.js           # Custom validation functions (if exists)
│
├── socket/                      # Socket.IO handlers
│   └── socketHandler.js        # Socket authentication, rooms, events
│
├── .env                         # Environment variables (DO NOT COMMIT)
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies & scripts
├── package-lock.json           # Dependency lock file
├── server.js                   # Main entry point
├── README.md                   # This file
└── LICENSE                     # License file
```

### **File Responsibilities**

| File | Purpose |
|------|---------|
| `server.js` | Main entry point, Express app setup, middleware, route mounting, Socket.IO initialization |
| `config/database.js` | MongoDB connection with Mongoose |
| `config/firebase.js` | Firebase Admin SDK initialization for auth & FCM |
| `middleware/auth.js` | JWT verification, role-based access control (protect, adminOnly, checkRole) |
| `services/notificationService.js` | Centralized FCM push notification logic |
| `services/waitTimeService.js` | Core wait time calculation algorithm (personalized) |
| `utils/waitTimeHelpers.js` | Socket.IO wait time broadcasting to all clients |

***

## 📋 **Prerequisites**

Before installing Lynin, ensure you have the following installed:

### **Required Software**

| Software | Version | Purpose | Installation Link |
|----------|---------|---------|-------------------|
| **Node.js** | 18.x or higher | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x or higher | Package manager | Comes with Node.js |
| **MongoDB** | 6.x or higher | Database | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/) |

### **Cloud Services**

| Service | Purpose | Setup Link |
|---------|---------|------------|
| **Firebase Project** | Phone authentication & FCM | [console.firebase.google.com](https://console.firebase.google.com/) |
| **MongoDB Atlas** (Optional) | Cloud database for production | [mongodb.com/atlas](https://www.mongodb.com/atlas) |

### **Recommended Tools**

- **Postman** - API testing ([postman.com](https://www.postman.com/))
- **MongoDB Compass** - Database GUI ([mongodb.com/products/compass](https://www.mongodb.com/products/compass))
- **VS Code** - Code editor ([code.visualstudio.com](https://code.visualstudio.com/))
- **Git Bash** (Windows) - Unix-like terminal

***

## 🚀 **Installation & Setup**

### **Step 1: Clone the Repository**

```bash
# Clone the repository
git clone https://github.com/your-org/lynin-backend.git

# Navigate to project directory
cd lynin-backend
```

### **Step 2: Install Dependencies**

```bash
# Install all npm packages
npm install
```

This will install all dependencies listed in `package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "socket.io": "^4.6.0",
    "firebase-admin": "^12.0.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### **Step 3: MongoDB Setup**

#### **Option A: Local MongoDB**

```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install -y mongodb

# Start MongoDB service
sudo service mongodb start

# Verify MongoDB is running
mongo --version
```

#### **Option B: MongoDB Atlas (Cloud)**

1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Create database user with password
4. Whitelist your IP address (or `0.0.0.0/0` for all)
5. Get connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/lynin?retryWrites=true&w=majority
   ```

### **Step 4: Firebase Setup**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project (or use existing)
3. Enable **Phone Authentication**:
   - Go to Authentication → Sign-in method
   - Enable Phone provider
4. Generate **Service Account Key**:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download JSON file (keep secure!)
5. Extract credentials from JSON:
   ```json
   {
     "project_id": "lynin-app",
     "client_email": "firebase-adminsdk@lynin-app.iam.gserviceaccount.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   }
   ```

### **Step 5: Environment Configuration**

Create `.env` file in project root:

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
nano .env
```

Paste the following configuration:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
MONGO_URI=mongodb://localhost:27017/lynin
# For MongoDB Atlas, use:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/lynin?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345678
JWT_EXPIRE=30d

# Firebase Configuration
FIREBASE_PROJECT_ID=lynin-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@lynin-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://yourdomain.com

# Rate Limiting (requests per 15 minutes)
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ Security Notes:**
- Never commit `.env` to Git (it's in `.gitignore`)
- Use strong, unique `JWT_SECRET` (minimum 32 characters)
- Replace Firebase credentials with your own

***

## ⚙️ **Configuration**

### **Database Configuration** (`config/database.js`)

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### **Firebase Configuration** (`config/firebase.js`)

```javascript
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

module.exports = admin;
```

### **CORS Configuration**

```javascript
// In server.js
const cors = require('cors');

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

***

## 🏃 **Running the Application**

### **Development Mode**

```bash
# Run with auto-reload (nodemon)
npm run dev
```

Output:
```
[nodemon] starting `node server.js`
✅ MongoDB Connected
✅ Socket.IO initialized
⏰ Reminder scheduler started (checks every 5 minutes)
🚀 Server running on http://localhost:3000
```

### **Production Mode**

```bash
# Run without nodemon
npm start
```

### **Available Scripts**

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

### **Verify Server is Running**

```bash
# Test health check endpoint
curl http://localhost:3000/api/health

# Expected response:
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-24T05:45:00.000Z"
}
```

***

## 💾 **Database Schema**

### **Collections Overview**

| Collection | Documents | Purpose |
|------------|-----------|---------|
| `users` | ~10,000+ | Customer/owner/staff/admin profiles |
| `salons` | ~500+ | Salon profiles with geospatial data |
| `bookings` | ~50,000+ | Queue & scheduled bookings |
| `staff` | ~2,000+ | Staff member profiles |
| `adminauditlogs` | ~5,000+ | Admin action tracking |
| `prioritylogs` | ~1,000+ | Priority queue audit trail |
| `faqs` | ~50 | Help center questions |
| `featureflags` | 1 | Live chat configuration |
| `appinfos` | 1 | App metadata |

### **Key Schema Highlights**

#### **User Model** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)
```javascript
{
  phone: "+919876543210",          // Unique, indexed
  firebaseUid: "abc123...",        // Unique from Firebase
  name: "John Doe",
  email: "john@example.com",
  role: "customer",                // customer|owner|manager|staff|admin
  salonId: ObjectId("..."),        // For owner/staff
  loyaltyPoints: 150,              // 1 point per ₹10
  fcmToken: "dA7XvZ3k...",         // For push notifications
  setupCompleted: false,           // For salon owners
  setupStep: "profile",            // Wizard tracking
  isActive: true
}
```

#### **Salon Model** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)
```javascript
{
  name: "StyleHub Men's Salon",
  location: {
    type: "Point",                 // GeoJSON
    coordinates: [72.8777, 19.0760],  // [lng, lat] - 2dsphere indexed!
    address: "123 Main St, Andheri",
    city: "Mumbai",
    state: "Maharashtra"
  },
  services: [
    {
      name: "Haircut",
      price: 300,
      duration: 30,
      category: "Hair",            // Hair|Beard|Body|Add-on
      isPrimary: true,             // Show prominently
      isUpsell: false              // Suggest at checkout
    }
  ],
  isOpen: true,
  currentQueueSize: 3,
  averageRating: 4.5,
  totalBarbers: 4,
  activeBarbers: 3,
  busyMode: false,
  priorityUsedToday: 2,            // Max 5 per day
  priorityLimitPerDay: 5
}
```

#### **Booking Model** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)
```javascript
{
  userId: ObjectId("..."),         // null for walk-ins
  salonId: ObjectId("..."),
  bookingType: "immediate",        // immediate|scheduled
  services: [{ name, price, duration }],
  totalPrice: 450,
  totalDuration: 45,
  queuePosition: 4,                // Live queue position
  status: "pending",               // pending|in-progress|completed|cancelled
  walkInToken: "0001",             // For anonymous customers
  arrived: true,                   // For scheduled bookings
  estimatedStartTime: ISODate("..."),
  startedAt: null,
  completedAt: null,
  paymentStatus: "paid",           // Auto-marked on completion
  loyaltyPointsEarned: 45,
  rating: null,
  review: null
}

// Indexes: { salonId, queuePosition }, { salonId, bookingType, scheduledDate }
```

### **Database Indexes for Performance**

```javascript
// Geospatial index for nearby salon search
db.salons.createIndex({ "location.coordinates": "2dsphere" });

// Queue management
db.bookings.createIndex({ salonId: 1, queuePosition: 1 });
db.bookings.createIndex({ salonId: 1, status: 1 });

// User lookups
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ firebaseUid: 1 }, { unique: true });

// Scheduled bookings
db.bookings.createIndex({ salonId: 1, bookingType: 1, scheduledDate: 1 });
```

***

## 🔌 **API Endpoints**

### **Base URL**
```
Development: http://localhost:3000/api
Production: https://api.lynin.com/api
```

### **Endpoint Categories**

| Category | Base Path | Count | Auth Required |
|----------|-----------|-------|---------------|
| Authentication | `/api/auth/*` | 6 | Mixed |
| Salons | `/api/salons/*` | 15+ | Mixed |
| Bookings | `/api/bookings/*` | 10+ | Private |
| Queue Management | `/api/queue/*` | 8 | Private |
| Scheduled Bookings | `/api/scheduled-bookings/*` | 4 | Private |
| Staff | `/api/staff/*` | 10+ | Private |
| Dashboard | `/api/dashboard/*` | 5+ | Private |
| Reviews | `/api/reviews/*` | 5 | Mixed |
| Favorites | `/api/favorites/*` | 4 | Private |
| Admin | `/api/admin/*` | 20+ | Admin Only |
| Reports | `/api/reports/*` | 5+ | Private |
| FAQs | `/api/faqs/*` | 6 | Mixed |
| Feature Flags | `/api/feature-flags/*` | 2 | Mixed |
| App Info | `/api/app-info/*` | 2 | Mixed |

### **Quick Reference**

#### **Authentication**
```bash
# Login/Register
POST /api/auth/verify-token
  Body: { idToken, phone, appType }

# Get current user
GET /api/auth/me
  Headers: Authorization: Bearer <JWT>

# Update profile
PUT /api/auth/profile
  Body: { name, email, profileImage }
```

#### **Salon Discovery**
```bash
# Search nearby salons
GET /api/salons/nearby?latitude=19.0760&longitude=72.8777&radius=5

# Get salon details
GET /api/salons/:id

# Search salons
GET /api/salons?search=StyleHub&city=Mumbai&page=1&limit=10
```

#### **Booking**
```bash
# Join queue immediately
POST /api/bookings/join-queue
  Body: { salonId, services, paymentMethod }

# Schedule booking
POST /api/bookings/schedule
  Body: { salonId, services, scheduledDate, scheduledTime }

# Get my bookings
GET /api/bookings/my-bookings?status=pending
```

#### **Queue Management (Owner)**
```bash
# View queue
GET /api/queue/:salonId

# Add walk-in
POST /api/queue/:salonId/walk-in
  Body: { name, phone, services }  # name/phone optional

# Start service
POST /api/queue/:salonId/start/:bookingId

# Complete service (auto-marks payment paid + awards loyalty)
POST /api/queue/:salonId/complete/:bookingId

# Start priority service
POST /api/queue/:salonId/start-priority/:bookingId
  Body: { reason: "Senior citizen" }
```

**📖 Full API documentation:** See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for 100+ endpoints with request/response examples.

***

## 🌐 **Real-Time Events**

### **Socket.IO Connection**

```javascript
// Client-side (Flutter/React)
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: '<JWT_TOKEN>'  // Same JWT from REST API
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Join salon room to receive updates
  socket.emit('join_salon', { salonId: '60d5f484...' });
});
```

### **Available Events**

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `join_salon` | Client → Server | Join salon room | `{ salonId }` |
| `leave_salon` | Client → Server | Leave salon room | `{ salonId }` |
| `joined_salon` | Server → Client | Confirmation | `{ salonId }` |
| `queue_updated` | Server → Client | Queue changed | `{ salonId, queueSize, action }` |
| `wait_time_updated` | Server → Client | **Personalized** wait time | `{ salonId, waitTime: {...} }` |
| `service_started` | Server → Client | Service began | `{ bookingId }` |
| `service_completed` | Server → Client | Service done | `{ bookingId, pointsEarned }` |
| `priority_started` | Server → Client | Priority service | `{ bookingId, reason }` |
| `customer_arrived` | Server → Client | Scheduled customer | `{ bookingId }` |
| `booking_cancelled` | Server → Client | Booking cancelled | `{ bookingId }` |

### **Wait Time Update Example** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

```javascript
// Server broadcasts personalized wait time to each socket
socket.on('wait_time_updated', (data) => {
  console.log(data);
  /*
  {
    salonId: "60d5f484...",
    waitTime: {
      waitMinutes: 30,
      displayText: "~30 min wait",  // or "Your turn in ~30 min" if in queue
      queueLength: 3,
      queuePosition: 2,  // null if not in queue
      status: "busy",
      isInQueue: true,   // true if user is in queue
      estimatedStartTime: "2026-01-24T07:00:00.000Z"
    },
    timestamp: 1737698700000
  }
  */
  
  // Update UI based on isInQueue
  if (data.waitTime.isInQueue) {
    showMessage(`Your turn in ${data.waitTime.waitMinutes} minutes`);
  } else {
    showMessage(`Current wait: ${data.waitTime.displayText}`);
  }
});
```

**Key Feature:** Each user gets their own wait time calculation based on their queue position ! [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

## 🔐 **Authentication Flow**

### **Firebase Phone Authentication**

```
┌──────────────┐
│ Client App   │
│ (Flutter)    │
└──────┬───────┘
       │
       │ 1. User enters phone number: +919876543210
       │    Firebase.auth().verifyPhoneNumber()
       ▼
┌──────────────────────┐
│ Firebase sends OTP   │
│ via SMS              │
└──────┬───────────────┘
       │
       │ 2. User enters OTP: 123456
       │    Firebase verifies OTP
       ▼
┌──────────────────────────────┐
│ Firebase returns idToken     │
│ (JWT signed by Firebase)     │
└──────┬───────────────────────┘
       │
       │ 3. Client sends to backend
       │    POST /api/auth/verify-token
       │    { idToken, phone, appType: "customer" }
       ▼
┌────────────────────────────────────────┐
│ Backend (authController.js)            │
│ ├─ Verify idToken with Firebase Admin │
│ ├─ Extract phone from token            │
│ ├─ Find user in MongoDB by phone       │
│ │    OR firebaseUid                    │
│ ├─ If not found, create new user       │
│ ├─ Set default role based on appType   │
│ └─ Generate JWT token                  │
└──────┬─────────────────────────────────┘
       │
       │ 4. Response
       ▼
┌────────────────────────────────────┐
│ {                                  │
│   success: true,                   │
│   token: "<JWT_TOKEN>",            │
│   user: {                          │
│     _id: "...",                    │
│     phone: "+919876543210",        │
│     name: "John Doe",              │
│     role: "customer",              │
│     loyaltyPoints: 150             │
│   }                                │
│ }                                  │
└──────┬─────────────────────────────┘
       │
       │ 5. Client stores JWT securely
       │    (Flutter Secure Storage)
       ▼
┌────────────────────────────────────┐
│ All subsequent API requests        │
│ include:                           │
│ Authorization: Bearer <JWT_TOKEN>  │
└────────────────────────────────────┘
```

### **JWT Token Structure**

```javascript
// Generated by backend
const token = jwt.sign(
  {
    userId: user._id,
    phone: user.phone,
    role: user.role,
    isAdmin: user.role === 'admin'
  },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

// Decoded token
{
  "userId": "60d5f484f1b2c72d88f8a1b2",
  "phone": "+919876543210",
  "role": "customer",
  "isAdmin": false,
  "iat": 1737698400,
  "exp": 1740376800
}
```

### **Middleware Protection** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

```javascript
// middleware/auth.js

// Verify JWT token
const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ') [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt);
  }
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin only
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Multiple roles
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};
```

### **Usage in Routes**

```javascript
// Public route
router.get('/salons', salonController.getAllSalons);

// Private route (any authenticated user)
router.get('/bookings/my-bookings', protect, bookingController.getMyBookings);

// Owner/Manager only
router.post('/queue/:salonId/walk-in', protect, checkRole(['owner', 'manager']), queueController.addWalkIn);

// Admin only
router.delete('/admin/users/:userId', protect, adminOnly, adminController.softDeleteUser);
```

***

## 🧮 **Core Business Logic**

### **1. Wait Time Calculation Algorithm** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Location:** `services/waitTimeService.js`

**Purpose:** Calculate personalized wait time for each user based on their queue position

**Algorithm:**

```javascript
async function calculateWaitTime(salonId, userId = null, salon = null) {
  // Get all bookings in queue, sorted by position
  const queueEntries = await Booking.find({
    salonId,
    status: { $in: ['pending', 'in-progress'] }
  }).sort({ queuePosition: 1 });
  
  let waitMinutes = 0;
  
  // Check if user is in queue
  const userIndex = queueEntries.findIndex(
    entry => entry.userId?.toString() === userId?.toString() && entry.status === 'pending'
  );
  
  if (userIndex !== -1) {
    // CASE 1: User IS in queue
    // Calculate wait = sum of all bookings BEFORE user
    for (let i = 0; i < userIndex; i++) {
      const entry = queueEntries[i];
      if (entry.status === 'in-progress') {
        // Calculate remaining time
        const elapsed = (Date.now() - entry.startedAt) / 60000;
        waitMinutes += Math.max(0, entry.totalDuration - elapsed);
      } else {
        // Add full duration
        waitMinutes += entry.totalDuration;
      }
    }
    
    return {
      waitMinutes,
      displayText: `Your turn in ~${waitMinutes} min`,
      queuePosition: queueEntries[userIndex].queuePosition,
      isInQueue: true
    };
  } else {
    // CASE 2: User NOT in queue
    // Calculate total wait for entire queue
    for (const entry of queueEntries) {
      if (entry.status === 'in-progress') {
        const elapsed = (Date.now() - entry.startedAt) / 60000;
        waitMinutes += Math.max(0, entry.totalDuration - elapsed);
      } else {
        waitMinutes += entry.totalDuration;
      }
    }
    
    return {
      waitMinutes,
      displayText: formatWaitTime(waitMinutes),
      queuePosition: null,
      isInQueue: false
    };
  }
}
```

**Key Insight:** Each user sees their own personalized wait time ! [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

### **2. Walk-In Token Generation** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Location:** `controllers/queueController.js`

**Purpose:** Generate 4-digit tokens (0001, 0002, ...) for anonymous walk-in customers

**Algorithm:**

```javascript
async function addWalkIn(req, res) {
  const { name, phone, services } = req.body;
  
  let userId = null;
  let customerName = name;
  let customerPhone = phone;
  let walkInToken = null;
  
  if (phone) {
    // Create/link user account
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        name: name || `Customer ${phone}`,
        role: 'customer'
      });
    }
    userId = user._id;
    customerName = user.name;
  } else {
    // Generate token for anonymous customer
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find highest token for today
    const lastToken = await Booking.findOne({
      salonId,
      walkInToken: { $ne: null },
      createdAt: { $gte: today }
    }).sort({ walkInToken: -1 });
    
    let tokenNumber = 1;
    if (lastToken && lastToken.walkInToken) {
      tokenNumber = parseInt(lastToken.walkInToken) + 1;
    }
    
    walkInToken = tokenNumber.toString().padStart(4, '0');  // "0001"
    customerName = `Token #${walkInToken}`;
    customerPhone = 'N/A';
  }
  
  // Create booking
  const booking = await Booking.create({
    userId,
    salonId,
    walkInToken,
    services,
    arrived: true,  // Walk-ins are auto-arrived
    bookingType: 'immediate',
    queuePosition: await getNextQueuePosition(salonId)
  });
  
  res.status(201).json({ success: true, booking });
}
```

**Daily Reset:** Tokens reset at midnight (compared via `createdAt >= startOfToday`). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

### **3. Priority Queue System** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Location:** `controllers/queueController.js`

**Purpose:** Allow salon owners to prioritize certain customers (senior citizens, medical urgency, children)

**Rules:**
- Maximum 5 priority insertions per day per salon
- Only Owner or Manager can prioritize
- Logs all priority actions to `PriorityLog` collection

**Implementation:**

```javascript
async function startPriorityService(req, res) {
  const { salonId, bookingId } = req.params;
  const { reason } = req.body;
  
  // Check permission
  if (!['owner', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only owner/manager can prioritize' });
  }
  
  // Check daily limit
  const salon = await Salon.findById(salonId);
  const today = new Date().toDateString();
  const lastReset = new Date(salon.lastPriorityReset).toDateString();
  
  if (today !== lastReset) {
    // Reset counter
    salon.priorityUsedToday = 0;
    salon.lastPriorityReset = new Date();
  }
  
  if (salon.priorityUsedToday >= salon.priorityLimitPerDay) {
    return res.status(400).json({ 
      message: `Daily priority limit reached (${salon.priorityLimitPerDay}/${salon.priorityLimitPerDay} used)` 
    });
  }
  
  // Move booking to front
  const booking = await Booking.findById(bookingId);
  booking.originalPosition = booking.queuePosition;
  booking.queuePosition = 1;
  booking.status = 'in-progress';
  booking.startedAt = new Date();
  await booking.save();
  
  // Reorder all other bookings
  await reorderQueueAfterPriority(salonId);
  
  // Increment counter
  salon.priorityUsedToday += 1;
  await salon.save();
  
  // Log action
  await PriorityLog.create({
    salonId,
    bookingId,
    reason,
    triggeredBy: req.user._id
  });
  
  // Notify customer
  if (booking.userId) {
    await NotificationService.notifyPriorityStarted(
      await User.findById(booking.userId),
      booking,
      salon,
      reason
    );
  }
  
  // Broadcast updates
  emitWaitTimeUpdate(salonId);
  
  res.json({ success: true, booking });
}
```

***

### **4. Auto-Payment Marking** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Location:** `controllers/queueController.js → completeService()`

**Purpose:** Automatically mark payment as paid when service completes, award loyalty points

**Implementation:**

```javascript
async function completeService(req, res) {
  const { bookingId } = req.params;
  
  const booking = await Booking.findById(bookingId).populate('userId');
  
  // Update booking status
  booking.status = 'completed';
  booking.completedAt = new Date();
  
  // AUTO-MARK PAYMENT
  booking.paymentStatus = 'paid';
  booking.paidAmount = booking.totalPrice;
  booking.paymentDate = new Date();
  
  await booking.save();
  
  // Award loyalty points (1 point per ₹10)
  let pointsEarned = 0;
  if (booking.userId) {
    pointsEarned = Math.floor(booking.totalPrice / 10);
    booking.loyaltyPointsEarned = pointsEarned;
    await booking.save();
    
    const user = booking.userId;
    user.loyaltyPoints += pointsEarned;
    user.totalBookings += 1;
    await user.save();
  }
  
  // Reorder queue
  await updateQueuePositions(booking.salonId);
  
  // Send notification
  if (booking.userId) {
    await NotificationService.notifyBookingCompleted(
      booking.userId,
      booking,
      await Salon.findById(booking.salonId)
    );
  }
  
  // Broadcast wait time update
  emitWaitTimeUpdate(booking.salonId);
  
  res.json({
    success: true,
    message: 'Service completed and payment recorded',
    booking,
    pointsEarned
  });
}
```

**Benefits:**
- Reduces manual payment tracking
- Encourages customer loyalty
- Simplifies checkout process [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

### **5. Scheduled Booking Arrival System** [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Location:** `controllers/scheduledBookingController.js`

**Purpose:** Handle customers arriving for scheduled appointments

**Flow:**

```javascript
async function markArrived(req, res) {
  const { bookingId } = req.params;
  
  const booking = await Booking.findById(bookingId);
  
  // Validate
  if (booking.bookingType !== 'scheduled') {
    return res.status(400).json({ message: 'Not a scheduled booking' });
  }
  
  if (booking.arrived) {
    return res.status(400).json({ message: 'Already marked as arrived' });
  }
  
  // Mark as arrived
  booking.arrived = true;
  booking.arrivedAt = new Date();
  booking.joinedAt = new Date();
  
  // Assign queue position (add to end of current queue)
  const currentQueueSize = await Booking.countDocuments({
    salonId: booking.salonId,
    status: { $in: ['pending', 'in-progress'] }
  });
  booking.queuePosition = currentQueueSize + 1;
  
  await booking.save();
  
  // Reorder queue to remove gaps
  await reorderQueuePositions(booking.salonId);
  
  // Emit events
  global.io.to(`salon_${booking.salonId}`).emit('customer_arrived', {
    bookingId: booking._id
  });
  
  global.io.to(`user_${booking.userId}`).emit('arrival_confirmed', {
    bookingId: booking._id,
    queuePosition: booking.queuePosition
  });
  
  emitWaitTimeUpdate(booking.salonId);
  
  res.json({
    success: true,
    message: 'Customer marked as arrived',
    booking
  });
}
```

**Key Features:**
- Scheduled bookings don't have queue position until arrived
- Upon arrival, they join the live queue
- All real-time updates apply from that point [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

***

## 🧪 **Testing**

### **Manual Testing with Postman**

1. **Import Collection:**
   - Download [Postman collection](docs/Lynin_API_Collection.json)
   - Import into Postman

2. **Set Environment Variables:**
   ```
   base_url: http://localhost:3000/api
   jwt_token: (will be set after login)
   ```

3. **Test Authentication:**
   ```bash
   POST {{base_url}}/auth/verify-token
   Body: {
     "idToken": "your_firebase_id_token",
     "phone": "+919876543210",
     "appType": "customer"
   }
   ```

4. **Copy JWT from response** → Set as `jwt_token` environment variable

5. **Test Protected Routes:**
   ```bash
   GET {{base_url}}/salons/nearby?latitude=19.0760&longitude=72.8777
   Headers:
     Authorization: Bearer {{jwt_token}}
   ```

### **Automated Testing (Recommended Setup)**

```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Create test file
mkdir __tests__
touch __tests__/auth.test.js
```

**Example Test:** `__tests__/auth.test.js`

```javascript
const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');

describe('Authentication', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);
    
    expect(res.body.success).toBe(false);
  });

  it('should return user profile with valid token', async () => {
    const token = 'valid_jwt_token_here';
    
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('phone');
  });
});
```

**Run Tests:**
```bash
npm test
```

***

## 🚀 **Deployment**

### **Option 1: Traditional VPS (Ubuntu/Debian)**

#### **Step 1: Server Setup**

```bash
# SSH into server
ssh root@your-server-ip

# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### **Step 2: Deploy Application**

```bash
# Clone repository
cd /var/www
git clone https://github.com/your-org/lynin-backend.git
cd lynin-backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# (paste production environment variables)

# Start with PM2
pm2 start server.js --name lynin-backend

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor logs
pm2 logs lynin-backend
```

#### **Step 3: Nginx Reverse Proxy**

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/lynin

# Paste:
server {
    listen 80;
    server_name api.lynin.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/lynin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.lynin.com
```

***

### **Option 2: Docker Deployment**

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/lynin
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

volumes:
  mongo-data:
```

**Deploy:**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

***

### **Option 3: Cloud Platforms**

#### **Heroku**

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create lynin-backend

# Set environment variables
heroku config:set MONGO_URI=mongodb+srv://...
heroku config:set JWT_SECRET=your_secret
heroku config:set FIREBASE_PROJECT_ID=...
heroku config:set FIREBASE_CLIENT_EMAIL=...
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN..."

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### **AWS Elastic Beanstalk / DigitalOcean App Platform / Google Cloud Run**

Similar process with platform-specific CLI tools and configuration files.

***

## 📋 **Environment Variables**

### **Complete Reference**

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NODE_ENV` | string | No | `development` | Environment mode |
| `PORT` | number | No | `3000` | Server port |
| `MONGO_URI` | string | **Yes** | - | MongoDB connection string |
| `JWT_SECRET` | string | **Yes** | - | Secret for JWT signing (min 32 chars) |
| `JWT_EXPIRE` | string | No | `30d` | JWT expiration time |
| `FIREBASE_PROJECT_ID` | string | **Yes** | - | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | string | **Yes** | - | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | string | **Yes** | - | Firebase private key (with \n escaped) |
| `ALLOWED_ORIGINS` | string (CSV) | No | `*` | CORS allowed origins |
| `RATE_LIMIT_WINDOW` | number | No | `15` | Rate limit window (minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | number | No | `100` | Max requests per window |

### **Security Best Practices**

✅ **Do:**
- Use strong, random `JWT_SECRET` (at least 32 characters)
- Keep `.env` in `.gitignore`
- Use different Firebase projects for dev/prod
- Rotate secrets regularly
- Use environment-specific MongoDB databases

❌ **Don't:**
- Commit `.env` to Git
- Use default secrets in production
- Share credentials via email/Slack
- Reuse passwords across services

***

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. MongoDB Connection Failed**

**Error:**
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check connection string in .env
MONGO_URI=mongodb://localhost:27017/lynin
# NOT: MONGO_URI=mongodb://localhost:27017
```

***

#### **2. Firebase Authentication Error**

**Error:**
```
FirebaseAppError: Credential implementation provided to initializeApp() via the "credential" property failed to fetch a valid Google OAuth2 access token
```

**Solutions:**
- Verify `FIREBASE_PRIVATE_KEY` has `\n` properly escaped
- Check Firebase service account permissions
- Ensure Firebase project has Phone Auth enabled
- Regenerate service account key if corrupted

***

#### **3. JWT Token Invalid**

**Error:**
```
JsonWebTokenError: invalid signature
```

**Solutions:**
- Ensure `JWT_SECRET` matches between sessions
- Check token hasn't expired (default 30 days)
- Verify Authorization header format: `Bearer <token>`

***

#### **4. Socket.IO Connection Refused**

**Error:**
```
WebSocket connection to 'wss://api.lynin.com/socket.io/' failed
```

**Solutions:**
- Check CORS configuration allows Socket.IO
- Verify Nginx is proxying WebSocket correctly:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  ```
- Ensure client uses correct Socket.IO version (4.x)

***

#### **5. Push Notifications Not Sent**

**Error:**
```
Notification error: Requested entity was not found
```

**Solutions:**
- Verify user has `fcmToken` in database
- Check Firebase Cloud Messaging is enabled
- Ensure FCM token is valid (refresh on app start)
- Test with Firebase Console → Cloud Messaging → Send test message

***

## ⚡ **Performance Optimization**

### **Database Optimization**

```javascript
// 1. Use lean() for read-only queries
const salons = await Salon.find({ city: 'Mumbai' }).lean();

// 2. Select only needed fields
const users = await User.find().select('name phone loyaltyPoints');

// 3. Use indexes (already implemented)
// Verify indexes:
db.bookings.getIndexes();

// 4. Limit results with pagination
const bookings = await Booking.find()
  .limit(20)
  .skip((page - 1) * 20);
```

### **Caching Strategy**

```javascript
// Implement Redis caching for frequently accessed data
const redis = require('redis');
const client = redis.createClient();

// Cache salon details (5-minute TTL)
async function getSalonCached(salonId) {
  const cached = await client.get(`salon:${salonId}`);
  if (cached) return JSON.parse(cached);
  
  const salon = await Salon.findById(salonId);
  await client.setEx(`salon:${salonId}`, 300, JSON.stringify(salon));
  return salon;
}
```

### **Socket.IO Optimization**

```javascript
// Use rooms efficiently (already implemented)
io.to(`salon_${salonId}`).emit('queue_updated', data);

// Limit payload size
socket.emit('wait_time_updated', {
  waitMinutes: 30,
  displayText: '~30 min'
  // Don't send entire booking objects
});
```

### **API Response Compression**

```javascript
// In server.js
const compression = require('compression');
app.use(compression());
```

***

## 🤝 **Contributing**

### **Development Workflow**

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/lynin-backend.git
   cd lynin-backend
   git remote add upstream https://github.com/original-org/lynin-backend.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/add-payment-gateway
   ```

3. **Make Changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update API documentation if needed

4. **Test**
   ```bash
   npm test
   # Or manual testing with Postman
   ```

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: add Razorpay payment gateway integration"
   ```

6. **Push & Create PR**
   ```bash
   git push origin feature/add-payment-gateway
   # Then create Pull Request on GitHub
   ```

### **Code Style Guidelines**

- Use **camelCase** for variables and functions
- Use **PascalCase** for models and classes
- Always use **async/await** (not callbacks)
- Add JSDoc comments for public functions
- Keep functions under 50 lines

**Example:**
```javascript
/**
 * Calculate personalized wait time for user
 * @param {String} salonId - Salon MongoDB ObjectId
 * @param {String} userId - User MongoDB ObjectId (optional)
 * @returns {Promise<Object>} Wait time object
 */
async function calculateWaitTime(salonId, userId = null) {
  // Implementation
}
```

***

## 📝 **Changelog**

### **Version 2.0.0** (January 2026)
- ✅ Personalized wait time calculation
- ✅ Walk-in token system (4-digit)
- ✅ Priority queue with daily limits
- ✅ Scheduled booking system
- ✅ Staff management system
- ✅ Admin audit logging
- ✅ FAQ caching (24-hour)
- ✅ Feature flags (live chat toggle)
- ✅ Salon closure tracking
- ✅ Auto-payment marking on completion
- ✅ Service categories (Hair, Beard, Body, Add-on)
- ✅ Salon setup wizard (4 steps)

### **Version 1.0.0** (June 2025)
- Initial release
- Firebase phone authentication
- Basic queue management
- Geospatial salon search
- Push notifications
- Reviews & ratings
- Loyalty points

***

## 📄 **License**

**Proprietary License**

© 2025 Lynin Technologies. All rights reserved.

This software and associated documentation files (the "Software") are proprietary and confidential. Unauthorized copying, distribution, modification, or use of this Software, via any medium, is strictly prohibited without express written permission from Lynin Technologies.

For licensing inquiries, contact: legal@lynin.com

***

## 📞 **Support & Contact**

### **Technical Support**

| Channel | Contact | Response Time |
|---------|---------|---------------|
| Email | support@lynin.com | 24-48 hours |
| GitHub Issues | [Create Issue](https://github.com/your-org/lynin-backend/issues) | 48 hours |
| Discord | [Join Server](https://discord.gg/lynin) | Real-time |
| Documentation | [docs.lynin.com](https://docs.lynin.com) | - |

### **Team**

- **Backend Lead:** Your Name (your.email@lynin.com)
- **DevOps:** DevOps Name (devops@lynin.com)
- **Project Manager:** PM Name (pm@lynin.com)

***

## 🎯 **Roadmap**

### **Q1 2026**
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] SMS notifications (Twilio)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support (i18n)

### **Q2 2026**
- [ ] Video consultations
- [ ] Product sales (shampoos, styling products)
- [ ] Membership/subscription plans
- [ ] Referral program

### **Q3 2026**
- [ ] AI-powered stylist recommendations
- [ ] Virtual try-on (AR integration)
- [ ] Integration with POS systems
- [ ] Franchise management module

***

## 🙏 **Acknowledgments**

- **Express.js** - Web framework
- **MongoDB** - Database
- **Socket.IO** - Real-time engine
- **Firebase** - Authentication & FCM
- **Mongoose** - MongoDB ODM
- **Node.js Community** - Inspiration and support

***

## 📚 **Additional Resources**

- [API Documentation (Full)](API_DOCUMENTATION.md)
- [Database Schema Diagram](docs/database_schema.png)
- [System Architecture Diagram](docs/architecture.png)
- [Postman Collection](docs/Lynin_API_Collection.json)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security Best Practices](docs/SECURITY.md)

***

**Made with ❤️ by Lynin Development Team**

**Last Updated:** January 24, 2026