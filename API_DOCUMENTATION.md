# 📘 **LYNIN BACKEND API - COMPLETE DOCUMENTATION**

**Version:** 2.0  
**Last Updated:** January 24, 2026  
**Base URL:** `http://100.112.160.11:3000/api` (Development)  
**Environment:** Node.js + Express.js + MongoDB + Socket.IO + Firebase

***

## **🎯 TABLE OF CONTENTS**

1. [System Architecture](#1-system-architecture)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Models](#3-data-models)
4. [API Endpoints](#4-api-endpoints)
   - [Authentication APIs](#41-authentication-apis)
   - [User Profile APIs](#42-user-profile-apis)
   - [Salon APIs](#43-salon-apis)
   - [Booking & Queue APIs](#44-booking--queue-apis)
   - [Scheduled Booking APIs](#45-scheduled-booking-apis)
   - [Staff Management APIs](#46-staff-management-apis)
   - [Dashboard & Reports APIs](#47-dashboard--reports-apis)
   - [Review APIs](#48-review-apis)
   - [Favorites APIs](#49-favorites-apis)
   - [Analytics APIs](#410-analytics-apis)
   - [Admin APIs](#411-admin-apis)
   - [FAQ APIs](#412-faq-apis)
   - [Feature Flags & App Info APIs](#413-feature-flags--app-info-apis)
5. [Real-Time Features (Socket.IO)](#5-real-time-features-socketio)
6. [Services & Business Logic](#6-services--business-logic)
7. [Error Handling](#7-error-handling)
8. [Complete Workflows](#8-complete-workflows)

***

## **1. SYSTEM ARCHITECTURE**

### **1.1 Technology Stack**

```
Backend Framework: Express.js (Node.js)
Database: MongoDB (Mongoose ODM)
Authentication: Firebase Admin SDK + JWT
Real-time: Socket.IO
Push Notifications: Firebase Cloud Messaging (FCM)
File Storage: Firebase Storage (implied)
Geolocation: MongoDB 2dsphere indexes
```

### **1.2 Project Structure**

```
lynin-backend/
├── server.js                    # Main entry point
├── config/
│   ├── database.js              # MongoDB connection
│   └── firebase.js              # Firebase Admin SDK
├── models/
│   ├── User.js                  # User schema (customer/owner/admin/staff/manager)
│   ├── Salon.js                 # Salon schema with geospatial data
│   ├── Booking.js               # Booking/Queue management
│   ├── Staff.js                 # Staff member profiles
│   ├── AdminAuditLog.js         # Admin activity tracking
│   ├── PriorityLog.js           # Priority queue logs
│   ├── FAQ.js                   # Help center FAQs
│   ├── FeatureFlag.js           # Feature toggles (live chat)
│   └── AppInfo.js               # App metadata
├── controllers/
│   ├── authController.js        # Authentication logic
│   ├── adminAuthController.js   # Admin authentication
│   ├── adminController.js       # Admin operations
│   ├── salonController.js       # Salon CRUD & discovery
│   ├── bookingController.js     # Booking lifecycle
│   ├── queueController.js       # Live queue management
│   ├── scheduledBookingController.js # Scheduled bookings
│   ├── staffController.js       # Staff management
│   ├── salonSetupController.js  # Onboarding wizard
│   ├── dashboardController.js   # Dashboard stats
│   ├── reviewController.js      # Reviews & ratings
│   ├── favoriteController.js    # Favorites/wishlist
│   ├── analyticsController.js   # Analytics & reports
│   ├── reportsController.js     # Advanced reporting
│   ├── faqController.js         # FAQ management
│   ├── featureFlagController.js # Feature flags
│   └── appInfoController.js     # App info management
├── routes/
│   ├── authRoutes.js
│   ├── adminAuthRoutes.js
│   ├── adminRoutes.js
│   ├── salonRoutes.js
│   ├── bookingRoutes.js
│   ├── queueRoutes.js
│   ├── scheduledBookingRoutes.js
│   ├── staffRoutes.js (staff.js)
│   ├── salonSetupRoutes.js
│   ├── dashboardRoutes.js
│   ├── reviewRoutes.js
│   ├── favoriteRoutes.js
│   ├── analyticsRoutes.js
│   ├── reports.js
│   ├── faqs.js
│   ├── featureFlags.js
│   └── appInfo.js
├── middleware/
│   ├── auth.js                  # JWT verification & admin checks
│   └── roleCheck.js             # Role-based access control
├── services/
│   ├── notificationService.js   # FCM push notifications
│   ├── reminderService.js       # Scheduled reminders
│   └── waitTimeService.js       # Wait time calculations
└── utils/
    └── waitTimeHelpers.js       # Wait time broadcasting
```

### **1.3 Core Features**

1. **Multi-Role System:** Customer, Owner, Manager, Staff, Admin
2. **Real-Time Queue Management:** Live wait times, Socket.IO updates
3. **Dual Booking System:** Immediate (walk-in) + Scheduled bookings
4. **Staff Management:** Assign staff to bookings, track performance
5. **Priority Queue System:** Senior citizens, medical urgency, children
6. **Walk-In Token System:** 4-digit tokens for anonymous customers
7. **Loyalty Points:** 1 point per ₹10 spent
8. **Geospatial Search:** Find salons by coordinates + radius
9. **Admin Panel:** Platform statistics, user/salon management, audit logs
10. **Push Notifications:** Booking updates, queue position changes
11. **Dynamic Wait Time Calculation:** Personalized per user
12. **Salon Setup Wizard:** 4-step onboarding (Profile → Hours → Services → Capacity)

***

## **2. AUTHENTICATION & AUTHORIZATION**

### **2.1 Authentication Flow**

```
┌─────────────┐
│ Client App │
└──────┬──────┘
       │
       │ 1. Firebase Phone Auth (OTP)
       ▼
┌─────────────────┐
│ Firebase Auth   │
│ (idToken)       │
└──────┬──────────┘
       │
       │ 2. POST /api/auth/verify-token
       │    { idToken, phone, appType }
       ▼
┌─────────────────────┐
│ Backend verifies    │
│ Firebase token      │
│ ├─ New user → Create│
│ └─ Existing → Link  │
└──────┬──────────────┘
       │
       │ 3. Returns JWT + User
       ▼
┌─────────────────────┐
│ Client stores JWT   │
│ in secure storage   │
└─────────────────────┘
       │
       │ 4. All subsequent requests
       │    Authorization: Bearer <JWT>
       ▼
┌─────────────────────┐
│ Middleware verifies │
│ JWT → req.user      │
└─────────────────────┘
```

### **2.2 Roles & Permissions**

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **customer** | Regular app users | Book salons, write reviews, manage profile, view favorites  [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt) |
| **owner** | Salon owners | Manage salon(s), view analytics, manage queue, add walk-ins, complete setup wizard  [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt) |
| **manager** | Salon managers | Manage queue, handle bookings, cannot edit salon profile  [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt) |
| **staff** | Salon staff/barbers | View queue, start/complete services (limited permissions)  [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt) |
| **admin** | Platform admins | Full platform access, user/salon management, audit logs  [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt) |

### **2.3 JWT Structure**

```javascript
// JWT Payload
{
  "userId": "60d5f484f1b2c72d88f8a1b2",
  "phone": "+919876543210",
  "role": "customer|owner|manager|staff|admin",
  "isAdmin": true,  // Only for admin role
  "iat": 1737698400,
  "exp": 1740376800  // 30 days
}
```

### **2.4 Firebase Integration**

The backend uses **Firebase Admin SDK** to verify Firebase Authentication tokens: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

1. Client authenticates with Firebase (phone OTP)
2. Client sends Firebase `idToken` to backend
3. Backend verifies token using `admin.auth().verifyIdToken()`
4. Backend creates/updates user in MongoDB
5. Backend generates JWT for subsequent requests

***

## **3. DATA MODELS**

### **3.1 User Model**

```javascript
{
  phone: String (required, unique, indexed),
  name: String (nullable),
  email: String (nullable, unique if set),
  firebaseUid: String (required, unique, indexed),
  profileImage: String (URL),
  fcmToken: String (for push notifications),
  
  // Role system
  role: Enum ['customer', 'owner', 'manager', 'staff', 'admin'] (default: 'customer'),
  salonId: ObjectId (ref: Salon, for owner/manager/staff),
  permissions: [String] (for granular access control),
  
  // Salon owner setup tracking
  setupCompleted: Boolean (default: false),
  setupStep: Enum ['profile', 'hours', 'services', 'capacity', 'completed'],
  
  // Customer-specific
  favoriteSalons: [ObjectId] (ref: Salon),
  loyaltyPoints: Number (default: 0),
  totalBookings: Number (default: 0),
  
  // Metadata
  lastLogin: Date,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```


### **3.2 Salon Model**

```javascript
{
  name: String (required),
  description: String,
  
  // Location (geospatial)
  location: {
    type: 'Point',
    coordinates: [longitude, latitude] (required, 2dsphere indexed),
    address: String (required),
    city: String (required),
    state: String (required),
    pincode: String (required)
  },
  
  // Contact
  phone: String (required),
  email: String,
  
  // Operating hours
  hours: {
    monday: { open: '09:00', close: '21:00', closed: Boolean },
    tuesday: { open: '09:00', close: '21:00', closed: Boolean },
    // ... all 7 days
  },
  
  // Services with categories
  services: [{
    name: String,
    price: Number,
    duration: Number (minutes),
    description: String,
    category: Enum ['Hair', 'Beard', 'Body', 'Add-on'],
    isPrimary: Boolean,
    isUpsell: Boolean
  }],
  
  // Images
  profileImage: String,
  images: [String],
  
  // Ratings
  averageRating: Number (0-5),
  totalReviews: Number,
  
  // Queue management
  isOpen: Boolean (default: true),
  currentQueueSize: Number (default: 0),
  avgServiceTime: Number (default: 30),
  type: Enum ['men', 'women', 'unisex', null],
  
  // Capacity settings
  totalBarbers: Number (required, min: 1, default: 1),
  activeBarbers: Number (default: 1, max: totalBarbers),
  averageServiceDuration: Number (default: 30),
  busyMode: Boolean (default: false),
  maxQueueSize: Number (default: 20),
  
  // Account settings
  operatingMode: Enum ['normal', 'busy', 'closed'],
  autoAcceptBookings: Boolean (default: true),
  notificationPreferences: {
    newBookings: Boolean,
    queueUpdates: Boolean,
    customerMessages: Boolean,
    promotions: Boolean,
    pushEnabled: Boolean
  },
  
  // Priority system
  priorityLimitPerDay: Number (default: 5, max: 20),
  priorityUsedToday: Number (default: 0),
  lastPriorityReset: Date,
  
  // Closure tracking
  closureHistory: [{
    closedAt: Date,
    reason: String,
    customReason: String,
    queueSizeAtClosure: Number,
    reopenedAt: Date
  }],
  lastClosureReason: String,
  
  // Permissions (admin-controlled)
  phoneChangeEnabled: Boolean (default: false),
  staffSystemEnabled: Boolean (default: false),
  locationEditEnabled: Boolean (default: false),
  
  // Admin verification
  ownerId: ObjectId (ref: User, required),
  isActive: Boolean (default: true),
  isVerified: Boolean (default: false),
  verificationMeta: {
    verifiedBy: ObjectId (ref: User),
    verifiedAt: Date,
    notes: String
  },
  
  createdAt: Date,
  updatedAt: Date
}
```


### **3.3 Booking Model**

```javascript
{
  // References
  userId: ObjectId (ref: User, nullable for walk-ins),
  salonId: ObjectId (ref: Salon, required, indexed),
  assignedStaffId: ObjectId (ref: Staff, indexed),
  
  // Booking type
  bookingType: Enum ['immediate', 'scheduled'] (default: 'immediate', indexed),
  scheduledDate: Date (indexed, for scheduled bookings),
  scheduledTime: String (format: "HH:mm"),
  
  // Services
  services: [{
    serviceId: String,
    name: String,
    price: Number,
    duration: Number
  }],
  totalPrice: Number (required),
  totalDuration: Number (required),
  
  // Payment
  paymentMethod: Enum ['cash', 'card', 'upi', 'wallet'] (default: 'cash'),
  paymentStatus: Enum ['pending', 'paid', 'refunded', 'failed'],
  paidAmount: Number (default: 0),
  paymentDate: Date,
  transactionId: String,
  
  // Queue management
  queuePosition: Number (required, indexed),
  estimatedStartTime: Date,
  estimatedEndTime: Date,
  
  // Check-in system
  arrived: Boolean (default: false),
  arrivedAt: Date,
  walkInToken: String (indexed, 4-digit token for anonymous customers),
  
  // Status tracking
  status: Enum ['pending', 'in-progress', 'completed', 'skipped', 'cancelled', 'no-show'] (indexed),
  
  // Skip tracking
  skippedAt: Date,
  originalPosition: Number,
  skipReason: String,
  
  // Timestamps
  joinedAt: Date (default: Date.now),
  startedAt: Date,
  completedAt: Date,
  
  // Additional info
  notes: String,
  staffNotes: String,
  cancellationReason: String,
  
  // Review
  rating: Number (1-5),
  review: String,
  reviewedAt: Date,
  
  // Loyalty & notifications
  loyaltyPointsEarned: Number (default: 0),
  reminderSent: Boolean (default: false),
  turnNotificationSent: Boolean (default: false),
  
  createdAt: Date,
  updatedAt: Date
}

// Compound Indexes
- { userId, status }
- { salonId, status }
- { salonId, queuePosition }
- { salonId, bookingType, scheduledDate }
```


### **3.4 Staff Model**

```javascript
{
  name: String (required),
  email: String (required, unique),
  phone: String (required),
  profileImage: String,
  firebaseUid: String (unique, sparse),
  
  // Salon association
  salonId: ObjectId (ref: Salon, required, indexed),
  role: Enum ['barber', 'stylist', 'manager', 'receptionist'],
  specialization: [String],
  assignedServices: [ObjectId] (ref to salon.services._id),
  
  // Schedule
  workingHours: {
    monday: { isWorking: Boolean, start: '09:00', end: '18:00' },
    // ... all 7 days
  },
  
  // Financials
  commissionType: Enum ['percentage', 'fixed', 'none'],
  commissionRate: Number (default: 0),
  salary: Number (default: 0),
  
  // Performance stats
  stats: {
    totalBookings: Number,
    completedBookings: Number,
    totalRevenue: Number,
    totalCommission: Number,
    averageRating: Number (0-5),
    totalReviews: Number
  },
  
  // Status
  isActive: Boolean (default: true),
  isAvailable: Boolean (default: true),
  
  joinDate: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```


### **3.5 Additional Models**

**AdminAuditLog:** Tracks all admin actions (user deletion, salon verification, etc.) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**PriorityLog:** Logs priority queue insertions with reason and triggered by [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**FAQ:** Cached FAQs with categories, tags, views, and helpfulness tracking [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**FeatureFlag:** Live chat configuration (Tawk.to script toggle) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**AppInfo:** Cached app metadata (privacy policy URLs, social media links, open-source licenses) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

## **4. API ENDPOINTS**

### **4.1 AUTHENTICATION APIS**

#### **4.1.1 Verify Firebase Token (Customer/Owner Login)**

**Endpoint:** `POST /api/auth/verify-token`  
**Access:** Public  
**Description:** Authenticates user via Firebase token, creates/links account, returns JWT [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Request:**
```javascript
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6I...",  // or "firebaseToken"
  "phone": "+919876543210",                        // optional if in token
  "appType": "customer"                            // or "salon"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT
  "user": {
    "_id": "60d5f484f1b2c72d88f8a1b2",
    "phone": "+919876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "loyaltyPoints": 150,
    "salonId": null,
    "salonName": null
  },
  
  // For salon roles only
  "setupCompleted": false,
  "setupStep": "profile",
  "setupRequired": true  // true if owner with no salon
}
```

**Special Features:**
- Automatically links walk-in accounts (phone-based) to Firebase UID
- Sets default role based on `appType` ("customer" app → "customer", "salon" app → "owner")
- Returns setup status for salon roles [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

#### **4.1.2 Admin Login**

**Endpoint:** `POST /api/admin/auth/login`  
**Access:** Public  
**Description:** Admin authentication with Firebase token [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "email": "admin@lynin.com",
  "firebaseToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (200):**
```javascript
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",  // JWT with isAdmin: true
  "user": {
    "_id": "...",
    "name": "Admin User",
    "email": "admin@lynin.com",
    "phone": "+919876543210",
    "role": "admin",
    "profileImage": null
  }
}
```

**Security:**
- Verifies email matches Firebase token email
- Checks `role === 'admin'` and `isActive === true` in database
- Logs login event to AdminAuditLog [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.1.3 Get Current User Profile**

**Endpoint:** `GET /api/auth/me`  
**Access:** Private (requires JWT)  
**Description:** Returns current authenticated user's profile [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```javascript
{
  "success": true,
  "user": {
    "id": "60d5f484f1b2c72d88f8a1b2",
    "phone": "+919876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "loyaltyPoints": 150,
    "createdAt": "2025-01-20T10:30:00.000Z",
    "lastLogin": "2026-01-24T05:00:00.000Z"
  }
}
```

***

#### **4.1.4 Update User Profile**

**Endpoint:** `PUT /api/auth/profile`  
**Access:** Private  
**Description:** Update name, email, or profile image [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Request:**
```javascript
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "profileImage": "https://firebasestorage.googleapis.com/..."
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "...",
    "phone": "+919876543210",
    "name": "John Updated",
    "email": "john.new@example.com",
    "profileImage": "https://...",
    "loyaltyPoints": 150,
    "createdAt": "...",
    "lastLogin": "..."
  }
}
```

**Validation:**
- Email format validation
- Duplicate email check [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

#### **4.1.5 Update FCM Token**

**Endpoint:** `PUT /api/auth/fcm-token` or `PUT /api/auth/update-fcm-token`  
**Access:** Private  
**Description:** Register device for push notifications [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Request:**
```javascript
{
  "fcmToken": "dA7XvZ3k2Rg:APA91bH..."
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "FCM token updated successfully"
}
```

***

#### **4.1.6 Delete Account**

**Endpoint:** `DELETE /api/auth/account`  
**Access:** Private  
**Description:** Soft delete user account (marks `isActive: false`) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "message": "Account deactivated successfully"
}
```

***

### **4.2 USER PROFILE APIS**

#### **4.2.1 Get Extended Profile**

**Endpoint:** `GET /api/auth/profile`  
**Access:** Private  
**Description:** Returns profile with preferred salons populated [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "user": {
    "id": "...",
    "phone": "+919876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "profileImage": "https://...",
    "loyaltyPoints": 150,
    "totalBookings": 12,
    "preferredSalons": [
      {
        "_id": "...",
        "name": "StyleHub Men's Salon",
        "location": { "city": "Mumbai", "address": "..." }
      }
    ],
    "createdAt": "...",
    "lastLogin": "..."
  }
}
```

***

### **4.3 SALON APIS**

#### **4.3.1 Get All Salons**

**Endpoint:** `GET /api/salons`  
**Access:** Public  
**Description:** Search salons with filters and pagination [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Query Parameters:**
```
page=1              # Pagination
limit=10            # Items per page
search=StyleHub     # Search by name/city/address
city=Mumbai         # Filter by city
type=men            # Filter by type (men/women/unisex)
minRating=4         # Minimum average rating
isOpen=true         # Only show open salons
```

**Response (200):**
```javascript
{
  "success": true,
  "count": 10,
  "total": 45,
  "salons": [
    {
      "_id": "60d5f484f1b2c72d88f8a1b2",
      "name": "StyleHub Men's Salon",
      "description": "Premium men's grooming",
      "location": {
        "coordinates": [72.8777, 19.0760],
        "address": "123 Main St, Andheri",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400058"
      },
      "phone": "+919876543210",
      "email": "info@stylehub.com",
      "profileImage": "https://...",
      "images": ["https://...", "https://..."],
      "hours": {
        "monday": { "open": "09:00", "close": "21:00", "closed": false },
        // ... all days
      },
      "services": [
        {
          "_id": "...",
          "name": "Haircut",
          "price": 300,
          "duration": 30,
          "category": "Hair",
          "isPrimary": true,
          "isUpsell": false
        }
      ],
      "averageRating": 4.5,
      "totalReviews": 128,
      "isOpen": true,
      "currentQueueSize": 3,
      "type": "men",
      "totalBarbers": 4,
      "activeBarbers": 3,
      "busyMode": false,
      "isVerified": true,
      
      // Personalized wait time (varies per user)
      "waitTime": {
        "waitMinutes": 45,
        "displayText": "~45 min wait",
        "queueLength": 3,
        "queuePosition": null,  // null if user not in queue
        "status": "busy",       // available|busy|very-busy|full|closed
        "estimatedStartTime": "2026-01-24T06:15:00.000Z",
        "isInQueue": false,
        "timestamp": 1737698700000
      }
    }
  ]
}
```

**Note:** Wait times are personalized (see [Section 6.3](#63-wait-time-calculation-service)) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

#### **4.3.2 Get Nearby Salons (Geospatial)**

**Endpoint:** `GET /api/salons/nearby`  
**Access:** Public  
**Description:** Find salons within radius using MongoDB geospatial query [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Query Parameters:**
```
latitude=19.0760    # Required
longitude=72.8777   # Required
radius=5            # km (default: 5, max: 50)
limit=20
page=1
```

**Response:** Same as 4.3.1 but sorted by distance (nearest first) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

#### **4.3.3 Get Salon by ID**

**Endpoint:** `GET /api/salons/:id`  
**Access:** Public  
**Description:** Get detailed salon information [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Response (200):**
```javascript
{
  "success": true,
  "salon": {
    // Same as 4.3.1 salon object
    // Includes personalized wait time if userId in request (via protect middleware)
  }
}
```

***

#### **4.3.4 Create Salon**

**Endpoint:** `POST /api/salons`  
**Access:** Private (Owner role)  
**Description:** Create new salon and link to owner [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Request:**
```javascript
{
  "name": "StyleHub Men's Salon",
  "description": "Premium men's grooming services",
  "location": {
    "coordinates": [72.8777, 19.0760],  // [longitude, latitude]
    "address": "123 Main St, Andheri West",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400058"
  },
  "phone": "+919876543210",
  "email": "info@stylehub.com",
  "hours": {
    "monday": { "open": "09:00", "close": "21:00", "closed": false },
    // ... all 7 days
  },
  "services": [
    {
      "name": "Haircut",
      "price": 300,
      "duration": 30,
      "description": "Classic haircut",
      "category": "Hair",
      "isPrimary": true,
      "isUpsell": false
    }
  ],
  "images": ["https://...", "https://..."],
  "totalBarbers": 4,
  "activeBarbers": 3,
  "averageServiceDuration": 30
}
```

**Response (201):**
```javascript
{
  "success": true,
  "message": "Salon created successfully",
  "salon": {
    "_id": "...",
    "name": "StyleHub Men's Salon"
  }
}
```

**Notes:**
- Automatically sets `ownerId` to `req.user._id`
- Links salon to user's `salonId` field
- Sets `isActive: false` and `isVerified: false` (requires admin approval) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

#### **4.3.5 Update Salon**

**Endpoint:** `PUT /api/salons/:id`  
**Access:** Private (Owner of salon)  
**Description:** Update salon details [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Request:** (all fields optional)
```javascript
{
  "name": "StyleHub Premium",
  "description": "Updated description",
  "phone": "+919876543211",
  "email": "new@stylehub.com",
  "profileImage": "https://...",
  "images": ["https://...", "https://..."],
  "hours": { /* ... */ },
  "services": [ /* ... */ ],
  "isOpen": true,
  "totalBarbers": 5,
  "activeBarbers": 4,
  "busyMode": false,
  "type": "men",
  
  // Only allowed if locationEditEnabled = true
  "location": {
    "coordinates": [72.8888, 19.0770],
    "address": "New address",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400058"
  }
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Salon updated successfully",
  "salon": { /* updated salon */ }
}
```

**Permissions:**
- Location editing blocked unless `salon.locationEditEnabled === true` (admin-controlled)
- Owner can only update their own salons [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

#### **4.3.6 Get My Salons**

**Endpoint:** `GET /api/salons/my-salons`  
**Access:** Private (Owner role)  
**Description:** Get all salons owned by current user [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Response (200):**
```javascript
{
  "success": true,
  "count": 2,
  "salons": [
    { /* salon 1 */ },
    { /* salon 2 */ }
  ]
}
```

***

#### **4.3.7 Toggle Salon Status (Open/Close)**

**Endpoint:** `PATCH /api/salons/:salonId/toggle-status`  
**Access:** Private (Owner/Manager)  
**Description:** Quickly open/close salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Response (200):**
```javascript
{
  "success": true,
  "message": "Salon is now open",
  "isOpen": true
}
```

***

#### **4.3.8 Close Salon with Reason**

**Endpoint:** `PUT /api/salons/:id/close-with-reason`  
**Access:** Private (Owner)  
**Description:** Close salon with reason, notify customers in queue [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Request:**
```javascript
{
  "reason": "Emergency closure",
  "customReason": "Unexpected maintenance required"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Salon closed successfully",
  "queueSizeCancelled": 5,
  "notificationsSent": 5
}
```

**Side Effects:**
- Sets `isOpen: false`
- Cancels all pending bookings
- Sends FCM notifications to affected customers
- Logs closure in `salon.closureHistory` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

#### **4.3.9 Set Busy Mode**

**Endpoint:** `PUT /api/salons/:id/set-busy-mode`  
**Access:** Private (Owner/Manager)  
**Description:** Toggle busy mode (blocks online bookings, walk-ins only) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Request:**
```javascript
{
  "busyMode": true
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Busy mode enabled",
  "busyMode": true
}
```

***

#### **4.3.10 Service Management**

**Add Service:**  
`POST /api/salons/:id/services` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Update Service:**  
`PUT /api/salons/:id/services/:serviceId` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Delete Service:**  
`DELETE /api/salons/:id/services/:serviceId` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

#### **4.3.11 Get Salon Dashboard Stats**

**Endpoint:** `GET /api/salons/:salonId/dashboard` or `GET /api/dashboard/:salonId`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Get real-time dashboard statistics [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  
  // Simple dashboard metrics
  "customersServedYesterday": 18,
  "percentageChange": 12,  // % change from previous day
  "waitAccuracy": 85,      // % of wait time estimates within 10% margin
  "noShowRate": 5,         // % of scheduled bookings that didn't arrive
  "peakHours": "2:00 PM – 4:00 PM",
  
  // Complex dashboard metrics
  "inQueue": 3,
  "inService": 2,
  "activeBarbers": 3,
  "avgWait": 25,           // minutes
  "customersServed": 22,   // today
  "completedServices": 45, // today
  "walkInsToday": 15,
  "isOpen": true,
  "salonName": "StyleHub Men's Salon",
  "address": "Andheri, MH",
  "city": "Mumbai",
  "state": "MH",
  
  // Scheduled bookings
  "scheduledToday": 8,
  "scheduledPending": 3,
  "scheduledArrived": 4,
  "scheduledNoShow": 1,
  
  // Additional stats
  "avgServiceTime": 30,
  "queueTrend": "+2",      // Change from 1 hour ago
  "todayRevenue": null     // Future feature
}
```


***

#### **4.3.12 Get Queue Status for Closure**

**Endpoint:** `GET /api/salons/:id/queue-status`  
**Access:** Private (Owner)  
**Description:** Check current queue before closing salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Response (200):**
```javascript
{
  "success": true,
  "queueSize": 5,
  "inProgressCount": 2,
  "pendingCount": 3,
  "canClose": false,  // false if queue > 0
  "message": "5 customers currently in queue"
}
```

***

#### **4.3.13 Get Priority Count Today**

**Endpoint:** `GET /api/salons/:salonId/priority-count-today`  
**Access:** Private (Owner/Manager)  
**Description:** Check remaining priority insertions for today [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Response (200):**
```javascript
{
  "success": true,
  "used": 3,
  "limit": 5,
  "remaining": 2
}
```

***

#### **4.3.14 Update Salon Settings**

**Endpoint:** `PUT /api/salons/:id/settings`  
**Access:** Private (Owner)  
**Description:** Update account settings [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Request:**
```javascript
{
  "operatingMode": "normal",  // normal|busy|closed
  "autoAcceptBookings": true,
  "notificationPreferences": {
    "newBookings": true,
    "queueUpdates": true,
    "customerMessages": true,
    "promotions": false,
    "pushEnabled": true
  }
}
```

***

#### **4.3.15 Admin: Toggle Staff System**

**Endpoint:** `PUT /api/salons/:id/staff-system`  
**Access:** Private (Admin)  
**Description:** Enable/disable staff management feature for salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Request:**
```javascript
{
  "staffSystemEnabled": true
}
```

***

#### **4.3.16 Admin: Toggle Location Edit Permission**

**Endpoint:** `PUT /api/salons/:id/toggle-location-edit`  
**Access:** Private (Admin)  
**Description:** Allow/block salon from editing location [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

### **4.4 BOOKING & QUEUE APIS**

#### **4.4.1 Join Queue (Immediate Booking)**

**Endpoint:** `POST /api/bookings/join-queue`  
**Access:** Private (Customer)  
**Description:** Join salon queue immediately [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Request:**
```javascript
{
  "salonId": "60d5f484f1b2c72d88f8a1b2",
  "services": [
    {
      "serviceId": "60d5f484f1b2c72d88f8a1b3",
      "name": "Haircut",
      "price": 300,
      "duration": 30
    },
    {
      "serviceId": "60d5f484f1b2c72d88f8a1b4",
      "name": "Beard Trim",
      "price": 150,
      "duration": 15
    }
  ],
  "notes": "Please use trimmer #2",
  "paymentMethod": "cash"  // cash|card|upi|wallet
}
```

**Response (201):**
```javascript
{
  "success": true,
  "message": "Successfully joined the queue",
  "booking": {
    "_id": "...",
    "userId": "...",
    "salonId": {
      "_id": "...",
      "name": "StyleHub Men's Salon",
      "location": { "address": "...", "city": "Mumbai", "phone": "+91..." }
    },
    "bookingType": "immediate",
    "services": [ /* ... */ ],
    "totalPrice": 450,
    "totalDuration": 45,
    "queuePosition": 4,
    "estimatedStartTime": "2026-01-24T06:45:00.000Z",
    "estimatedEndTime": "2026-01-24T07:30:00.000Z",
    "status": "pending",
    "joinedAt": "2026-01-24T06:00:00.000Z",
    "paymentMethod": "cash",
    "paymentStatus": "pending"
  }
}
```

**Side Effects:**
- Increments `user.totalBookings`
- Updates `salon.currentQueueSize`
- Sends FCM notification to salon owner
- Sends FCM notification to customer (queue position)
- Emits Socket.IO event `queue_updated` to salon room
- Broadcasts personalized wait time update to all clients watching salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Validation:**
- Checks if salon `isOpen`
- Checks if user already has active booking at salon
- Validates services exist in salon's service list

***

#### **4.4.2 Schedule Booking**

**Endpoint:** `POST /api/bookings/schedule`  
**Access:** Private (Customer)  
**Description:** Book appointment for future date/time [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Request:**
```javascript
{
  "salonId": "...",
  "services": [ /* same as 4.4.1 */ ],
  "scheduledDate": "2026-01-25",  // YYYY-MM-DD
  "scheduledTime": "14:30",       // HH:mm
  "notes": "First time customer",
  "paymentMethod": "cash"
}
```

**Response (201):**
```javascript
{
  "success": true,
  "message": "Booking scheduled successfully",
  "booking": {
    "_id": "...",
    "bookingType": "scheduled",
    "scheduledDate": "2026-01-25T00:00:00.000Z",
    "scheduledTime": "14:30",
    "queuePosition": 0,  // Not in queue until arrived
    "status": "pending",
    "arrived": false,
    // ... rest same as 4.4.1
  }
}
```

**Validation:**
- Cannot schedule in the past
- Checks for duplicate scheduled booking (same day, same salon) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

#### **4.4.3 Get Available Time Slots**

**Endpoint:** `GET /api/bookings/available-slots/:salonId?date=2026-01-25`  
**Access:** Private  
**Description:** Get available 30-minute slots for a date [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "slots": [
    { "time": "09:00", "available": true },
    { "time": "09:30", "available": true },
    { "time": "10:00", "available": false },
    { "time": "10:30", "available": true },
    // ...
    { "time": "21:00", "available": true }
  ],
  "dayHours": {
    "open": "09:00",
    "close": "21:00"
  }
}
```

**Logic:**
- Reads salon's operating hours for that day
- Generates 30-minute slots
- Marks slots as unavailable if already booked [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

#### **4.4.4 Get My Bookings**

**Endpoint:** `GET /api/bookings/my-bookings`  
**Access:** Private (Customer)  
**Description:** Get all bookings for current user [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Query Parameters:**
```
status=pending      # Filter: pending|in-progress|completed|cancelled
limit=20
page=1
```

**Response (200):**
```javascript
{
  "success": true,
  "count": 15,
  "bookings": [
    {
      "_id": "...",
      "salonId": {
        "_id": "...",
        "name": "StyleHub Men's Salon",
        "location": { "city": "Mumbai", "address": "..." },
        "phone": "+91..."
      },
      "services": [ /* ... */ ],
      "totalPrice": 450,
      "queuePosition": 4,
      "status": "pending",
      "bookingType": "immediate",
      "joinedAt": "2026-01-24T06:00:00.000Z",
      "estimatedStartTime": "2026-01-24T06:45:00.000Z"
    }
  ]
}
```


***

#### **4.4.5 Get Booking by ID**

**Endpoint:** `GET /api/bookings/:id`  
**Access:** Private  
**Description:** Get single booking details [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "booking": {
    "_id": "...",
    "userId": { "_id": "...", "name": "John Doe", "phone": "+91..." },
    "salonId": { /* populated */ },
    "assignedStaffId": { "_id": "...", "name": "Barber Name" },
    "services": [ /* ... */ ],
    "totalPrice": 450,
    "totalDuration": 45,
    "queuePosition": 4,
    "status": "pending",
    "joinedAt": "...",
    "startedAt": null,
    "completedAt": null,
    "rating": null,
    "review": null
  }
}
```

***

#### **4.4.6 Get Salon Bookings (Owner View)**

**Endpoint:** `GET /api/bookings/salon/:salonId`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Get all bookings for salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Query Parameters:**
```
status=pending      # Filter by status
date=2026-01-24     # Filter by date
limit=50
page=1
```

**Response:** Similar to 4.4.4 but includes all customers' bookings

***

#### **4.4.7 Get Staff Bookings**

**Endpoint:** `GET /api/bookings/staff/:staffId`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Get bookings assigned to specific staff member [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

#### **4.4.8 Cancel Booking**

**Endpoint:** `PUT /api/bookings/:id/cancel`  
**Access:** Private (Customer or Salon Owner)  
**Description:** Cancel booking [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Request:**
```javascript
{
  "reason": "Cannot make it on time"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Booking cancelled successfully",
  "booking": {
    "_id": "...",
    "status": "cancelled",
    "cancellationReason": "Cannot make it on time"
  }
}
```

**Side Effects:**
- Reorders queue positions for remaining bookings
- Sends FCM notification to customer (if cancelled by owner)
- Emits Socket.IO event `queue_updated`
- Broadcasts updated wait times [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

#### **4.4.9 Start Booking**

**Endpoint:** `PUT /api/bookings/:id/start`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Mark service as started [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "booking": {
    "_id": "...",
    "status": "in-progress",
    "startedAt": "2026-01-24T06:45:00.000Z"
  }
}
```

**Side Effects:**
- Sets `startedAt` timestamp
- Sends FCM notification to customer [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

#### **4.4.10 Complete Booking**

**Endpoint:** `PUT /api/bookings/:id/complete`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Mark service as completed [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "booking": {
    "_id": "...",
    "status": "completed",
    "completedAt": "2026-01-24T07:30:00.000Z"
  }
}
```

**Side Effects:**
- Sets `completedAt` timestamp
- Increments `user.totalBookings`
- Sends FCM notification to customer [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

#### **4.4.11 Complete Payment**

**Endpoint:** `PUT /api/bookings/:id/complete-payment`  
**Access:** Private (Owner/Manager)  
**Description:** Mark payment as paid [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Request:**
```javascript
{
  "paymentMethod": "cash",  // cash|card|upi|wallet
  "paidAmount": 450,
  "transactionId": "TXN123456"  // Optional
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Payment completed",
  "booking": {
    "_id": "...",
    "paymentStatus": "paid",
    "paidAmount": 450,
    "paymentDate": "2026-01-24T07:30:00.000Z",
    "transactionId": "TXN123456"
  }
}
```

***

#### **4.4.12 Assign Staff to Booking**

**Endpoint:** `PUT /api/bookings/:id/assign-staff`  
**Access:** Private (Owner/Manager)  
**Description:** Assign staff member to booking [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Request:**
```javascript
{
  "staffId": "60d5f484f1b2c72d88f8a1b5"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Staff assigned successfully",
  "booking": {
    "_id": "...",
    "assignedStaffId": {
      "_id": "60d5f484f1b2c72d88f8a1b5",
      "name": "Barber John",
      "role": "barber"
    }
  }
}
```

***

### **4.5 SCHEDULED BOOKING APIS**

#### **4.5.1 Get Today's Scheduled Bookings**

**Endpoint:** `GET /api/scheduled-bookings/:salonId/today`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Get all scheduled bookings for today [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Response (200):**
```javascript
{
  "success": true,
  "count": 8,
  "bookings": [
    {
      "_id": "...",
      "userId": { "name": "Jane Doe", "phone": "+91..." },
      "scheduledTime": "14:30",
      "services": [ /* ... */ ],
      "totalPrice": 600,
      "status": "pending",
      "arrived": false,
      "arrivedAt": null
    }
  ]
}
```


***

#### **4.5.2 Get Tomorrow's Scheduled Bookings**

**Endpoint:** `GET /api/scheduled-bookings/:salonId/tomorrow`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Get tomorrow's scheduled bookings [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

***

#### **4.5.3 Mark Scheduled Booking as Arrived**

**Endpoint:** `PATCH /api/scheduled-bookings/:bookingId/mark-arrived`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Customer arrived, add to queue [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Response (200):**
```javascript
{
  "success": true,
  "message": "Scheduled booking marked as arrived and added to queue",
  "booking": {
    "_id": "...",
    "arrived": true,
    "arrivedAt": "2026-01-24T14:25:00.000Z",
    "queuePosition": 3,  // Assigned queue position
    "status": "pending"
  }
}
```

**Side Effects:**
- Sets `arrived: true`, `arrivedAt`, `joinedAt`
- Assigns queue position (end of current queue + 1)
- Reorders queue to remove gaps
- Emits Socket.IO event `queue_updated`
- Broadcasts wait time update [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

***

#### **4.5.4 Mark as No-Show**

**Endpoint:** `PATCH /api/scheduled-bookings/:bookingId/no-show`  
**Access:** Private (Owner/Manager)  
**Description:** Customer didn't arrive [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Request:**
```javascript
{
  "reason": "Customer did not arrive"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Booking marked as no-show",
  "booking": {
    "_id": "...",
    "status": "no-show"
  }
}
```


***

### **4.6 STAFF MANAGEMENT APIS**

#### **4.6.1 Get Staff by Salon**

**Endpoint:** `GET /api/staff/salon/:salonId`  
**Access:** Private (Owner/Manager)  
**Description:** Get all staff members for salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "count": 5,
  "staff": [
    {
      "_id": "...",
      "name": "Barber John",
      "email": "john@stylehub.com",
      "phone": "+919876543210",
      "profileImage": "https://...",
      "role": "barber",
      "specialization": ["haircut", "beard"],
      "workingHours": { /* ... */ },
      "commissionType": "percentage",
      "commissionRate": 40,
      "salary": 25000,
      "stats": {
        "totalBookings": 120,
        "completedBookings": 115,
        "totalRevenue": 54000,
        "totalCommission": 21600,
        "averageRating": 4.7,
        "totalReviews": 98
      },
      "isActive": true,
      "isAvailable": true,
      "joinDate": "2025-06-15T00:00:00.000Z"
    }
  ]
}
```


***

#### **4.6.2 Get Staff by ID**

**Endpoint:** `GET /api/staff/:id`  
**Access:** Private (Owner/Manager)  
**Description:** Get single staff member details [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.6.3 Add Staff**

**Endpoint:** `POST /api/staff`  
**Access:** Private (Owner/Manager)  
**Description:** Add new staff member [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "name": "Barber Mike",
  "email": "mike@stylehub.com",
  "phone": "+919876543211",
  "salonId": "60d5f484f1b2c72d88f8a1b2",
  "role": "barber",  // barber|stylist|manager|receptionist
  "specialization": ["haircut", "coloring"],
  "workingHours": {
    "monday": { "isWorking": true, "start": "09:00", "end": "18:00" },
    // ... all 7 days
  },
  "commissionType": "percentage",  // percentage|fixed|none
  "commissionRate": 40,             // 40% or ₹100 per service
  "salary": 25000
}
```

**Response (201):**
```javascript
{
  "success": true,
  "message": "Staff added successfully",
  "staff": { /* created staff object */ }
}
```


***

#### **4.6.4 Update Staff**

**Endpoint:** `PUT /api/staff/:id`  
**Access:** Private (Owner/Manager)  
**Description:** Update staff details [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.6.5 Delete Staff**

**Endpoint:** `DELETE /api/staff/:id`  
**Access:** Private (Owner/Manager)  
**Description:** Soft delete staff (marks `isActive: false`) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.6.6 Bulk Delete Staff**

**Endpoint:** `POST /api/staff/bulk-delete`  
**Access:** Private (Owner/Manager)  
**Description:** Delete multiple staff members [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "staffIds": ["id1", "id2", "id3"]
}
```

***

#### **4.6.7 Bulk Update Status**

**Endpoint:** `PUT /api/staff/bulk-status`  
**Access:** Private (Owner/Manager)  
**Description:** Enable/disable multiple staff [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "staffIds": ["id1", "id2"],
  "isActive": false
}
```

***

#### **4.6.8 Toggle Availability**

**Endpoint:** `PUT /api/staff/:id/availability`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Set staff as available/unavailable for new bookings [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "isAvailable": false
}
```

***

#### **4.6.9 Check Staff Availability**

**Endpoint:** `GET /api/staff/:id/availability`  
**Access:** Private  
**Description:** Check if staff is currently available [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "staff": {
    "_id": "...",
    "name": "Barber John",
    "isAvailable": true,
    "currentBookings": 2,
    "nextAvailable": "2026-01-24T08:00:00.000Z"
  }
}
```

***

#### **4.6.10 Get Staff Performance**

**Endpoint:** `GET /api/staff/:id/performance`  
**Access:** Private (Owner/Manager)  
**Description:** Get detailed performance metrics [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
startDate=2026-01-01
endDate=2026-01-31
```

**Response (200):**
```javascript
{
  "success": true,
  "staff": { "name": "Barber John", "_id": "..." },
  "period": { "startDate": "2026-01-01", "endDate": "2026-01-31" },
  "metrics": {
    "totalBookings": 45,
    "completedBookings": 42,
    "cancelledBookings": 3,
    "totalRevenue": 18900,
    "totalCommission": 7560,
    "averageRating": 4.7,
    "totalReviews": 38,
    "avgServiceTime": 32,  // minutes
    "popularServices": [
      { "service": "Haircut", "count": 30 },
      { "service": "Beard Trim", "count": 15 }
    ]
  }
}
```


***

### **4.7 DASHBOARD & REPORTS APIS**

#### **4.7.1 Daily Summary Report**

**Endpoint:** `GET /api/reports/daily-summary`  
**Access:** Private (Owner/Manager)  
**Description:** Get today's summary for salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
salonId=60d5f484f1b2c72d88f8a1b2
date=2026-01-24  # Optional, defaults to today
```

**Response (200):**
```javascript
{
  "success": true,
  "date": "2026-01-24",
  "summary": {
    "totalBookings": 28,
    "completedBookings": 22,
    "cancelledBookings": 3,
    "noShowBookings": 2,
    "inProgressBookings": 1,
    "walkInBookings": 15,
    "scheduledBookings": 13,
    "totalRevenue": 9450,
    "avgServiceTime": 28,
    "peakHour": "14:00"
  }
}
```


***

#### **4.7.2 Staff Performance Report**

**Endpoint:** `GET /api/reports/staff-performance`  
**Access:** Private (Owner/Manager)  
**Description:** Compare staff performance [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
salonId=...
startDate=2026-01-01
endDate=2026-01-31
```

**Response (200):**
```javascript
{
  "success": true,
  "period": { "startDate": "2026-01-01", "endDate": "2026-01-31" },
  "staffPerformance": [
    {
      "staffId": "...",
      "name": "Barber John",
      "totalBookings": 120,
      "completedBookings": 115,
      "revenue": 54000,
      "commission": 21600,
      "rating": 4.7,
      "avgServiceTime": 30
    },
    // ... more staff
  ]
}
```


***

#### **4.7.3 Revenue Report**

**Endpoint:** `GET /api/reports/revenue`  
**Access:** Private (Owner/Manager)  
**Description:** Revenue breakdown [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
salonId=...
startDate=2026-01-01
endDate=2026-01-31
groupBy=day  # day|week|month
```

**Response (200):**
```javascript
{
  "success": true,
  "period": { "startDate": "2026-01-01", "endDate": "2026-01-31" },
  "totalRevenue": 125000,
  "breakdown": [
    { "date": "2026-01-01", "revenue": 4200, "bookings": 18 },
    { "date": "2026-01-02", "revenue": 3800, "bookings": 16 },
    // ...
  ],
  "topServices": [
    { "service": "Haircut", "revenue": 60000, "count": 200 },
    { "service": "Beard Trim", "revenue": 25000, "count": 167 }
  ]
}
```


***

### **4.8 REVIEW APIS**

#### **4.8.1 Submit Review**

**Endpoint:** `POST /api/reviews/booking/:bookingId`  
**Access:** Private (Customer)  
**Description:** Rate and review completed booking [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Request:**
```javascript
{
  "rating": 5,  // 1-5 required
  "review": "Excellent service! Will come again."  // Optional
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Review submitted successfully",
  "booking": {
    "_id": "...",
    "rating": 5,
    "review": "Excellent service! Will come again.",
    "reviewedAt": "2026-01-24T08:00:00.000Z"
  }
}
```

**Side Effects:**
- Updates `salon.averageRating` and `salon.totalReviews`
- If booking had `assignedStaffId`, updates staff rating [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Validation:**
- Only completed bookings can be reviewed
- Rating between 1-5
- User must own the booking
- Can only review once (can update with PUT)

***

#### **4.8.2 Get Salon Reviews**

**Endpoint:** `GET /api/reviews/salon/:salonId`  
**Access:** Public  
**Description:** Get all reviews for salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Query Parameters:**
```
page=1
limit=10
```

**Response (200):**
```javascript
{
  "success": true,
  "count": 10,
  "total": 128,
  "page": 1,
  "pages": 13,
  "reviews": [
    {
      "_id": "...",
      "userId": { "name": "John Doe", "phone": "+91..." },
      "rating": 5,
      "review": "Great service!",
      "reviewedAt": "2026-01-24T08:00:00.000Z",
      "services": [ { "name": "Haircut", "price": 300 } ],
      "totalPrice": 300
    }
  ],
  "ratingBreakdown": [
    { "_id": 5, "count": 85 },
    { "_id": 4, "count": 30 },
    { "_id": 3, "count": 10 },
    { "_id": 2, "count": 2 },
    { "_id": 1, "count": 1 }
  ]
}
```


***

#### **4.8.3 Get My Reviews**

**Endpoint:** `GET /api/reviews/my-reviews`  
**Access:** Private (Customer)  
**Description:** Get all reviews written by current user [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

#### **4.8.4 Update Review**

**Endpoint:** `PUT /api/reviews/booking/:bookingId`  
**Access:** Private (Customer)  
**Description:** Edit existing review [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

### **4.9 FAVORITES APIS**

#### **4.9.1 Get Favorites**

**Endpoint:** `GET /api/favorites`  
**Access:** Private (Customer)  
**Description:** Get user's favorite salons [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "count": 3,
  "favorites": [
    {
      "_id": "...",
      "name": "StyleHub Men's Salon",
      "location": { "city": "Mumbai", "address": "..." },
      "averageRating": 4.5,
      "totalReviews": 128,
      "profileImage": "https://..."
    }
  ]
}
```


***

#### **4.9.2 Add to Favorites**

**Endpoint:** `POST /api/favorites/:salonId`  
**Access:** Private (Customer)  
**Description:** Add salon to favorites [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "message": "Added to favorites"
}
```


***

#### **4.9.3 Remove from Favorites**

**Endpoint:** `DELETE /api/favorites/:salonId`  
**Access:** Private (Customer)  
**Description:** Remove salon from favorites [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.9.4 Check if Favorite**

**Endpoint:** `GET /api/favorites/check/:salonId`  
**Access:** Private (Customer)  
**Description:** Check if salon is in favorites [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "isFavorite": true
}
```

***

### **4.10 ANALYTICS APIS**

#### **4.10.1 Get Salon Analytics**

**Endpoint:** `GET /api/analytics/salon/:salonId`  
**Access:** Private (Owner)  
**Description:** Get analytics for salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
period=7d  # 24h|7d|30d
```

**Response (200):**
```javascript
{
  "success": true,
  "analytics": {
    "overview": {
      "totalBookings": 156,
      "completedBookings": 142,
      "cancelledBookings": 12,
      "totalRevenue": 63600,
      "averageRating": 4.6
    },
    "popularServices": [
      { "name": "Haircut", "count": 95 },
      { "name": "Beard Trim", "count": 78 },
      { "name": "Hair Coloring", "count": 32 }
    ],
    "dailyStats": [
      { "_id": "2026-01-18", "bookings": 22, "revenue": 9240 },
      { "_id": "2026-01-19", "bookings": 20, "revenue": 8400 },
      // ... last 7 days
    ]
  }
}
```


***

### **4.11 ADMIN APIS**

#### **4.11.1 Get Platform Statistics**

**Endpoint:** `GET /api/admin/statistics`  
**Access:** Private (Admin)  
**Description:** Platform-wide statistics [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 12458,
      "totalSalons": 324,
      "totalBookings": 45678,
      "activeSalons": 298,
      "activeUsers": 8932  // Active in last 30 days
    },
    "revenue": {
      "total": 12456789,
      "completedBookings": 42156
    },
    "topCities": [
      { "city": "Mumbai", "bookingCount": 15678 },
      { "city": "Delhi", "bookingCount": 12345 },
      { "city": "Bangalore", "bookingCount": 9876 }
    ],
    "topSalons": [
      {
        "salonId": "...",
        "salonName": "StyleHub Premium",
        "city": "Mumbai",
        "totalRevenue": 456789,
        "bookingCount": 1245
      }
    ]
  }
}
```


***

#### **4.11.2 Get Users**

**Endpoint:** `GET /api/admin/users`  
**Access:** Private (Admin)  
**Description:** List all users with filtering [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
page=1
limit=20
search=John             # Search name/phone/email
role=customer           # Filter by role
isActive=true           # Filter by active status
```

**Response (200):**
```javascript
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "...",
        "name": "John Doe",
        "phone": "+919876543210",
        "email": "john@example.com",
        "role": "customer",
        "isActive": true,
        "totalBookings": 12,
        "loyaltyPoints": 150,
        "createdAt": "2025-06-15T10:30:00.000Z",
        "lastLogin": "2026-01-24T05:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 623,
      "totalUsers": 12458,
      "limit": 20
    }
  }
}
```


***

#### **4.11.3 Get User Details**

**Endpoint:** `GET /api/admin/users/:userId`  
**Access:** Private (Admin)  
**Description:** Get detailed user information [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "data": {
    "user": { /* full user object */ },
    "stats": {
      "totalBookings": 45,
      "completedBookings": 42,
      "cancelledBookings": 3,
      "totalSpent": 18900
    }
  }
}
```


***

#### **4.11.4 Soft Delete User**

**Endpoint:** `DELETE /api/admin/users/:userId`  
**Access:** Private (Admin)  
**Description:** Deactivate user account and cancel active bookings [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "reason": "Violating terms of service"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "userId": "...",
    "cancelledBookings": 2
  }
}
```

**Side Effects:**
- Sets `isActive: false`
- Anonymizes name to `[Deleted User] <userId>`
- Clears email and FCM token
- Cancels all active bookings
- Logs action to AdminAuditLog [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.11.5 Restore User**

**Endpoint:** `PATCH /api/admin/users/:userId/restore`  
**Access:** Private (Admin)  
**Description:** Reactivate deleted user account [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.11.6 Get Cities**

**Endpoint:** `GET /api/admin/salons/cities`  
**Access:** Private (Admin)  
**Description:** Get list of all cities with active salons [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "cities": ["Ahmedabad", "Bangalore", "Chennai", "Delhi", "Mumbai", "Pune"]
}
```

***

#### **4.11.7 Get Salons**

**Endpoint:** `GET /api/admin/salons`  
**Access:** Private (Admin)  
**Description:** List all salons with filtering [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
page=1
limit=20
city=Mumbai
verified=true           # Filter by verification status
status=active           # active|deleted
search=StyleHub         # Search name/city/address
```

**Response (200):**
```javascript
{
  "success": true,
  "salons": [
    {
      "_id": "...",
      "name": "StyleHub Men's Salon",
      "city": "Mumbai",
      "address": "123 Main St, Andheri",
      "phone": "+919876543210",
      "email": "info@stylehub.com",
      "logo": "https://...",
      "isVerified": true,
      "ownerName": "Owner Name",
      "totalBookings": 1245,
      "rating": 4.5,
      "staffCount": 4,
      "createdAt": "2025-06-15T10:30:00.000Z",
      "disabled": false,
      "deletedAt": null
    }
  ],
  "totalPages": 17,
  "total": 324,
  "currentPage": 1
}
```


***

#### **4.11.8 Get Salon Details**

**Endpoint:** `GET /api/admin/salons/:salonId`  
**Access:** Private (Admin)  
**Description:** Get detailed salon information [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "salon": { /* full salon object */ },
  "stats": {
    "totalBookings": 1245,
    "completedBookings": 1180,
    "totalRevenue": 456789
  }
}
```


***

#### **4.11.9 Get Salon Queue**

**Endpoint:** `GET /api/admin/salons/:salonId/queue`  
**Access:** Private (Admin)  
**Description:** View current queue for salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "queue": [
    {
      "_id": "...",
      "customerName": "John Doe",
      "serviceName": "Haircut",
      "status": "pending",
      "createdAt": "2026-01-24T06:00:00.000Z"
    }
  ]
}
```


***

#### **4.11.10 Verify Salon**

**Endpoint:** `PATCH /api/admin/salons/:salonId/verify`  
**Access:** Private (Admin)  
**Description:** Verify or unverify salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "verified": true,
  "notes": "Documents verified, salon inspected"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Salon verified successfully",
  "data": {
    "salonId": "...",
    "isVerified": true
  }
}
```

**Side Effects:**
- Sets `isVerified` and `verificationMeta` fields
- Logs action to AdminAuditLog [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.11.11 Disable Salon**

**Endpoint:** `PATCH /api/admin/salons/:salonId/disable`  
**Access:** Private (Admin)  
**Description:** Disable salon (blocks new bookings) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "reason": "Multiple customer complaints"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Salon disabled successfully",
  "data": {
    "salonId": "...",
    "isActive": false,
    "currentQueueSize": 0
  }
}
```

**Side Effects:**
- Sets `isActive: false` and `isOpen: false`
- Logs action to AdminAuditLog [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.11.12 Enable Salon**

**Endpoint:** `PATCH /api/admin/salons/:salonId/enable`  
**Access:** Private (Admin)  
**Description:** Re-enable disabled salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.11.13 Get Bookings**

**Endpoint:** `GET /api/admin/bookings`  
**Access:** Private (Admin)  
**Description:** Monitor all bookings across platform [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
page=1
limit=20
status=pending
salonId=...
startDate=2026-01-01
endDate=2026-01-31
```

***

#### **4.11.14 Get Booking Details**

**Endpoint:** `GET /api/admin/bookings/:bookingId`  
**Access:** Private (Admin)  
**Description:** Get detailed booking information [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.11.15 Get Audit Logs**

**Endpoint:** `GET /api/admin/audit-logs`  
**Access:** Private (Admin)  
**Description:** View admin activity logs [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
page=1
limit=50
adminId=...            # Filter by admin who performed action
actionType=user_soft_delete
entityType=user        # user|salon|booking|system
startDate=2026-01-01
endDate=2026-01-31
```

**Response (200):**
```javascript
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "...",
        "adminId": { "name": "Admin User", "email": "admin@lynin.com" },
        "adminName": "Admin User",
        "adminEmail": "admin@lynin.com",
        "actionType": "user_soft_delete",
        "entityType": "user",
        "entityId": "...",
        "previousState": { "isActive": true },
        "newState": { "isActive": false },
        "reason": "Violating terms of service",
        "ipAddress": "103.45.67.89",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2026-01-24T06:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 45,
      "totalLogs": 2234,
      "limit": 50
    }
  }
}
```


***

### **4.12 FAQ APIS**

#### **4.12.1 Get All FAQs**

**Endpoint:** `GET /api/faqs`  
**Access:** Public  
**Description:** Get cached FAQs grouped by category [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Query Parameters:**
```
category=bookings      # Optional filter
search=cancel          # Optional text search
```

**Response (200):**
```javascript
{
  "success": true,
  "cached": true,  // true if served from cache
  "faqs": {
    "general": [
      {
        "_id": "...",
        "question": "What is Lynin?",
        "answer": "Lynin is a salon booking platform...",
        "category": "general",
        "order": 1,
        "tags": ["platform", "intro"],
        "views": 1245,
        "helpful": 890,
        "notHelpful": 12
      }
    ],
    "bookings": [ /* ... */ ],
    "payments": [ /* ... */ ]
  }
}
```

**Caching:**
- Results cached for 24 hours
- Cache cleared when FAQs updated via admin [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.12.2 Increment FAQ View Count**

**Endpoint:** `POST /api/faqs/:id/view`  
**Access:** Public  
**Description:** Track FAQ view analytics [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.12.3 Submit FAQ Feedback**

**Endpoint:** `POST /api/faqs/:id/feedback`  
**Access:** Public  
**Description:** Mark FAQ as helpful or not helpful [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "helpful": true  // or false
}
```

***

#### **4.12.4 Create FAQ (Admin)**

**Endpoint:** `POST /api/faqs`  
**Access:** Private (Admin)  
**Description:** Add new FAQ [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "question": "How do I cancel a booking?",
  "answer": "Go to My Bookings and tap Cancel...",
  "category": "bookings",
  "order": 5,
  "tags": ["cancel", "bookings"]
}
```

***

#### **4.12.5 Update FAQ (Admin)**

**Endpoint:** `PUT /api/faqs/:id`  
**Access:** Private (Admin)  
**Description:** Edit existing FAQ [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.12.6 Delete FAQ (Admin)**

**Endpoint:** `DELETE /api/faqs/:id`  
**Access:** Private (Admin)  
**Description:** Remove FAQ [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

### **4.13 FEATURE FLAGS & APP INFO APIS**

#### **4.13.1 Get Feature Flags**

**Endpoint:** `GET /api/feature-flags`  
**Access:** Public  
**Description:** Get live chat configuration [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "cached": true,
  "featureFlags": {
    "isLiveChatEnabled": true,
    "tawkToScript": "https://embed.tawk.to/..."
  }
}
```

**Caching:** 24-hour cache [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.13.2 Update Feature Flags (Admin)**

**Endpoint:** `PUT /api/feature-flags`  
**Access:** Private (Admin)  
**Description:** Enable/disable live chat [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Request:**
```javascript
{
  "isLiveChatEnabled": true,
  "tawkToScript": "https://embed.tawk.to/..."
}
```

***

#### **4.13.3 Get App Info**

**Endpoint:** `GET /api/app-info`  
**Access:** Public  
**Description:** Get app metadata (privacy policy URLs, social media, licenses) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "cached": true,
  "appInfo": {
    "_id": "...",
    "appName": "Lynin",
    "appDescription": "Smart salon booking platform",
    "appLogo": "https://...",
    "companyName": "Lynin Technologies",
    "yearOfLaunch": 2025,
    "websiteUrl": "https://lynin.com",
    "privacyPolicyUrl": "https://lynin.com/privacy",
    "termsAndConditionsUrl": "https://lynin.com/terms",
    "refundPolicyUrl": "https://lynin.com/refund",
    "supportEmail": "support@lynin.com",
    "supportPhone": "+919876543210",
    "socialMedia": {
      "facebook": "https://facebook.com/lynin",
      "instagram": "https://instagram.com/lynin",
      "twitter": "https://twitter.com/lynin",
      "linkedin": "https://linkedin.com/company/lynin",
      "youtube": "https://youtube.com/lynin"
    },
    "openSourceLicenses": [
      {
        "name": "Express.js",
        "license": "MIT",
        "url": "https://github.com/expressjs/express",
        "version": "4.18.2"
      }
    ],
    "isActive": true
  }
}
```

**Caching:** 24-hour cache [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **4.13.4 Update App Info (Admin)**

**Endpoint:** `PUT /api/app-info`  
**Access:** Private (Admin)  
**Description:** Update app metadata [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

### **4.14 QUEUE MANAGEMENT APIS**

#### **4.14.1 Get Queue by Salon**

**Endpoint:** `GET /api/queue/:salonId`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Get live queue sorted by position [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "count": 5,
  "queue": [
    {
      "_id": "...",
      "customerName": "John Doe",          // or "Token #0001"
      "customerPhone": "+919876543210",    // or "N/A"
      "walkInToken": null,                 // or "0001"
      "services": [ { "name": "Haircut", "price": 300, "duration": 30 } ],
      "totalPrice": 300,
      "totalDuration": 30,
      "queuePosition": 1,
      "status": "pending",
      "arrived": true,
      "arrivedAt": "2026-01-24T06:00:00.000Z",
      "joinedAt": "2026-01-24T06:00:00.000Z",
      "estimatedStartTime": "2026-01-24T06:05:00.000Z"
    }
  ]
}
```


***

#### **4.14.2 Add Walk-In to Queue**

**Endpoint:** `POST /api/queue/:salonId/walk-in`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Add walk-in customer to queue [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Request:**
```javascript
{
  "name": "Walk-in Customer",  // Optional
  "phone": "+919876543210",    // Optional
  "services": [
    {
      "name": "Haircut",
      "price": 300,
      "duration": 30
    }
  ]
}
```

**Response (201):**
```javascript
{
  "success": true,
  "message": "Walk-in customer added with account created/linked",  // or "Walk-in added with token #0001"
  "booking": {
    "_id": "...",
    "userId": "...",                // null if anonymous
    "customerName": "Walk-in Customer",  // or "Token #0001"
    "customerPhone": "+919876543210",    // or "N/A"
    "walkInToken": null,            // or "0001"
    "services": [ /* ... */ ],
    "totalPrice": 300,
    "totalDuration": 30,
    "queuePosition": 6,
    "status": "pending",
    "arrived": true,
    "arrivedAt": "2026-01-24T06:10:00.000Z",
    "bookingType": "immediate"
  }
}
```

**Logic:**
1. **If phone provided:** Creates/links user account
2. **If no phone/name:** Generates 4-digit token (0001, 0002, etc.) resets daily
3. Automatically marks as `arrived: true`
4. Assigns queue position at end of queue [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

#### **4.14.3 Start Service**

**Endpoint:** `POST /api/queue/:salonId/start/:bookingId`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Mark service as started (status: in-progress) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "message": "Service started",
  "booking": {
    "_id": "...",
    "status": "in-progress",
    "startedAt": "2026-01-24T06:15:00.000Z"
  }
}
```

**Side Effects:**
- Sends FCM notification to customer
- Emits Socket.IO event `service_started` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

#### **4.14.4 Start Priority Service**

**Endpoint:** `POST /api/queue/:salonId/start-priority/:bookingId`  
**Access:** Private (Owner/Manager only)  
**Description:** Start service as priority (skip queue) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Request:**
```javascript
{
  "reason": "Senior citizen"  // Required
  // Options: "Senior citizen", "Medical urgency", "Child", "System exception"
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Priority service started",
  "booking": {
    "_id": "...",
    "status": "in-progress",
    "startedAt": "2026-01-24T06:15:00.000Z",
    "queuePosition": 1,  // Moved to front
    "originalPosition": 5
  }
}
```


**Side Effects:**
- Logs to PriorityLog collection
- Moves booking to front of queue
- Sends FCM notification to customer with priority alert
- Emits Socket.IO event `priority_started`
- Reorders all other queue positions [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Daily Limit:** Maximum 5 priority insertions per day per salon (configurable via `salon.priorityLimitPerDay`)

***

#### **4.14.5 Complete Service**

**Endpoint:** `POST /api/queue/:salonId/complete/:bookingId`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Mark service as completed, auto-mark payment as paid [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "message": "Service completed and payment recorded",
  "booking": {
    "_id": "...",
    "status": "completed",
    "completedAt": "2026-01-24T06:45:00.000Z",
    "paymentStatus": "paid",
    "paidAmount": 450
  },
  "pointsEarned": 45  // 1 point per ₹10
}
```

**Side Effects:**
- Sets `status: 'completed'`, `completedAt`
- **Auto-marks payment:** `paymentStatus: 'paid'`, `paidAmount: totalPrice`, `paymentDate: now`
- Awards loyalty points (1 point per ₹10 spent) - only if `userId` exists
- Increments `user.totalBookings` and `user.loyaltyPoints`
- Removes from queue, reorders remaining bookings
- Sends FCM notification to customer (request review)
- Emits Socket.IO event `service_completed`
- Updates wait times for all clients [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

#### **4.14.6 Skip Booking**

**Endpoint:** `POST /api/queue/:salonId/skip/:bookingId`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Skip customer (move to back of queue) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Request:**
```javascript
{
  "reason": "Customer not ready"  // Optional
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Booking skipped",
  "booking": {
    "_id": "...",
    "status": "skipped",
    "queuePosition": 5,  // Moved to end
    "originalPosition": 1,
    "skippedAt": "2026-01-24T06:30:00.000Z",
    "skipReason": "Customer not ready"
  }
}
```

**Side Effects:**
- Sets `status: 'skipped'`, `skippedAt`, `originalPosition`
- Moves to end of queue
- Reorders remaining bookings
- Emits Socket.IO event `queue_updated` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

#### **4.14.7 Restore Skipped Booking**

**Endpoint:** `POST /api/queue/:salonId/restore-skipped/:bookingId`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Restore skipped booking to original position or end of queue [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Response (200):**
```javascript
{
  "success": true,
  "message": "Booking restored",
  "booking": {
    "_id": "...",
    "status": "pending",
    "queuePosition": 1  // Restored to original or end
  }
}
```


***

#### **4.14.8 Mark Customer Arrived**

**Endpoint:** `POST /api/queue/:salonId/arrived`  
**Access:** Private (Owner/Manager/Staff)  
**Description:** Mark scheduled booking customer as arrived [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

**Request:**
```javascript
{
  "bookingId": "...",           // Option 1: Direct booking ID
  "phoneLastFour": "3210"       // Option 2: Search by last 4 digits of phone
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Customer marked as arrived",
  "booking": {
    "_id": "...",
    "queuePosition": 4,
    "arrived": true,
    "arrivedAt": "2026-01-24T14:25:00.000Z"
  }
}
```

**Side Effects:**
- Sets `arrived: true`, `arrivedAt`
- Emits Socket.IO event `customer_arrived` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

### **4.15 SALON SETUP WIZARD APIS**

The setup wizard guides new salon owners through 4 steps: Profile → Hours → Services → Capacity [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

#### **4.15.1 Get Setup Status**

**Endpoint:** `GET /api/salon-setup/status`  
**Access:** Private (Owner)  
**Description:** Check current setup progress [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Response (200):**
```javascript
{
  "success": true,
  "setupCompleted": false,
  "currentStep": "profile",  // profile|hours|services|capacity|completed
  "salon": null              // or salon object if exists
}
```


***

#### **4.15.2 Save Profile Setup (Step 1)**

**Endpoint:** `POST /api/salon-setup/profile`  
**Access:** Private (Owner)  
**Description:** Create salon profile with location [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Request:**
```javascript
{
  "name": "StyleHub Men's Salon",
  "address": "123 Main St, Andheri West",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400058",
  "phone": "+919876543210",
  "email": "info@stylehub.com",
  "description": "Premium men's grooming",
  "longitude": 72.8777,  // Required
  "latitude": 19.0760,   // Required
  "images": ["https://...", "https://..."]
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Profile setup saved",
  "nextStep": "hours",
  "salon": {
    "_id": "...",
    "name": "StyleHub Men's Salon",
    "address": "123 Main St, Andheri West",
    "images": ["https://..."]
  }
}
```

**Side Effects:**
- Creates salon with `ownerId: req.user._id`
- Links salon to user: `user.salonId = salon._id`
- Updates `user.setupStep = 'hours'`
- Sets `salon.isActive: false`, `salon.isVerified: false` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

***

#### **4.15.3 Save Hours Setup (Step 2)**

**Endpoint:** `POST /api/salon-setup/hours`  
**Access:** Private (Owner)  
**Description:** Configure operating hours [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Request:**
```javascript
{
  "hours": {
    "monday": { "open": "09:00", "close": "21:00", "closed": false },
    "tuesday": { "open": "09:00", "close": "21:00", "closed": false },
    "wednesday": { "open": "09:00", "close": "21:00", "closed": false },
    "thursday": { "open": "09:00", "close": "21:00", "closed": false },
    "friday": { "open": "09:00", "close": "21:00", "closed": false },
    "saturday": { "open": "09:00", "close": "21:00", "closed": false },
    "sunday": { "open": "10:00", "close": "18:00", "closed": false }
  }
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Operating hours saved",
  "nextStep": "services"
}
```

**Side Effects:**
- Updates `salon.hours`
- Updates `user.setupStep = 'services'` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

***

#### **4.15.4 Save Services Setup (Step 3)**

**Endpoint:** `POST /api/salon-setup/services`  
**Access:** Private (Owner)  
**Description:** Add services with categories [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Request:**
```javascript
{
  "services": [
    {
      "name": "Classic Haircut",
      "price": 300,
      "duration": 30,
      "description": "Traditional men's haircut",
      "category": "Hair",        // Hair|Beard|Body|Add-on (required)
      "isPrimary": true,         // Show prominently
      "isUpsell": false          // Suggest during checkout
    },
    {
      "name": "Beard Trim",
      "price": 150,
      "duration": 15,
      "description": "Beard shaping and trimming",
      "category": "Beard",
      "isPrimary": true,
      "isUpsell": false
    },
    {
      "name": "Hair Coloring",
      "price": 800,
      "duration": 60,
      "category": "Hair",
      "isPrimary": false,
      "isUpsell": true
    }
  ]
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Services saved",
  "nextStep": "capacity",
  "servicesCount": 3
}
```

**Validation:**
- Each service must have `name`, `price`, `duration`, `category`
- Valid categories: `Hair`, `Beard`, `Body`, `Add-on`

**Side Effects:**
- Updates `salon.services`
- Updates `user.setupStep = 'capacity'` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

***

#### **4.15.5 Save Capacity Setup (Step 4)**

**Endpoint:** `POST /api/salon-setup/capacity`  
**Access:** Private (Owner)  
**Description:** Configure barber capacity [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Request:**
```javascript
{
  "totalBarbers": 4,
  "activeBarbers": 3,              // Optional, defaults to totalBarbers
  "averageServiceDuration": 30     // Optional, defaults to 30 minutes
}
```

**Response (200):**
```javascript
{
  "success": true,
  "message": "Capacity setup saved",
  "nextStep": "complete"
}
```

**Side Effects:**
- Updates `salon.totalBarbers`, `salon.activeBarbers`, `salon.averageServiceDuration`
- Updates `user.setupStep = 'completed'` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

***

#### **4.15.6 Complete Setup**

**Endpoint:** `POST /api/salon-setup/complete`  
**Access:** Private (Owner)  
**Description:** Finalize setup and activate salon [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

**Response (200):**
```javascript
{
  "success": true,
  "message": "Setup completed successfully!",
  "salon": {
    "_id": "...",
    "name": "StyleHub Men's Salon",
    "isActive": true,
    "isVerified": false  // Still needs admin verification
  }
}
```

**Validation:**
- Checks all steps completed (profile, hours, services, capacity)

**Side Effects:**
- Sets `user.setupCompleted = true`
- Sets `salon.isActive = true`
- Salon now visible in public search (but marked unverified) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/7bc40e4a-31ef-4145-9048-ff6d6644958a/paste-3.txt)

***

## **5. REAL-TIME FEATURES (SOCKET.IO)**

### **5.1 Connection & Authentication**

**Client Connection:**
```javascript
const socket = io('http://100.112.160.11:3000', {
  auth: {
    token: '<JWT_TOKEN>'  // Same JWT from REST API
  }
});
```

**Server Authentication:**
- Verifies JWT token on connection
- Sets `socket.userId` from decoded token
- Joins user to `user_<userId>` room [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

### **5.2 Room Management**

**Client Joins Salon Room:**
```javascript
socket.emit('join_salon', { salonId: '60d5f484f1b2c72d88f8a1b2' });
```

**Server Response:**
```javascript
socket.on('joined_salon', (data) => {
  console.log('Joined salon room:', data.salonId);
});
```

**Client Leaves Salon Room:**
```javascript
socket.emit('leave_salon', { salonId: '60d5f484f1b2c72d88f8a1b2' });
```

***

### **5.3 Real-Time Events**

#### **5.3.1 Queue Updated**

**Emitted When:**
- New booking created
- Booking cancelled
- Walk-in added
- Queue reordered
- Scheduled booking arrives

**Event:** `queue_updated`

**Payload:**
```javascript
{
  "salonId": "60d5f484f1b2c72d88f8a1b2",
  "queueSize": 5,
  "action": "new_booking" | "walk_in_added" | "booking_cancelled" | "scheduled_arrived"
}
```

**Client Usage:**
```javascript
socket.on('queue_updated', (data) => {
  console.log('Queue updated:', data);
  // Refresh queue list
  fetchQueue(data.salonId);
});
```

***

#### **5.3.2 Wait Time Updated**

**Emitted When:**
- Queue changes (booking added/removed/completed)
- Barber count changes
- Service started/completed

**Event:** `wait_time_updated`

**Payload (Personalized):**
```javascript
{
  "salonId": "60d5f484f1b2c72d88f8a1b2",
  "waitTime": {
    "waitMinutes": 45,
    "displayText": "~45 min wait",
    "queueLength": 3,
    "queuePosition": null,  // null if user not in queue, or 1, 2, 3...
    "status": "busy",       // available|busy|very-busy|full|closed
    "estimatedStartTime": "2026-01-24T07:15:00.000Z",
    "isInQueue": false,     // true if user is in queue
    "timestamp": 1737698700000
  },
  "timestamp": 1737698700000
}
```

**Key Feature:** Each socket receives **personalized wait time** based on their `userId`:
- **If user in queue:** Shows time until their turn (excludes people behind them)
- **If user not in queue:** Shows total wait time if they join now

**Client Usage:**
```javascript
socket.on('wait_time_updated', (data) => {
  if (data.waitTime.isInQueue) {
    console.log(`Your turn in ${data.waitTime.waitMinutes} minutes`);
  } else {
    console.log(`Current wait: ${data.waitTime.displayText}`);
  }
});
```


***

#### **5.3.3 Service Started**

**Event:** `service_started`

**Payload:**
```javascript
{
  "bookingId": "60d5f484f1b2c72d88f8a1b2"
}
```

***

#### **5.3.4 Service Completed**

**Event:** `service_completed`

**Payload:**
```javascript
{
  "bookingId": "60d5f484f1b2c72d88f8a1b2",
  "pointsEarned": 45  // Only sent to customer
}
```

***

#### **5.3.5 Booking Cancelled**

**Event:** `booking_cancelled`

**Payload:**
```javascript
{
  "bookingId": "60d5f484f1b2c72d88f8a1b2"
}
```

***

#### **5.3.6 Booking No-Show**

**Event:** `booking_no_show`

**Payload:**
```javascript
{
  "bookingId": "60d5f484f1b2c72d88f8a1b2"
}
```


***

#### **5.3.7 Priority Service Started**

**Event:** `priority_started`

**Payload:**
```javascript
{
  "bookingId": "60d5f484f1b2c72d88f8a1b2",
  "reason": "Senior citizen"
}
```

***

#### **5.3.8 Customer Arrived**

**Event:** `customer_arrived`

**Payload:**
```javascript
{
  "bookingId": "60d5f484f1b2c72d88f8a1b2"
}
```

***

#### **5.3.9 Arrival Confirmed**

**Event:** `arrival_confirmed` (sent to customer's personal room)

**Payload:**
```javascript
{
  "bookingId": "60d5f484f1b2c72d88f8a1b2",
  "queuePosition": 4
}
```


***

#### **5.3.10 Booking Scheduled**

**Event:** `booking_scheduled`

**Payload:**
```javascript
{
  "salonId": "60d5f484f1b2c72d88f8a1b2",
  "bookingId": "...",
  "scheduledDate": "2026-01-25",
  "scheduledTime": "14:30"
}
```


***

### **5.4 Socket.IO Room Structure**

```
Global Namespace (/)
├── salon_<salonId>        # All clients watching this salon
│   ├── Customer sockets
│   ├── Owner sockets
│   └── Staff sockets
│
└── user_<userId>          # Personal room for each user
    └── User's socket(s)
```

**Broadcasting Logic:**
- `queue_updated`, `wait_time_updated` → Broadcast to `salon_<salonId>`
- `service_started`, `service_completed`, `booking_cancelled` → Send to both `salon_<salonId>` and `user_<userId>`
- `arrival_confirmed` → Send only to `user_<userId>` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

## **6. SERVICES & BUSINESS LOGIC**

### **6.1 Notification Service**

**File:** `services/notificationService.js`

#### **6.1.1 Send to Device**

```javascript
await NotificationService.sendToDevice(fcmToken, {
  title: '🔔 New Booking',
  body: 'John Doe joined the queue',
  data: {
    type: 'new_booking',
    bookingId: '...',
    salonId: '...'
  }
});
```

**Features:**
- Uses Firebase Cloud Messaging (FCM)
- Android high priority
- Click action: `FLUTTER_NOTIFICATION_CLICK` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **6.1.2 Send to Multiple Devices**

```javascript
await NotificationService.sendToMultipleDevices(
  [fcmToken1, fcmToken2, fcmToken3],
  { title, body, data }
);
```

**Returns:** Success count [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **6.1.3 Pre-built Notification Methods**

```javascript
// New booking notification (to owner)
await NotificationService.notifyNewBooking(owner, booking, customer, salon);
// Sends: "🔔 New Booking - John Doe joined the queue at position 4"

// Queue position update (to customer)
await NotificationService.notifyQueueUpdate(user, booking, salon);
// Sends: "Queue Update - You're now #3 at StyleHub. Estimated wait: 25 mins"

// Almost ready (to customer when position = 1)
await NotificationService.notifyAlmostReady(user, booking, salon);
// Sends: "Almost Your Turn! - You're next in line at StyleHub"

// Service started (to customer)
await NotificationService.notifyBookingStarted(user, booking, salon);
// Sends: "Service Started - Your service at StyleHub has started!"

// Priority service started (to customer)
await NotificationService.notifyPriorityStarted(user, booking, salon, reason);
// Sends: "⚡ Priority Service Started - Your service at StyleHub has started as priority (Senior citizen)"

// Service completed (to customer)
await NotificationService.notifyBookingCompleted(user, booking, salon);
// Sends: "Service Completed - Your service at StyleHub is complete! Please rate your experience."

// Booking cancelled (to customer)
await NotificationService.notifyBookingCancelled(user, booking, salon);
// Sends: "Booking Cancelled - Your booking at StyleHub has been cancelled."

// Salon closed (to customers in queue)
await NotificationService.notifySalonClosed(customer, salon, reason);
// Sends: "StyleHub is now closed - Reason: Emergency closure. Please check back later."
```


***

### **6.2 Reminder Service**

**File:** `services/reminderService.js`

#### **6.2.1 Scheduler**

```javascript
// Start scheduler (in server.js)
ReminderService.startScheduler();
```

**Runs every 5 minutes:**
1. **Check Upcoming Bookings:** Find scheduled bookings with `estimatedStartTime` in next 30 minutes, send reminder
2. **Check Turn Approaching:** Find bookings with `queuePosition = 1` or `2`, send "almost ready" notification [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

#### **6.2.2 Methods**

```javascript
// Check and send 30-min reminders
await ReminderService.checkUpcomingBookings();

// Check and send "your turn is next" alerts
await ReminderService.checkTurnApproaching();
```

**Tracking:**
- Sets `booking.reminderSent = true` to avoid duplicates
- Sets `booking.turnNotificationSent = true` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

### **6.3 Wait Time Calculation Service**

**File:** `services/waitTimeService.js`

This is the **core algorithm** for personalized wait time calculation. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

#### **6.3.1 Calculate Wait Time (Core Method)**

```javascript
const waitTime = await WaitTimeService.calculateWaitTime(
  salonId,     // Required
  userId,      // Optional (null for anonymous)
  salon        // Optional (salon document)
);
```

**Return Object:**
```javascript
{
  waitMinutes: 45,
  displayText: "~45 min wait",
  queueLength: 3,
  queuePosition: null,  // or 1, 2, 3... if user in queue
  status: "busy",       // available|busy|very-busy|full|closed
  estimatedStartTime: Date,
  isInQueue: false,     // true if userId in queue
  timestamp: 1737698700000
}
```

***

#### **6.3.2 Wait Time Logic (PRD-Compliant)**

**CASE 1: User is IN queue (userId provided + found in pending bookings)**

```
Wait Time = Sum of durations of ALL bookings BEFORE user in queue

For each booking ahead of user:
  - If in-progress: Add REMAINING time (totalDuration - elapsedTime)
  - If pending: Add FULL duration

EXCLUDES:
  - User's own service time
  - Everyone after user in queue
```

**Example:**
```
Queue:
1. John (in-progress, 30 min service, 10 min elapsed) → Remaining: 20 min
2. Alice (pending, 45 min service) → Full: 45 min
3. Bob (pending, 30 min service) → Full: 30 min
4. [CURRENT USER] (pending, 60 min service)
5. Charlie (pending, 20 min service)

User's Wait Time = 20 + 45 + 30 = 95 minutes
Display: "Your turn in ~95 min"
```

**CASE 2: User is NOT in queue (userId not provided OR not found in queue)**

```
Wait Time = Sum of durations of ALL bookings in queue

For each booking:
  - If in-progress: Add REMAINING time
  - If pending: Add FULL duration

This represents: "If you join NOW, you'll wait this long"
```

**Example (same queue):**
```
Total Wait = 20 + 45 + 30 + 60 + 20 = 175 minutes
Display: "~2h 55m wait"
```


***

#### **6.3.3 Status Determination**

```javascript
if (waitMinutes === 0) {
  status = 'available';
} else if (waitMinutes > 45) {
  status = 'very-busy';
} else if (waitMinutes > 15) {
  status = 'busy';
} else {
  status = 'available';
}
```

**Special Statuses:**
- `closed`: Salon `isOpen = false`
- `busy`: Salon `busyMode = true` (walk-ins only)
- `full`: Queue length exceeds `maxQueueSize` or `activeBarbers + 10`
- `unavailable`: `activeBarbers = 0` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

#### **6.3.4 Display Text Formatting**

```javascript
WaitTimeService.formatWaitTime(minutes);

// Examples:
0 min      → "No wait"
3 min      → "~0-5 min"
25 min     → "~25 min wait"
75 min     → "~1h 15m wait"
120 min    → "~2h wait"
```


***

#### **6.3.5 Get Wait Time for Salon (Wrapper)**

```javascript
const waitTime = await WaitTimeService.getWaitTimeForSalon(salon, userId);
```

**Handles edge cases:**
- Returns `status: 'closed'` if `salon.isOpen = false`
- Returns `status: 'unavailable'` if `activeBarbers = 0`
- Calls `calculateWaitTime()` for normal cases [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

### **6.4 Wait Time Helpers**

**File:** `utils/waitTimeHelpers.js`

#### **6.4.1 Emit Wait Time Update (Broadcast)**

```javascript
await emitWaitTimeUpdate(salonId);
```

**What it does:**
1. Gets all sockets connected to `salon_<salonId>` room
2. For each socket:
   - Retrieves `socket.userId` (set during authentication)
   - Calculates **personalized wait time** for that user
   - Emits `wait_time_updated` event to that socket only
3. Result: Each user gets their own wait time [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Example Output:**
```
Socket A (user_123 in queue at position 2):
  → "Your turn in ~30 min"

Socket B (user_456 not in queue):
  → "~95 min wait"

Socket C (user_789 in queue at position 1, currently in-progress):
  → "Your turn now!"
```


***

#### **6.4.2 Attach Wait Times to Salons (Bulk)**

```javascript
const salonsWithWaitTime = await attachWaitTimesToSalons(salons, userId);
```

**Used in:**
- `GET /api/salons` (salon listing)
- `GET /api/salons/nearby` (geospatial search)

**What it does:**
- Takes array of salon documents
- Calculates personalized wait time for each salon
- Returns salons with `waitTime` field attached [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

### **6.5 Queue Position Management**

#### **6.5.1 Update Queue Positions (Reorder)**

```javascript
await updateQueuePositions(salonId);
```

**What it does:**
1. Fetches all `pending` and `in-progress` bookings, sorted by `queuePosition`
2. Reassigns sequential positions (1, 2, 3, ...) to remove gaps
3. Saves each booking
4. Recalculates `estimatedStartTime` for each booking [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

**Called after:**
- Booking cancelled
- Booking completed
- Booking skipped

***

#### **6.5.2 Reorder Queue Positions (Strict)**

```javascript
await _reorderQueuePositions(salonId);
```

**Similar to above but:**
- Ensures no skipped bookings in reordering
- More strict validation [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

### **6.6 Update Salon Rating**

```javascript
await updateSalonRating(salonId);
```

**What it does:**
1. Aggregates all completed bookings with ratings
2. Calculates average rating
3. Counts total reviews
4. Updates `salon.averageRating` and `salon.totalReviews` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Called after:**
- Customer submits review
- Customer updates review

***

## **7. ERROR HANDLING**

### **7.1 Standard Error Response**

```javascript
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (dev only)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created (new resource)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid JWT)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

***

### **7.2 Common Error Scenarios**

#### **7.2.1 Authentication Errors**

```javascript
// Missing JWT token
{
  "success": false,
  "message": "No token, authorization denied"
}

// Invalid/expired token
{
  "success": false,
  "message": "Token is not valid"
}

// User deactivated
{
  "success": false,
  "message": "User account is deactivated"
}
```

***

#### **7.2.2 Authorization Errors**

```javascript
// Wrong role
{
  "success": false,
  "message": "Access denied. Admin role required."
}

// Not salon owner
{
  "success": false,
  "message": "Not authorized to update this salon"
}
```

***

#### **7.2.3 Validation Errors**

```javascript
// Missing required fields
{
  "success": false,
  "message": "Salon ID and services are required"
}

// Invalid data
{
  "success": false,
  "message": "Rating must be between 1 and 5"
}

// Business rule violation
{
  "success": false,
  "message": "You already have an active booking at this salon"
}
```

***

#### **7.2.4 Resource Not Found**

```javascript
{
  "success": false,
  "message": "Salon not found"
}
```

***

#### **7.2.5 State Errors**

```javascript
// Cannot perform action in current state
{
  "success": false,
  "message": "Cannot start service - booking is cancelled"
}

// Salon closed
{
  "success": false,
  "message": "Salon is currently closed"
}

// Queue full
{
  "success": false,
  "message": "Queue is full. Please try walk-in or schedule booking."
}

// Daily limit reached
{
  "success": false,
  "message": "Daily priority limit reached (5/5 used)"
}
```

***

## **8. COMPLETE WORKFLOWS**

### **8.1 Customer Books Salon (Immediate Queue)**

```
┌─────────────┐
│ 1. Customer │
│    Login    │
└──────┬──────┘
       │
       │ POST /api/auth/verify-token
       │ { idToken, phone, appType: "customer" }
       ▼
┌─────────────────┐
│ Get JWT token   │
└──────┬──────────┘
       │
       │ GET /api/salons/nearby?lat=19.0760&lng=72.8777&radius=5
       │ Authorization: Bearer <JWT>
       ▼
┌─────────────────────────┐
│ Browse salons with      │
│ personalized wait times │
│ (isInQueue: false)      │
└──────┬──────────────────┘
       │
       │ socket.emit('join_salon', { salonId })
       │ Listen to wait_time_updated events
       ▼
┌─────────────────────────┐
│ Select services         │
└──────┬──────────────────┘
       │
       │ POST /api/bookings/join-queue
       │ { salonId, services, paymentMethod: "cash" }
       ▼
┌─────────────────────────┐
│ Booking created         │
│ Status: pending         │
│ Position: 4             │
└──────┬──────────────────┘
       │
       │ SIDE EFFECTS:
       │ ✅ FCM: "You're #4 at StyleHub. Wait: 45 mins"
       │ ✅ Socket: wait_time_updated (now isInQueue: true)
       │ ✅ Owner FCM: "John Doe joined queue at #4"
       ▼
┌─────────────────────────┐
│ Customer receives       │
│ personalized wait time: │
│ "Your turn in ~45 min"  │
└──────┬──────────────────┘
       │
       │ As queue moves, socket events:
       │ wait_time_updated → "Your turn in ~30 min" (position 3)
       │ wait_time_updated → "Your turn in ~15 min" (position 2)
       ▼
┌─────────────────────────┐
│ Position = 1            │
│ FCM: "Almost Your Turn!"│
└──────┬──────────────────┘
       │
       │ Owner: POST /api/queue/:salonId/start/:bookingId
       ▼
┌─────────────────────────┐
│ Status: in-progress     │
│ FCM: "Service Started"  │
└──────┬──────────────────┘
       │
       │ Owner: POST /api/queue/:salonId/complete/:bookingId
       ▼
┌─────────────────────────────────┐
│ Status: completed               │
│ Payment: auto-marked as paid    │
│ Loyalty: +45 points awarded     │
│ FCM: "Service Complete! Rate us"│
└──────┬──────────────────────────┘
       │
       │ POST /api/reviews/booking/:bookingId
       │ { rating: 5, review: "Great service!" }
       ▼
┌─────────────────────────┐
│ Review submitted        │
│ Salon rating updated    │
└─────────────────────────┘
```

***

### **8.2 Salon Owner Onboarding (Setup Wizard)**

```
┌─────────────┐
│ Owner Login │
└──────┬──────┘
       │
       │ POST /api/auth/verify-token
       │ { idToken, phone, appType: "salon" }
       ▼
┌─────────────────────────────┐
│ Response:                   │
│ role: "owner"               │
│ setupRequired: true         │
│ setupStep: "profile"        │
└──────┬──────────────────────┘
       │
       │ GET /api/salon-setup/status
       ▼
┌─────────────────────────────┐
│ Step 1: Profile             │
│ POST /api/salon-setup/profile│
│ { name, address, lat, lng } │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Step 2: Hours               │
│ POST /api/salon-setup/hours │
│ { hours: { monday: {...} } }│
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Step 3: Services            │
│ POST /api/salon-setup/services│
│ { services: [{...}] }       │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Step 4: Capacity            │
│ POST /api/salon-setup/capacity│
│ { totalBarbers: 4 }         │
└──────┬──────────────────────┘
       │
       │ POST /api/salon-setup/complete
       ▼
┌─────────────────────────────┐
│ Setup Complete!             │
│ user.setupCompleted: true   │
│ salon.isActive: true        │
│ salon.isVerified: false     │
└──────┬──────────────────────┘
       │
       │ Admin verifies salon:
       │ PATCH /api/admin/salons/:id/verify
       ▼
┌─────────────────────────────┐
│ Salon live & discoverable  │
└─────────────────────────────┘
```

***

### **8.3 Walk-In Customer Flow**

```
┌────────────────────────┐
│ Customer walks into    │
│ salon (no app/phone)   │
└──────┬─────────────────┘
       │
       │ Staff: POST /api/queue/:salonId/walk-in
       │ { services: [{...}] }  // No name/phone
       ▼
┌─────────────────────────────────┐
│ System generates token: "0001"  │
│ Booking created:                │
│ - walkInToken: "0001"           │
│ - userId: null                  │
│ - arrived: true (auto)          │
│ - queuePosition: 6              │
└──────┬──────────────────────────┘
       │
       │ Staff shows customer: "Your token is 0001"
       │ (Optionally print receipt)
       ▼
┌─────────────────────────────────┐
│ Queue displayed as:             │
│ "Token #0001" (no name/phone)   │
└──────┬──────────────────────────┘
       │
       │ Service flow continues normally:
       │ Start → Complete → No loyalty points
       ▼
┌─────────────────────────────────┐
│ Completed & paid                │
│ (No FCM notifications sent)     │
└─────────────────────────────────┘
```

**Alternate Flow (With Phone):**
```
Staff: POST /api/queue/:salonId/walk-in
{ phone: "+919876543210", services: [{...}] }

→ System creates/links user account
→ No token generated (uses name)
→ Future bookings linked to same account
→ Loyalty points awarded
```

***

### **8.4 Scheduled Booking Flow**

```
┌─────────────┐
│ Customer    │
└──────┬──────┘
       │
       │ GET /api/bookings/available-slots/:salonId?date=2026-01-25
       ▼
┌─────────────────────────────┐
│ Available 30-min slots      │
│ 09:00 ✅ | 09:30 ✅ | 10:00 ❌│
└──────┬──────────────────────┘
       │
       │ POST /api/bookings/schedule
       │ { salonId, services, scheduledDate: "2026-01-25", scheduledTime: "14:30" }
       ▼
┌─────────────────────────────┐
│ Booking created:            │
│ - bookingType: "scheduled"  │
│ - status: "pending"         │
│ - arrived: false            │
│ - queuePosition: 0          │
└──────┬──────────────────────┘
       │
       │ Owner: GET /api/scheduled-bookings/:salonId/today
       │ (on day of booking)
       ▼
┌─────────────────────────────┐
│ See scheduled booking       │
│ Wait for customer arrival   │
└──────┬──────────────────────┘
       │
       │ Customer arrives
       │ Owner: PATCH /api/scheduled-bookings/:bookingId/mark-arrived
       ▼
┌─────────────────────────────┐
│ Booking updated:            │
│ - arrived: true             │
│ - arrivedAt: now            │
│ - queuePosition: 3 (assigned)│
│ - Now joins live queue!     │
└──────┬──────────────────────┘
       │
       │ Continue as normal queue booking
       │ (start → complete)
       ▼
┌─────────────────────────────┐
│ Completed                   │
└─────────────────────────────┘

ALTERNATE: No-Show
Owner: PATCH /api/scheduled-bookings/:bookingId/no-show
→ status: "no-show"
→ Customer not charged
```

***

### **8.5 Priority Queue Insertion**

```
┌─────────────────────────┐
│ Regular queue:          │
│ 1. Alice (pending)      │
│ 2. Bob (in-progress)    │
│ 3. Charlie (pending)    │
│ 4. David (pending)      │
└──────┬──────────────────┘
       │
       │ Owner: POST /api/queue/:salonId/start-priority/:bookingId
       │ { reason: "Senior citizen" }
       │ (bookingId = David's booking)
       ▼
┌─────────────────────────────────┐
│ System checks:                  │
│ ✅ priorityUsedToday: 2/5       │
│ ✅ Only Owner/Manager can do    │
└──────┬──────────────────────────┘
       │
       │ Reorder queue:
       ▼
┌─────────────────────────────────┐
│ New queue:                      │
│ 1. David (in-progress) ⚡       │
│ 2. Alice (pending)              │
│ 3. Bob (in-progress)            │
│ 4. Charlie (pending)            │
└──────┬──────────────────────────┘
       │
       │ SIDE EFFECTS:
       │ ✅ David FCM: "⚡ Priority Service Started (Senior citizen)"
       │ ✅ PriorityLog created (audit trail)
       │ ✅ salon.priorityUsedToday = 3
       │ ✅ Socket: queue_updated to all
       │ ✅ Wait times recalculated
       ▼
┌─────────────────────────────────┐
│ Service continues normally      │
└─────────────────────────────────┘
```

**Daily Reset:**
- `salon.priorityUsedToday` resets to 0 at midnight
- Tracked by `salon.lastPriorityReset` date comparison

***

### **8.6 Admin Manages Platform**

```
┌─────────────┐
│ Admin Login │
└──────┬──────┘
       │
       │ POST /api/admin/auth/login
       │ { email: "admin@lynin.com", firebaseToken }
       ▼
┌─────────────────────────┐
│ Admin Dashboard         │
│ GET /api/admin/statistics│
└──────┬──────────────────┘
       │
       ├─→ GET /api/admin/users
       │   → View all users
       │   → DELETE /api/admin/users/:userId (soft delete)
       │
       ├─→ GET /api/admin/salons
       │   → View all salons
       │   → PATCH /api/admin/salons/:id/verify (verify salon)
       │   → PATCH /api/admin/salons/:id/disable (disable salon)
       │
       ├─→ GET /api/admin/bookings
       │   → Monitor all bookings
       │
       ├─→ PUT /api/faqs (manage FAQs)
       │   PUT /api/feature-flags (toggle live chat)
       │   PUT /api/app-info (update policies)
       │
       └─→ GET /api/admin/audit-logs
           → View all admin actions (full transparency)
```

***

## **9. ADVANCED FEATURES**

### **9.1 Staff Assignment System**

**Enabled per salon:** Admin sets `salon.staffSystemEnabled = true`

**Flow:**
1. Owner adds staff: `POST /api/staff`
2. When booking created, owner assigns staff: `PUT /api/bookings/:id/assign-staff`
3. Staff sees their bookings: `GET /api/bookings/staff/:staffId`
4. Track performance: `GET /api/staff/:id/performance`
5. Staff ratings calculated from booking reviews [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

### **9.2 Multi-Salon Owner Support**

- User can own multiple salons (no limit)
- Each salon has separate queue, settings, staff
- `GET /api/salons/my-salons` returns all owned salons
- Switch between salons in app by passing `salonId` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

### **9.3 Loyalty Points System**

**Earning:**
- 1 point per ₹10 spent
- Awarded on service completion (auto with payment)
- Only for registered users (not walk-ins without phone)

**Redemption:**
- Not yet implemented (frontend shows balance)
- Planned: Redeem for discounts [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/50af21b9-0506-4843-bfbe-61d0831ba4cf/paste.txt)

***

### **9.4 Geospatial Search**

**MongoDB 2dsphere Index:**
```javascript
salon.location.coordinates = [longitude, latitude]  // [lng, lat]
```

**Query:**
```javascript
Salon.find({
  'location.coordinates': {
    $near: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: radius * 1000  // meters
    }
  }
})
```


***

### **9.5 Salon Closure with Queue Handling**

**Graceful Closure:**
```
PUT /api/salons/:id/close-with-reason
{ reason: "Emergency closure" }
```

**Process:**
1. Sets `isOpen: false`
2. Finds all pending/in-progress bookings
3. Cancels each with reason
4. Sends FCM to each customer: "Salon closed - Emergency closure"
5. Logs to `salon.closureHistory` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

### **9.6 Busy Mode (Walk-ins Only)**

**Purpose:** High traffic, owner wants control

**Activation:**
```
PUT /api/salons/:id/set-busy-mode
{ busyMode: true }
```

**Effect:**
- Online bookings blocked (API returns `status: 'busy'`)
- Wait time shows "Walk-ins only"
- Customers must come in person
- Staff adds via `POST /api/queue/:salonId/walk-in` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

***

### **9.7 Admin Audit Logging**

**All destructive admin actions logged:**
- User deletion
- Salon verification
- Salon disable/enable
- User restoration

**AdminAuditLog Schema:**
```javascript
{
  adminId: ObjectId (ref: User),
  adminName: String,
  adminEmail: String,
  actionType: String,  // "user_soft_delete", "salon_verify", etc.
  entityType: String,  // "user", "salon", "booking"
  entityId: String,
  previousState: Object,
  newState: Object,
  reason: String,
  ipAddress: String,
  userAgent: String,
  timestamp: Date
}
```

**Retrieval:**
```
GET /api/admin/audit-logs?actionType=user_soft_delete&startDate=2026-01-01
```


***

## **10. PERFORMANCE & SCALABILITY**

### **10.1 Database Indexes**

**User:**
- `phone` (unique)
- `firebaseUid` (unique)

**Salon:**
- `location.coordinates` (2dsphere)
- `ownerId`
- `city`

**Booking:**
- `{ userId, status }`
- `{ salonId, status }`
- `{ salonId, queuePosition }`
- `{ salonId, bookingType, scheduledDate }`
- `bookingType`
- `scheduledDate`
- `walkInToken`
- `assignedStaffId`

**Staff:**
- `salonId`

***

### **10.2 Caching Strategy**

**Redis/In-Memory Caching (Implied but not fully implemented):**
- FAQs: 24-hour cache
- App Info: 24-hour cache
- Feature Flags: 24-hour cache [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

**Future Optimization:**
- Cache salon listings by city
- Cache popular searches
- Cache wait times (5-second TTL)

***

### **10.3 Socket.IO Optimization**

**Personalized Broadcasting:**
- Instead of broadcasting same wait time to all users
- Each socket calculates personalized wait time
- Reduces data transfer, improves UX [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/3598ee82-5ca6-44a3-a646-3e580680b4a4/paste-2.txt)

**Room-based Broadcasting:**
- Only users in `salon_<salonId>` room receive updates
- No global broadcasts (reduces noise)

***

### **10.4 Queue Management Optimization**

**Atomic Operations:**
- Walk-in token generation uses `findOne().sort({ walkInToken: -1 })` to avoid race conditions
- Queue position assignment uses `countDocuments()` + 1

**Batch Updates:**
- `updateQueuePositions()` updates all bookings in single transaction [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

## **11. SECURITY CONSIDERATIONS**

### **11.1 Authentication Security**

- Firebase token verified server-side (cannot be faked)
- JWT expires in 30 days
- JWT includes `userId`, `role`, `isAdmin`
- All protected routes verify JWT via middleware [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

### **11.2 Authorization Checks**

**Role-based:**
```javascript
// Middleware checks
protect()         // Requires valid JWT
adminOnly()       // Requires role = 'admin'
checkRole(['owner', 'manager'])  // Multiple roles
```

**Resource-based:**
```javascript
// Only salon owner can update salon
if (salon.ownerId.toString() !== req.user._id.toString()) {
  return res.status(403).json({ message: 'Not authorized' });
}
```


***

### **11.3 Data Validation**

- All inputs validated (required fields, data types, ranges)
- Phone format validation
- Email format validation
- Service category enum validation
- Rating 1-5 validation [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/60458d4b-705f-467b-8987-f4cec7c19b01/paste.txt)

***

### **11.4 Soft Deletes**

- Users marked `isActive: false` (not deleted from DB)
- Salons can be restored by admin
- Audit trail maintained [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/108582419/d60737e8-7fc1-4d28-b8c7-b0e0d068d5d4/paste.txt)

***

### **11.5 Rate Limiting**

**Not yet implemented but recommended:**
```javascript
// Express rate limiter
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100                   // Max 100 requests per IP
}));
```

***

## **12. DEPLOYMENT & CONFIGURATION**

### **12.1 Environment Variables**

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/lynin

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d

# Firebase
FIREBASE_PROJECT_ID=lynin-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@lynin-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://lynin.com
```

***

### **12.2 Firebase Admin SDK Initialization**

```javascript
// config/firebase.js
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

module.exports = admin;
```

***

### **12.3 MongoDB Connection**

```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('✅ MongoDB Connected');
};
```

***

### **12.4 Server Initialization**

```javascript
// server.js
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const ReminderService = require('./services/reminderService');

const app = express();
const server = http.createServer(app);
const io = socketio(server, { cors: { origin: '*' } });

// Make io globally accessible
global.io = io;

// Socket.IO authentication & room management
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT, set socket.userId
  next();
});

// Start reminder scheduler
ReminderService.startScheduler();

server.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});
```

***

## **13. API TESTING**

### **13.1 Sample Postman Collection**

**Authentication:**
```
POST http://100.112.160.11:3000/api/auth/verify-token
Headers:
  Content-Type: application/json
Body:
{
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "phone": "+919876543210",
  "appType": "customer"
}
```

**Get Nearby Salons:**
```
GET http://100.112.160.11:3000/api/salons/nearby?latitude=19.0760&longitude=72.8777&radius=5
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Join Queue:**
```
POST http://100.112.160.11:3000/api/bookings/join-queue
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  Content-Type: application/json
Body:
{
  "salonId": "60d5f484f1b2c72d88f8a1b2",
  "services": [
    {
      "serviceId": "60d5f484f1b2c72d88f8a1b3",
      "name": "Haircut",
      "price": 300,
      "duration": 30
    }
  ],
  "paymentMethod": "cash"
}
```

***

## **14. CHANGELOG & VERSION HISTORY**

**Version 2.0 (January 2026):**
- ✅ Personalized wait time calculation
- ✅ Walk-in token system (4-digit)
- ✅ Priority queue with daily limits
- ✅ Scheduled booking system
- ✅ Staff management system
- ✅ Admin audit logging
- ✅ FAQ caching
- ✅ Feature flags (live chat toggle)
- ✅ Salon closure with reason tracking
- ✅ Auto-payment marking on completion
- ✅ Service categories (Hair, Beard, Body, Add-on)

**Version 1.0 (June 2025):**
- Initial release
- Basic queue management
- Firebase authentication
- Geospatial search
- Push notifications

***

## **15. SUPPORT & CONTACT**

**Backend Maintained By:** Ruhban Abdullah
**Support Email:** support@lynin.com  
**Documentation Updated:** January 24, 2026

100+ API ENDPOINTS