# Complete API Documentation - Salon Booking Platform

**Version:** 1.0  
**Last Updated:** December 12, 2025  
**Base URL:** `https://api.trimzo.com/api` (Production) | `http://localhost:5000/api` (Development)

***

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Folder Structure](#architecture--folder-structure)
3. [Authentication & Authorization](#authentication--authorization)
4. [Global Headers & Response Format](#global-headers--response-format)
5. [Error Handling Standards](#error-handling-standards)
6. [API Endpoints](#api-endpoints)
   - [Authentication APIs](#authentication-apis)
   - [User APIs](#user-apis)
   - [Salon APIs](#salon-apis)
   - [Booking APIs](#booking-apis)
   - [Review APIs](#review-apis)
   - [Favorite APIs](#favorite-apis)
   - [Analytics APIs](#analytics-apis)
   - [Admin APIs](#admin-apis)
7. [Complete Workflow Examples](#complete-workflow-examples)
8. [Rate Limiting & Security](#rate-limiting--security)
9. [Frontend Integration Guide](#frontend-integration-guide)
10. [Future Improvements](#future-improvements)

***

## Project Overview

### Domain
Salon booking and queue management platform connecting users with nearby salons, providing real-time wait times, booking management, and analytics.

### Technology Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** Cloudinary (for images)
- **Location Services:** MongoDB Geospatial Queries
- **Frontend:** Flutter (mobile app)

### Core Features
1. User authentication (phone/email with OTP)
2. Location-based salon discovery
3. Real-time wait time calculation
4. Booking lifecycle management
5. Queue position tracking
6. Reviews and ratings system
7. Salon owner dashboard and analytics
8. Admin panel for platform management
9. Favorites/wishlist functionality

***

## Architecture & Folder Structure

```
backend/
├── config/
│   ├── db.js                    # MongoDB connection configuration
│   └── cloudinary.js            # Cloudinary setup for image uploads
├── middleware/
│   ├── auth.js                  # JWT verification middleware
│   ├── roleCheck.js             # Role-based access control
│   ├── upload.js                # Multer configuration for file uploads
│   └── errorHandler.js          # Global error handling middleware
├── models/
│   ├── User.js                  # User schema (customers)
│   ├── Salon.js                 # Salon schema with location
│   ├── Booking.js               # Booking/Queue schema
│   ├── Review.js                # Review and rating schema
│   ├── Service.js               # Service offerings schema
│   └── Admin.js                 # Admin user schema
├── controllers/
│   ├── authController.js        # Authentication logic
│   ├── userController.js        # User profile management
│   ├── salonController.js       # Salon CRUD and discovery
│   ├── bookingController.js     # Booking lifecycle
│   ├── reviewController.js      # Review management
│   ├── analyticsController.js   # Analytics and reports
│   └── adminController.js       # Admin operations
├── routes/
│   ├── auth.js                  # Auth routes
│   ├── user.js                  # User routes
│   ├── salon.js                 # Salon routes
│   ├── booking.js               # Booking routes
│   ├── review.js                # Review routes
│   └── admin.js                 # Admin routes
├── utils/
│   ├── calculateWaitTime.js     # Wait time calculation logic
│   ├── sendOTP.js               # OTP generation and sending
│   ├── validators.js            # Input validation helpers
│   └── logger.js                # Logging utility
├── .env                         # Environment variables
├── server.js                    # Express app entry point
└── package.json                 # Dependencies
```

***

## Authentication & Authorization

### Authentication Flow

```
1. User Registration/Login
   ├─> POST /api/auth/register or /api/auth/login
   ├─> Backend validates credentials
   ├─> OTP sent to phone/email (if required)
   ├─> User verifies OTP via POST /api/auth/verify-otp
   ├─> JWT token generated and returned
   └─> Token includes: { userId, role, exp }

2. Protected Route Access
   ├─> Client includes token in Authorization header
   ├─> auth.js middleware verifies JWT
   ├─> Decoded user attached to req.user
   ├─> roleCheck.js middleware validates role (if applicable)
   └─> Controller processes request

3. Token Refresh
   ├─> Token expires after 30 days (default)
   ├─> Client must re-authenticate
   └─> No refresh token implemented (stateless JWT)
```

### JWT Payload Structure

```javascript
{
  "userId": "507f1f77bcf86cd799439011",
  "role": "user|owner|admin",
  "iat": 1670859678,        // Issued at timestamp
  "exp": 1673451678         // Expiration timestamp
}
```

### Role-Based Access Control

| Role | Description | Access Level |
|------|-------------|--------------|
| `user` | Regular app users (customers) | Can book salons, write reviews, manage profile |
| `owner` | Salon owners | Can manage own salon(s), view analytics, manage bookings |
| `admin` | Platform administrators | Full access to all resources, can manage users and salons |

### Access Control Matrix

| Resource | Public | User | Owner | Admin |
|----------|--------|------|-------|-------|
| Register/Login | ✅ | ✅ | ✅ | ✅ |
| View Salons | ✅ | ✅ | ✅ | ✅ |
| View Salon Details | ✅ | ✅ | ✅ | ✅ |
| Create Booking | ❌ | ✅ | ❌ | ✅ |
| Manage Own Bookings | ❌ | ✅ | ❌ | ✅ |
| Create Review | ❌ | ✅ | ❌ | ✅ |
| Create Salon | ❌ | ❌ | ✅ | ✅ |
| Update Salon | ❌ | ❌ | ✅ (own) | ✅ |
| View Analytics | ❌ | ❌ | ✅ (own) | ✅ |
| Manage Queue | ❌ | ❌ | ✅ (own) | ✅ |
| Delete Users | ❌ | ❌ | ❌ | ✅ |
| Platform Analytics | ❌ | ❌ | ❌ | ✅ |

***

## Global Headers & Response Format

### Standard Request Headers

```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>          # For protected routes
X-Client-Version: 1.0.0                    # Optional: Client app version
X-Platform: ios|android                    # Optional: Platform identifier
```

### Standard Success Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response payload specific to endpoint
  },
  "timestamp": "2025-12-12T23:55:00.000Z"
}
```

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      // Optional array of validation errors or additional info
    ]
  },
  "timestamp": "2025-12-12T23:55:00.000Z"
}
```

### Pagination Response Format

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 95,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

***

## Error Handling Standards

### HTTP Status Codes Used

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH requests |
| 201 | Created | Successful POST requests creating new resources |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Validation errors, malformed requests |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource conflict (e.g., duplicate booking) |
| 422 | Unprocessable Entity | Business logic validation failure |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side errors |
| 503 | Service Unavailable | Database or external service down |

### Standard Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `AUTH_TOKEN_MISSING` | 401 | Authorization header not provided |
| `AUTH_TOKEN_INVALID` | 401 | JWT token is malformed or expired |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | User role lacks required permissions |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `BUSINESS_LOGIC_ERROR` | 422 | Operation violates business rules |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests from client |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

***

## API Endpoints

***

## Authentication APIs

### 1. User Registration

**Endpoint:** Register a new user account

**HTTP Method:** `POST`

**Route:** `/api/auth/register`

**Access Level:** Public

**Authentication Required:** No

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+919876543210",
  "password": "SecurePass123!",
  "role": "user"
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| name | String | Yes | Min 2 chars, max 50 chars |
| email | String | Yes | Valid email format, unique |
| phone | String | Yes | Valid phone format (+country code), unique |
| password | String | Yes | Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number |
| role | String | No | Defaults to "user", accepts "user" or "owner" |

#### Business Logic

1. Validate input data (email format, phone format, password strength)
2. Check if email or phone already exists in database
3. Hash password using bcrypt (10 salt rounds)
4. Create User document in MongoDB
5. Generate JWT token with userId and role
6. Optionally send verification OTP to phone/email
7. Return user object (without password) and token

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+919876543210",
      "role": "user",
      "isVerified": false,
      "createdAt": "2025-12-12T23:55:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses

**Duplicate Email (409)**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_RESOURCE",
    "message": "Email already registered",
    "details": ["Email john.doe@example.com is already in use"]
  }
}
```

**Validation Error (400)**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      "Password must be at least 8 characters",
      "Phone number must include country code"
    ]
  }
}
```

#### Related Models
- **User Model:** Creates new document with fields: name, email, phone, password (hashed), role, isVerified, createdAt, updatedAt

#### Frontend Notes
- **Do NOT** store plain passwords locally
- Store JWT token securely (Flutter Secure Storage)
- Handle verification flow if `isVerified: false`
- Implement password strength indicator
- Add phone number formatting helper

#### Edge Cases
- Email exists but not verified → Allow re-registration with new OTP
- Phone exists with different email → Reject, ask to login
- Network failure during registration → Implement retry with exponential backoff
- Weak password → Show specific requirements in error

***

### 2. User Login

**Endpoint:** Authenticate existing user

**HTTP Method:** `POST`

**Route:** `/api/auth/login`

**Access Level:** Public

**Authentication Required:** No

#### Request Body
```json
{
  "identifier": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| identifier | String | Yes | Email or phone number |
| password | String | Yes | User's password |

#### Business Logic

1. Accept email OR phone as identifier
2. Find user by email or phone in database
3. Compare provided password with hashed password using bcrypt
4. If match, generate JWT token
5. Update `lastLogin` timestamp
6. Return user object and token
7. If mismatch, return error after 3 failed attempts → temporarily lock account

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+919876543210",
      "role": "user",
      "isVerified": true,
      "profileImage": "https://cloudinary.com/...",
      "lastLogin": "2025-12-12T23:55:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses

**Invalid Credentials (401)**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

**Account Locked (403)**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_ACCOUNT_LOCKED",
    "message": "Account temporarily locked due to multiple failed login attempts",
    "details": ["Try again after 15 minutes"]
  }
}
```

#### Security Notes
- **DO NOT** specify whether email or password is incorrect (prevent user enumeration)
- Implement rate limiting: max 5 attempts per IP per 15 minutes
- Log all failed login attempts with IP and timestamp
- Consider implementing CAPTCHA after 3 failed attempts

***

### 3. Send OTP

**Endpoint:** Send OTP for verification

**HTTP Method:** `POST`

**Route:** `/api/auth/send-otp`

**Access Level:** Public

**Authentication Required:** No

#### Request Body
```json
{
  "phone": "+919876543210",
  "purpose": "registration"
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| phone | String | Yes | Valid phone with country code |
| purpose | String | Yes | "registration", "login", or "reset_password" |

#### Business Logic

1. Validate phone number format
2. Check purpose and verify phone eligibility
   - registration: Phone must NOT exist
   - login: Phone must exist
   - reset_password: Phone must exist
3. Generate 6-digit OTP
4. Store OTP in database/cache with 5-minute expiry
5. Send OTP via SMS service (Twilio, AWS SNS, etc.)
6. Return success (do NOT return OTP in response)

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "+919876543210",
    "expiresIn": 300,
    "canResendAfter": 60
  }
}
```

#### Error Responses

**Phone Already Registered (409)**
```json
{
  "success": false,
  "error": {
    "code": "PHONE_ALREADY_REGISTERED",
    "message": "This phone number is already registered"
  }
}
```

**Too Many Requests (429)**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many OTP requests. Please try again later",
    "details": ["Retry after 60 seconds"]
  }
}
```

#### Security Notes
- Rate limit: Max 3 OTP requests per phone per hour
- Max 5 OTP requests per IP per hour
- OTP expires in 5 minutes
- Allow resend only after 60 seconds
- Log all OTP generation attempts

***

### 4. Verify OTP

**Endpoint:** Verify OTP code

**HTTP Method:** `POST`

**Route:** `/api/auth/verify-otp`

**Access Level:** Public

**Authentication Required:** No

#### Request Body
```json
{
  "phone": "+919876543210",
  "otp": "123456",
  "purpose": "registration"
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| phone | String | Yes | Valid phone number |
| otp | String | Yes | 6-digit code |
| purpose | String | Yes | Must match OTP generation purpose |

#### Business Logic

1. Find OTP record by phone and purpose
2. Check if OTP is expired (5 minutes)
3. Compare provided OTP with stored OTP
4. If match:
   - Mark user as verified (if registration)
   - Generate JWT token
   - Delete OTP record
   - Return token
5. If mismatch:
   - Increment failed attempts counter
   - After 3 failed attempts → invalidate OTP

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "verified": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "phone": "+919876543210",
      "isVerified": true
    }
  }
}
```

#### Error Responses

**Invalid OTP (400)**
```json
{
  "success": false,
  "error": {
    "code": "OTP_INVALID",
    "message": "Invalid OTP code",
    "details": ["2 attempts remaining"]
  }
}
```

**OTP Expired (400)**
```json
{
  "success": false,
  "error": {
    "code": "OTP_EXPIRED",
    "message": "OTP has expired. Please request a new one"
  }
}
```

***

### 5. Refresh Token

**Endpoint:** Refresh expired JWT token

**HTTP Method:** `POST`

**Route:** `/api/auth/refresh-token`

**Access Level:** Authenticated

**Authentication Required:** Yes (expired token acceptable)

#### Request Headers
```http
Authorization: Bearer <EXPIRED_OR_VALID_JWT_TOKEN>
```

#### Business Logic

1. Extract token from Authorization header
2. Decode token (ignore expiration)
3. Verify user still exists in database
4. Check if user is not banned/deleted
5. Generate new JWT token with same payload
6. Return new token

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 2592000
  }
}
```

#### Error Responses

**User Not Found (404)**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User account no longer exists"
  }
}
```

#### Notes
- **Current Implementation:** Stateless JWT (no refresh token database)
- **Assumption:** This endpoint accepts both valid and expired tokens for refresh
- **Future Enhancement:** Implement refresh token rotation with Redis

***

## User APIs

### 6. Get User Profile

**Endpoint:** Retrieve authenticated user's profile

**HTTP Method:** `GET`

**Route:** `/api/users/profile`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Extract userId from JWT token (via auth middleware)
2. Find user in database by userId
3. Populate related fields (favorites, recent bookings count)
4. Return user profile (exclude password)

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+919876543210",
      "profileImage": "https://cloudinary.com/image.jpg",
      "role": "user",
      "isVerified": true,
      "favoriteCount": 5,
      "totalBookings": 12,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "lastLogin": "2025-12-12T23:55:00.000Z"
    }
  }
}
```

#### Error Responses

**Token Missing (401)**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_MISSING",
    "message": "Authorization token required"
  }
}
```

**User Not Found (404)**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User profile not found"
  }
}
```

#### Related Models
- **User Model:** Fetches user document
- **Booking Model:** Counts total bookings
- **Favorites (embedded):** Returns favorite salon IDs

***

### 7. Update User Profile

**Endpoint:** Update user information

**HTTP Method:** `PUT`

**Route:** `/api/users/profile`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "John Updated Doe",
  "email": "newemail@example.com",
  "phone": "+919999999999",
  "profileImage": "https://cloudinary.com/new-image.jpg"
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| name | String | No | Min 2 chars, max 50 chars |
| email | String | No | Valid email, unique |
| phone | String | No | Valid phone, unique |
| profileImage | String | No | Valid URL or base64 |

#### Business Logic

1. Extract userId from JWT token
2. Validate updated fields
3. Check if new email/phone is already taken by another user
4. If phone changed → set `isVerified: false`, send OTP
5. Update user document
6. Return updated user profile

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Updated Doe",
      "email": "newemail@example.com",
      "phone": "+919999999999",
      "isVerified": false,
      "profileImage": "https://cloudinary.com/new-image.jpg"
    },
    "requiresVerification": true
  }
}
```

#### Error Responses

**Email Already Taken (409)**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email is already registered to another account"
  }
}
```

#### Notes
- Changing phone requires re-verification
- Profile image can be uploaded separately via upload endpoint
- Email change may trigger confirmation email

***

### 8. Upload Profile Image

**Endpoint:** Upload user profile picture

**HTTP Method:** `POST`

**Route:** `/api/users/profile/upload-image`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
```
image: <FILE> (JPEG, PNG, max 5MB)
```

#### Business Logic

1. Extract userId from JWT token
2. Validate file type (JPEG, PNG only)
3. Validate file size (max 5MB)
4. Upload image to Cloudinary
5. Generate optimized thumbnail (300x300)
6. Update user's `profileImage` field with Cloudinary URL
7. Delete old image from Cloudinary (if exists)
8. Return new image URL

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "imageUrl": "https://res.cloudinary.com/trimzo/image/upload/v1670859678/users/507f1f77bcf86cd799439011.jpg",
    "thumbnailUrl": "https://res.cloudinary.com/trimzo/image/upload/c_thumb,w_300,h_300/users/507f1f77bcf86cd799439011.jpg"
  }
}
```

#### Error Responses

**Invalid File Type (400)**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only JPEG and PNG images are allowed"
  }
}
```

**File Too Large (400)**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Image size must not exceed 5MB"
  }
}
```

#### Notes
- Use Multer middleware for file parsing
- Implement image compression before upload
- Store Cloudinary public_id for deletion
- Consider implementing image moderation (nudity detection)

***

### 9. Delete User Account

**Endpoint:** Permanently delete user account

**HTTP Method:** `DELETE`

**Route:** `/api/users/profile`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
  "password": "SecurePass123!",
  "confirmation": "DELETE"
}
```

#### Business Logic

1. Extract userId from JWT token
2. Verify password is correct
3. Verify confirmation text matches "DELETE"
4. Cancel all active bookings
5. Delete user's reviews (or mark as deleted)
6. Remove user from all salon favorites
7. Delete user document from database
8. Delete profile image from Cloudinary
9. Return success response

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "deleted": true,
    "deletedAt": "2025-12-12T23:55:00.000Z"
  }
}
```

#### Error Responses

**Invalid Password (401)**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Incorrect password"
  }
}
```

**Active Bookings (422)**
```json
{
  "success": false,
  "error": {
    "code": "ACTIVE_BOOKINGS_EXIST",
    "message": "Cannot delete account with active bookings",
    "details": ["Please cancel or complete your bookings first"]
  }
}
```

#### Notes
- **GDPR Compliance:** Permanently delete personal data
- Consider soft delete with anonymization instead
- Send confirmation email before deletion
- Keep booking history for salon owners (anonymize user data)

***

## Salon APIs

### 10. Get Nearby Salons

**Endpoint:** Discover salons near user location

**HTTP Method:** `GET`

**Route:** `/api/salons/nearby`

**Access Level:** Public

**Authentication Required:** No

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| latitude | Number | Yes | - | User's latitude |
| longitude | Number | Yes | - | User's longitude |
| radius | Number | No | 10 | Search radius in kilometers |
| page | Number | No | 1 | Page number for pagination |
| limit | Number | No | 20 | Results per page |
| sortBy | String | No | distance | Sort by: distance, rating, waitTime |
| isOpen | Boolean | No | - | Filter by open/closed status |
| minRating | Number | No | - | Minimum average rating (1-5) |

#### Example Request
```http
GET /api/salons/nearby?latitude=12.9716&longitude=77.5946&radius=5&sortBy=distance&limit=10
```

#### Business Logic

1. Validate latitude and longitude (valid ranges)
2. Convert radius from kilometers to meters for MongoDB query
3. Use MongoDB geospatial query (`$near`) to find salons
4. Calculate distance from user location to each salon
5. Filter by `isOpen` status if provided
6. Calculate current wait time for each salon (based on queue)
7. Apply rating filter if `minRating` provided
8. Sort results by specified field
9. Paginate results
10. Return salon list with distance and wait time

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "salons": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Elite Hair Studio",
        "description": "Premium hair cutting and styling",
        "location": {
          "type": "Point",
          "coordinates": [77.5946, 12.9716],
          "address": "123 MG Road, Bangalore",
          "city": "Bangalore",
          "state": "Karnataka",
          "pincode": "560001"
        },
        "distance": 2.5,
        "distanceUnit": "km",
        "images": [
          "https://cloudinary.com/salon1-img1.jpg",
          "https://cloudinary.com/salon1-img2.jpg"
        ],
        "contactNumber": "+919876543211",
        "rating": {
          "average": 4.5,
          "count": 120
        },
        "waitTime": 25,
        "waitTimeUnit": "minutes",
        "isOpen": true,
        "openingHours": {
          "monday": { "open": "09:00", "close": "21:00" },
          "tuesday": { "open": "09:00", "close": "21:00" },
          "wednesday": { "open": "09:00", "close": "21:00" },
          "thursday": { "open": "09:00", "close": "21:00" },
          "friday": { "open": "09:00", "close": "21:00" },
          "saturday": { "open": "09:00", "close": "21:00" },
          "sunday": { "closed": true }
        },
        "currentQueue": 3,
        "owner": {
          "_id": "507f1f77bcf86cd799439020",
          "name": "Salon Owner Name"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 48,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "userLocation": {
      "latitude": 12.9716,
      "longitude": 77.5946
    }
  }
}
```

#### Error Responses

**Invalid Coordinates (400)**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_COORDINATES",
    "message": "Invalid latitude or longitude",
    "details": ["Latitude must be between -90 and 90", "Longitude must be between -180 and 180"]
  }
}
```

#### Related Models
- **Salon Model:** Queries with geospatial index on `location.coordinates`
- **Booking Model:** Counts active bookings for queue calculation
- **Review Model:** Aggregates for average rating

#### Frontend Notes
- Always request location permission before calling this API
- Implement pull-to-refresh to update salon list
- Cache results for 5 minutes to reduce API calls
- Show loading state while fetching
- Handle empty state when no salons found
- Display distance in km or miles based on user preference

#### Performance Notes
- MongoDB geospatial index MUST be created on `location.coordinates`
- Cache wait time calculations for 2 minutes
- Consider implementing Redis cache for frequently requested locations
- Limit radius to max 50km to prevent slow queries

***

### 11. Get Salon by ID

**Endpoint:** Retrieve detailed salon information

**HTTP Method:** `GET`

**Route:** `/api/salons/:salonId`

**Access Level:** Public

**Authentication Required:** No

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | MongoDB ObjectId of salon |

#### Example Request
```http
GET /api/salons/507f1f77bcf86cd799439012
```

#### Business Logic

1. Validate salonId format (MongoDB ObjectId)
2. Find salon by ID in database
3. Populate owner information (name, contact)
4. Calculate current wait time based on active queue
5. Fetch recent reviews (last 10)
6. Calculate average ratings by category (ambiance, service, value)
7. Check if user has favorited this salon (if authenticated)
8. Return complete salon details

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "salon": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Elite Hair Studio",
      "description": "Premium hair cutting and styling with experienced professionals. We offer a wide range of services including haircuts, coloring, styling, and treatments.",
      "location": {
        "type": "Point",
        "coordinates": [77.5946, 12.9716],
        "address": "123 MG Road, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560001",
        "landmark": "Near City Center Mall"
      },
      "contactNumber": "+919876543211",
      "email": "elite@hairstudio.com",
      "website": "https://elitehair.com",
      "images": [
        "https://cloudinary.com/salon1-main.jpg",
        "https://cloudinary.com/salon1-interior1.jpg",
        "https://cloudinary.com/salon1-interior2.jpg",
        "https://cloudinary.com/salon1-services.jpg"
      ],
      "services": [
        {
          "_id": "507f1f77bcf86cd799439030",
          "name": "Men's Haircut",
          "description": "Professional haircut with styling",
          "price": 300,
          "duration": 30,
          "category": "Haircut"
        },
        {
          "_id": "507f1f77bcf86cd799439031",
          "name": "Hair Coloring",
          "description": "Full hair coloring service",
          "price": 1500,
          "duration": 90,
          "category": "Coloring"
        }
      ],
      "rating": {
        "average": 4.5,
        "count": 120,
        "breakdown": {
          "5": 70,
          "4": 35,
          "3": 10,
          "2": 3,
          "1": 2
        },
        "categories": {
          "ambiance": 4.6,
          "service": 4.5,
          "value": 4.3
        }
      },
      "waitTime": 25,
      "currentQueue": 3,
      "isOpen": true,
      "openingHours": {
        "monday": { "open": "09:00", "close": "21:00" },
        "tuesday": { "open": "09:00", "close": "21:00" },
        "wednesday": { "open": "09:00", "close": "21:00" },
        "thursday": { "open": "09:00", "close": "21:00" },
        "friday": { "open": "09:00", "close": "21:00" },
        "saturday": { "open": "09:00", "close": "21:00" },
        "sunday": { "closed": true }
      },
      "amenities": ["WiFi", "AC", "Parking", "Card Payment"],
      "owner": {
        "_id": "507f1f77bcf86cd799439020",
        "name": "Rajesh Kumar",
        "phone": "+919876543211"
      },
      "recentReviews": [
        {
          "_id": "507f1f77bcf86cd799439040",
          "user": {
            "_id": "507f1f77bcf86cd799439011",
            "name": "John Doe",
            "profileImage": "https://cloudinary.com/user.jpg"
          },
          "rating": 5,
          "comment": "Excellent service and great ambiance!",
          "createdAt": "2025-12-10T14:30:00.000Z"
        }
      ],
      "totalReviews": 120,
      "isFavorite": false,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2025-12-12T20:00:00.000Z"
    }
  }
}
```

#### Error Responses

**Invalid Salon ID (400)**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SALON_ID",
    "message": "Invalid salon ID format"
  }
}
```

**Salon Not Found (404)**
```json
{
  "success": false,
  "error": {
    "code": "SALON_NOT_FOUND",
    "message": "Salon not found"
  }
}
```

#### Related Models
- **Salon Model:** Main salon document
- **Service Model:** Embedded services array
- **Review Model:** Aggregated reviews with user details
- **Booking Model:** Current queue count

#### Frontend Notes
- Cache salon details for 10 minutes
- Show skeleton loader while fetching
- Implement image carousel for salon images
- Display "Call Now" button with contact number
- Show "Get Directions" button linking to maps
- Highlight if salon is in user's favorites

***

### 12. Search Salons

**Endpoint:** Search salons by name, services, or location

**HTTP Method:** `GET`

**Route:** `/api/salons/search`

**Access Level:** Public

**Authentication Required:** No

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | String | Yes | - | Search query (salon name, service) |
| city | String | No | - | Filter by city |
| latitude | Number | No | - | User latitude for distance sorting |
| longitude | Number | No | - | User longitude for distance sorting |
| page | Number | No | 1 | Page number |
| limit | Number | No | 20 | Results per page |

#### Example Request
```http
GET /api/salons/search?q=hair coloring&city=Bangalore&page=1&limit=10
```

#### Business Logic

1. Parse and sanitize search query
2. Create text search index on salon name, description, services
3. Search across multiple fields (name, services, description)
4. Filter by city if provided
5. Calculate distance if coordinates provided
6. Sort by relevance score, then distance
7. Paginate results
8. Return matching salons with highlighted search terms

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "salons": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Elite Hair Studio",
        "description": "Premium hair cutting and styling",
        "location": {
          "address": "123 MG Road, Bangalore",
          "city": "Bangalore"
        },
        "distance": 3.2,
        "rating": {
          "average": 4.5,
          "count": 120
        },
        "matchedServices": ["Hair Coloring", "Hair Styling"],
        "relevanceScore": 0.92,
        "images": ["https://cloudinary.com/salon1.jpg"],
        "isOpen": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 27,
      "itemsPerPage": 10
    },
    "searchQuery": "hair coloring",
    "filters": {
      "city": "Bangalore"
    }
  }
}
```

#### Error Responses

**Missing Query (400)**
```json
{
  "success": false,
  "error": {
    "code": "MISSING_SEARCH_QUERY",
    "message": "Search query 'q' is required"
  }
}
```

#### Frontend Notes
- Implement debounced search (wait 300ms after user stops typing)
- Show search suggestions based on popular services
- Highlight matched terms in results
- Cache search results for same query

***

### 13. Create Salon (Owner Only)

**Endpoint:** Register a new salon

**HTTP Method:** `POST`

**Route:** `/api/salons`

**Access Level:** Salon Owner, Admin

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "Elite Hair Studio",
  "description": "Premium hair cutting and styling services",
  "location": {
    "address": "123 MG Road, Bangalore",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "coordinates": [77.5946, 12.9716],
    "landmark": "Near City Center Mall"
  },
  "contactNumber": "+919876543211",
  "email": "elite@hairstudio.com",
  "website": "https://elitehair.com",
  "openingHours": {
    "monday": { "open": "09:00", "close": "21:00" },
    "tuesday": { "open": "09:00", "close": "21:00" },
    "wednesday": { "open": "09:00", "close": "21:00" },
    "thursday": { "open": "09:00", "close": "21:00" },
    "friday": { "open": "09:00", "close": "21:00" },
    "saturday": { "open": "09:00", "close": "21:00" },
    "sunday": { "closed": true }
  },
  "services": [
    {
      "name": "Men's Haircut",
      "description": "Professional haircut with styling",
      "price": 300,
      "duration": 30,
      "category": "Haircut"
    }
  ],
  "amenities": ["WiFi", "AC", "Parking", "Card Payment"]
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| name | String | Yes | Min 3 chars, max 100 chars, unique |
| description | String | Yes | Min 20 chars, max 500 chars |
| location.address | String | Yes | Min 10 chars |
| location.coordinates | [Number] | Yes | [longitude, latitude] valid range |
| location.city | String | Yes | - |
| contactNumber | String | Yes | Valid phone format |
| email | String | No | Valid email format |
| openingHours | Object | Yes | All weekdays with open/close or closed |
| services | Array | Yes | At least 1 service |

#### Business Logic

1. Verify user role is "owner" or "admin"
2. Validate all required fields
3. Verify coordinates are valid (reverse geocode)
4. Check if salon name already exists in same city
5. Create GeoJSON Point for location
6. Create Salon document with owner reference
7. Upload default images if not provided
8. Return created salon with ID

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Salon created successfully",
  "data": {
    "salon": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Elite Hair Studio",
      "description": "Premium hair cutting and styling services",
      "location": {
        "type": "Point",
        "coordinates": [77.5946, 12.9716],
        "address": "123 MG Road, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560001"
      },
      "owner": "507f1f77bcf86cd799439020",
      "contactNumber": "+919876543211",
      "isOpen": false,
      "rating": {
        "average": 0,
        "count": 0
      },
      "createdAt": "2025-12-12T23:55:00.000Z"
    }
  }
}
```

#### Error Responses

**Insufficient Permissions (403)**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Only salon owners can create salons"
  }
}
```

**Duplicate Salon (409)**
```json
{
  "success": false,
  "error": {
    "code": "SALON_ALREADY_EXISTS",
    "message": "A salon with this name already exists in this city"
  }
}
```

#### Related Models
- **Salon Model:** Creates new salon document
- **User Model:** Links owner via userId

#### Notes
- Salon starts with `isOpen: false` (owner must activate)
- Email verification may be required before activation
- Consider implementing salon approval workflow for quality control

***

### 14. Update Salon (Owner Only)

**Endpoint:** Update salon information

**HTTP Method:** `PUT`

**Route:** `/api/salons/:salonId`

**Access Level:** Salon Owner (own salon), Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | Salon ID to update |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "Elite Hair Studio & Spa",
  "description": "Updated description",
  "contactNumber": "+919876543222",
  "openingHours": {
    "monday": { "open": "10:00", "close": "22:00" }
  },
  "services": [
    {
      "_id": "507f1f77bcf86cd799439030",
      "name": "Men's Haircut",
      "price": 350,
      "duration": 30
    }
  ],
  "amenities": ["WiFi", "AC", "Parking", "Card Payment", "Massage Chairs"]
}
```

#### Business Logic

1. Verify user is owner of this salon OR admin
2. Validate salonId and find salon
3. Check ownership: `salon.owner === req.user.userId`
4. Validate updated fields
5. Update only provided fields (partial update)
6. If services updated → recalculate average service duration
7. If opening hours updated → check current time and update `isOpen` status
8. Return updated salon

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Salon updated successfully",
  "data": {
    "salon": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Elite Hair Studio & Spa",
      "description": "Updated description",
      "contactNumber": "+919876543222",
      "services": [...],
      "amenities": [...],
      "updatedAt": "2025-12-12T23:55:00.000Z"
    }
  }
}
```

#### Error Responses

**Unauthorized (403)**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_SALON_ACCESS",
    "message": "You do not have permission to update this salon"
  }
}
```

#### Notes
- Only salon owner or admin can update
- Partial updates supported (send only changed fields)
- Location coordinates cannot be changed (requires admin approval)

***

### 15. Delete Salon (Owner/Admin Only)

**Endpoint:** Delete salon

**HTTP Method:** `DELETE`

**Route:** `/api/salons/:salonId`

**Access Level:** Salon Owner (own salon), Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | Salon ID to delete |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Verify user is owner or admin
2. Check for active bookings (cannot delete if active bookings exist)
3. Cancel all pending bookings
4. Soft delete salon (set `isDeleted: true, deletedAt: timestamp`)
5. Remove from search indexes
6. Delete salon images from Cloudinary
7. Keep reviews for historical purposes (anonymize salon reference)
8. Return success

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Salon deleted successfully",
  "data": {
    "deleted": true,
    "deletedAt": "2025-12-12T23:55:00.000Z",
    "affectedBookings": 2
  }
}
```

#### Error Responses

**Active Bookings (422)**
```json
{
  "success": false,
  "error": {
    "code": "ACTIVE_BOOKINGS_EXIST",
    "message": "Cannot delete salon with active bookings",
    "details": ["3 active bookings must be completed or cancelled first"]
  }
}
```

#### Notes
- **Soft delete** recommended (set flag instead of removing document)
- Notify users with pending bookings
- Consider 30-day grace period before permanent deletion

***

### 16. Upload Salon Images (Owner Only)

**Endpoint:** Upload salon images

**HTTP Method:** `POST`

**Route:** `/api/salons/:salonId/images`

**Access Level:** Salon Owner (own salon), Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | Salon ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
```
images: <FILE[]> (Multiple JPEG/PNG files, max 10 images, 5MB each)
```

#### Business Logic

1. Verify ownership of salon
2. Validate file types (JPEG, PNG only)
3. Validate file sizes (max 5MB each)
4. Limit total images to 10 per salon
5. Upload to Cloudinary in parallel
6. Generate thumbnails (800x600)
7. Add image URLs to salon's `images` array
8. Return uploaded image URLs

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "uploadedImages": [
      {
        "url": "https://cloudinary.com/salon1-img1.jpg",
        "thumbnail": "https://cloudinary.com/salon1-img1-thumb.jpg",
        "publicId": "salons/507f1f77bcf86cd799439012/img1"
      },
      {
        "url": "https://cloudinary.com/salon1-img2.jpg",
        "thumbnail": "https://cloudinary.com/salon1-img2-thumb.jpg",
        "publicId": "salons/507f1f77bcf86cd799439012/img2"
      }
    ],
    "totalImages": 5
  }
}
```

#### Error Responses

**Image Limit Exceeded (400)**
```json
{
  "success": false,
  "error": {
    "code": "IMAGE_LIMIT_EXCEEDED",
    "message": "Maximum 10 images allowed per salon",
    "details": ["Current: 8 images, Attempted: 5 new images"]
  }
}
```

#### Notes
- First uploaded image becomes primary/thumbnail
- Implement image compression (quality: 80%)
- Store Cloudinary public_id for deletion
- Consider implementing image moderation API

***

## Booking APIs

### 17. Create Booking

**Endpoint:** Book a salon service (join queue)

**HTTP Method:** `POST`

**Route:** `/api/bookings`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "salonId": "507f1f77bcf86cd799439012",
  "services": [
    "507f1f77bcf86cd799439030",
    "507f1f77bcf86cd799439031"
  ],
  "scheduledTime": "2025-12-13T14:00:00.000Z",
  "notes": "Please use organic products"
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| salonId | ObjectId | Yes | Valid salon ID, must exist |
| services | ObjectId[] | Yes | Array of service IDs, at least 1 |
| scheduledTime | Date | No | Future datetime, within salon hours |
| notes | String | No | Max 500 chars |

#### Business Logic

1. Validate user authentication
2. Verify salon exists and is open
3. Validate all service IDs belong to this salon
4. Calculate total duration (sum of all service durations)
5. Calculate total price (sum of all service prices)
6. Check salon operating hours for scheduledTime
7. Find current queue position (count active bookings + 1)
8. Calculate estimated start time based on queue
9. Create Booking document with status "pending"
10. Send confirmation notification to user
11. Notify salon owner of new booking
12. Return booking details with queue position

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "_id": "507f1f77bcf86cd799439050",
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "phone": "+919876543210"
      },
      "salon": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Elite Hair Studio",
        "address": "123 MG Road, Bangalore",
        "contactNumber": "+919876543211"
      },
      "services": [
        {
          "_id": "507f1f77bcf86cd799439030",
          "name": "Men's Haircut",
          "price": 300,
          "duration": 30
        },
        {
          "_id": "507f1f77bcf86cd799439031",
          "name": "Hair Coloring",
          "price": 1500,
          "duration": 90
        }
      ],
      "totalPrice": 1800,
      "totalDuration": 120,
      "status": "pending",
      "queuePosition": 3,
      "estimatedStartTime": "2025-12-13T14:45:00.000Z",
      "scheduledTime": "2025-12-13T14:00:00.000Z",
      "notes": "Please use organic products",
      "createdAt": "2025-12-12T23:55:00.000Z"
    }
  }
}
```

#### Error Responses

**Salon Closed (422)**
```json
{
  "success": false,
  "error": {
    "code": "SALON_CLOSED",
    "message": "Salon is currently closed",
    "details": ["Opening hours: Mon-Sat 09:00-21:00"]
  }
}
```

**Invalid Service (400)**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SERVICE",
    "message": "One or more services do not belong to this salon"
  }
}
```

**Duplicate Booking (409)**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_BOOKING",
    "message": "You already have an active booking at this salon",
    "details": ["Please complete or cancel existing booking first"]
  }
}
```

#### Related Models
- **Booking Model:** Creates new booking document
- **Salon Model:** Fetches salon details and validates services
- **Service Model:** Embedded in salon, validates service IDs
- **User Model:** Links user to booking

#### Frontend Notes
- Show estimated wait time BEFORE booking
- Display total price clearly
- Allow service selection with real-time price update
- Implement booking confirmation dialog
- Store booking ID for tracking
- Enable push notifications for booking updates

#### Edge Cases
- User cancels during creation → Handle gracefully
- Salon closes while booking → Reject with clear message
- Multiple bookings simultaneously → Lock mechanism to prevent race condition
- Service price changes during booking → Use cached price

***

### 18. Get User Bookings

**Endpoint:** Retrieve user's booking history

**HTTP Method:** `GET`

**Route:** `/api/bookings/my-bookings`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | String | No | all | Filter: all, pending, in-progress, completed, cancelled |
| page | Number | No | 1 | Page number |
| limit | Number | No | 20 | Results per page |
| sortBy | String | No | createdAt | Sort by: createdAt, scheduledTime, status |
| sortOrder | String | No | desc | asc or desc |

#### Example Request
```http
GET /api/bookings/my-bookings?status=pending&page=1&limit=10
```

#### Business Logic

1. Extract userId from JWT token
2. Query bookings where user === userId
3. Filter by status if provided
4. Populate salon and service details
5. Calculate current wait time for pending bookings
6. Sort by specified field and order
7. Paginate results
8. Return booking list

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "_id": "507f1f77bcf86cd799439050",
        "salon": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Elite Hair Studio",
          "address": "123 MG Road, Bangalore",
          "contactNumber": "+919876543211",
          "images": ["https://cloudinary.com/salon1.jpg"]
        },
        "services": [
          {
            "name": "Men's Haircut",
            "price": 300,
            "duration": 30
          }
        ],
        "totalPrice": 300,
        "totalDuration": 30,
        "status": "pending",
        "queuePosition": 2,
        "estimatedStartTime": "2025-12-13T14:30:00.000Z",
        "scheduledTime": "2025-12-13T14:00:00.000Z",
        "currentWaitTime": 25,
        "createdAt": "2025-12-12T23:55:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 27,
      "itemsPerPage": 10
    },
    "summary": {
      "totalBookings": 27,
      "pending": 1,
      "completed": 24,
      "cancelled": 2
    }
  }
}
```

#### Error Responses

**Invalid Status (400)**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "Invalid status value",
    "details": ["Allowed values: pending, in-progress, completed, cancelled"]
  }
}
```

#### Frontend Notes
- Show active bookings at top
- Group by status in tabs (Active, Past, Cancelled)
- Display queue position prominently for pending
- Show countdown timer for estimated start time
- Enable pull-to-refresh for real-time updates
- Cache completed bookings (they don't change)

***

### 19. Get Booking by ID

**Endpoint:** Retrieve detailed booking information

**HTTP Method:** `GET`

**Route:** `/api/bookings/:bookingId`

**Access Level:** Authenticated User (own booking), Salon Owner, Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookingId | ObjectId | Yes | Booking ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Validate bookingId format
2. Find booking by ID
3. Verify access: user is booking owner OR salon owner OR admin
4. Populate full salon details
5. Populate user details (if salon owner viewing)
6. Calculate real-time queue position
7. Return complete booking details

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "booking": {
      "_id": "507f1f77bcf86cd799439050",
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "phone": "+919876543210",
        "profileImage": "https://cloudinary.com/user.jpg"
      },
      "salon": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Elite Hair Studio",
        "location": {
          "address": "123 MG Road, Bangalore",
          "coordinates": [77.5946, 12.9716]
        },
        "contactNumber": "+919876543211",
        "images": ["https://cloudinary.com/salon1.jpg"]
      },
      "services": [
        {
          "_id": "507f1f77bcf86cd799439030",
          "name": "Men's Haircut",
          "description": "Professional haircut with styling",
          "price": 300,
          "duration": 30,
          "category": "Haircut"
        }
      ],
      "totalPrice": 300,
      "totalDuration": 30,
      "status": "pending",
      "queuePosition": 2,
      "estimatedStartTime": "2025-12-13T14:30:00.000Z",
      "actualStartTime": null,
      "completionTime": null,
      "scheduledTime": "2025-12-13T14:00:00.000Z",
      "notes": "Please use organic products",
      "cancellationReason": null,
      "createdAt": "2025-12-12T23:55:00.000Z",
      "updatedAt": "2025-12-12T23:55:00.000Z",
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2025-12-12T23:55:00.000Z"
        }
      ]
    }
  }
}
```

#### Error Responses

**Unauthorized Access (403)**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_BOOKING_ACCESS",
    "message": "You do not have permission to view this booking"
  }
}
```

**Booking Not Found (404)**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_FOUND",
    "message": "Booking not found"
  }
}
```

#### Frontend Notes
- Show different views for user vs salon owner
- Display real-time queue position updates
- Show "Get Directions" for user
- Show "Contact Customer" for salon owner
- Enable status updates for salon owner

***

### 20. Cancel Booking

**Endpoint:** Cancel a booking

**HTTP Method:** `PATCH`

**Route:** `/api/bookings/:bookingId/cancel`

**Access Level:** Authenticated User (own booking), Salon Owner

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookingId | ObjectId | Yes | Booking ID to cancel |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "reason": "Emergency came up, need to reschedule"
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| reason | String | No | Max 500 chars |

#### Business Logic

1. Find booking by ID
2. Verify booking belongs to user OR user is salon owner
3. Check booking status (can only cancel "pending" bookings)
4. Check cancellation policy (e.g., no cancellation within 1 hour of scheduled time)
5. Update booking status to "cancelled"
6. Add cancellation reason and timestamp
7. Recalculate queue positions for remaining bookings
8. Send cancellation notification to user and salon
9. Add to status history
10. Return updated booking

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "booking": {
      "_id": "507f1f77bcf86cd799439050",
      "status": "cancelled",
      "cancellationReason": "Emergency came up, need to reschedule",
      "cancelledBy": "user",
      "cancelledAt": "2025-12-12T23:55:00.000Z",
      "refundEligible": false
    }
  }
}
```

#### Error Responses

**Already Started (422)**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_ALREADY_STARTED",
    "message": "Cannot cancel booking that has already started"
  }
}
```

**Late Cancellation (422)**
```json
{
  "success": false,
  "error": {
    "code": "LATE_CANCELLATION",
    "message": "Cannot cancel booking within 1 hour of scheduled time",
    "details": ["Scheduled time: 2025-12-13T14:00:00.000Z", "Current time: 2025-12-13T13:30:00.000Z"]
  }
}
```

#### Frontend Notes
- Show cancellation policy before confirming
- Require confirmation dialog
- Display reason input (optional but recommended)
- Update UI immediately after cancellation
- Remove from active bookings list

#### Edge Cases
- User cancels just before service starts → May incur penalty
- Salon cancels on behalf of user → Different notification
- Network failure during cancellation → Implement idempotency

***

### 21. Start Booking (Owner Only)

**Endpoint:** Mark booking as started (service in progress)

**HTTP Method:** `PATCH`

**Route:** `/api/bookings/:bookingId/start`

**Access Level:** Salon Owner (own salon)

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookingId | ObjectId | Yes | Booking ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Verify user is salon owner
2. Find booking and verify it belongs to owner's salon
3. Check booking status is "pending"
4. Verify this is the next booking in queue (queuePosition === 1)
5. Update status to "in-progress"
6. Set `actualStartTime` to current timestamp
7. Recalculate queue positions for remaining bookings
8. Send notification to user (your service has started)
9. Return updated booking

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Booking started successfully",
  "data": {
    "booking": {
      "_id": "507f1f77bcf86cd799439050",
      "status": "in-progress",
      "actualStartTime": "2025-12-13T14:32:00.000Z",
      "estimatedCompletionTime": "2025-12-13T15:02:00.000Z"
    }
  }
}
```

#### Error Responses

**Not Next in Queue (422)**
```json
{
  "success": false,
  "error": {
    "code": "NOT_NEXT_IN_QUEUE",
    "message": "This booking is not next in queue",
    "details": ["Current queue position: 3", "Complete previous bookings first"]
  }
}
```

#### Notes
- Only allow starting bookings in queue order
- Automatically update wait times for other users
- Send push notification to user

***

### 22. Complete Booking (Owner Only)

**Endpoint:** Mark booking as completed

**HTTP Method:** `PATCH`

**Route:** `/api/bookings/:bookingId/complete`

**Access Level:** Salon Owner (own salon)

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookingId | ObjectId | Yes | Booking ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Verify user is salon owner
2. Find booking and verify ownership
3. Check status is "in-progress"
4. Update status to "completed"
5. Set `completionTime` to current timestamp
6. Calculate actual duration (completionTime - actualStartTime)
7. Send notification to user (service completed, please review)
8. Update salon statistics (total bookings, average service time)
9. Return updated booking

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Booking completed successfully",
  "data": {
    "booking": {
      "_id": "507f1f77bcf86cd799439050",
      "status": "completed",
      "actualStartTime": "2025-12-13T14:32:00.000Z",
      "completionTime": "2025-12-13T15:05:00.000Z",
      "actualDuration": 33,
      "scheduledDuration": 30
    },
    "promptReview": true
  }
}
```

#### Error Responses

**Not In Progress (422)**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_IN_PROGRESS",
    "message": "Booking must be in progress to complete"
  }
}
```

#### Notes
- Prompt user to leave review after completion
- Update salon analytics in background
- Archive completed booking after 30 days

***

### 23. Get Salon Queue (Owner Only)

**Endpoint:** View current queue for salon

**HTTP Method:** `GET`

**Route:** `/api/bookings/salon/:salonId/queue`

**Access Level:** Salon Owner (own salon), Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | Salon ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Verify user owns this salon OR is admin
2. Find all bookings for salon with status "pending" or "in-progress"
3. Sort by queuePosition
4. Populate user details for each booking
5. Calculate total estimated time to complete queue
6. Return sorted queue

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "_id": "507f1f77bcf86cd799439050",
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "phone": "+919876543210",
          "profileImage": "https://cloudinary.com/user.jpg"
        },
        "services": ["Men's Haircut", "Beard Trim"],
        "totalDuration": 45,
        "totalPrice": 450,
        "status": "in-progress",
        "queuePosition": 1,
        "actualStartTime": "2025-12-13T14:32:00.000Z",
        "estimatedCompletionTime": "2025-12-13T15:17:00.000Z",
        "scheduledTime": "2025-12-13T14:00:00.000Z",
        "notes": "Use organic products"
      },
      {
        "_id": "507f1f77bcf86cd799439051",
        "user": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Jane Smith",
          "phone": "+919876543220"
        },
        "services": ["Hair Coloring"],
        "totalDuration": 90,
        "totalPrice": 1500,
        "status": "pending",
        "queuePosition": 2,
        "estimatedStartTime": "2025-12-13T15:17:00.000Z",
        "scheduledTime": "2025-12-13T15:00:00.000Z"
      }
    ],
    "queueSummary": {
      "totalInQueue": 2,
      "inProgress": 1,
      "pending": 1,
      "estimatedWaitTime": 135,
      "averageServiceTime": 45
    }
  }
}
```

#### Frontend Notes
- Display as list with drag-to-reorder (future feature)
- Show countdown for current booking
- Highlight overdue bookings
- Enable quick actions (start, complete, cancel)
- Auto-refresh every 30 seconds

***

## Review APIs

### 24. Create Review

**Endpoint:** Submit a review for salon

**HTTP Method:** `POST`

**Route:** `/api/reviews`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "salonId": "507f1f77bcf86cd799439012",
  "bookingId": "507f1f77bcf86cd799439050",
  "rating": 5,
  "comment": "Excellent service! Very professional staff and great ambiance.",
  "categories": {
    "ambiance": 5,
    "service": 5,
    "value": 4
  },
  "images": [
    "https://cloudinary.com/review-img1.jpg"
  ]
}
```

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| salonId | ObjectId | Yes | Valid salon ID |
| bookingId | ObjectId | No | Must be completed booking |
| rating | Number | Yes | Integer 1-5 |
| comment | String | No | Max 1000 chars |
| categories | Object | No | Each rating 1-5 |
| images | String[] | No | Max 5 images |

#### Business Logic

1. Validate user authentication
2. Verify salon exists
3. If bookingId provided:
   - Verify booking exists and belongs to user
   - Verify booking status is "completed"
   - Check if review already exists for this booking
4. Validate rating (1-5 range)
5. Create Review document
6. Update salon's average rating (aggregate all reviews)
7. Update booking with review reference
8. Send notification to salon owner
9. Return created review

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "_id": "507f1f77bcf86cd799439060",
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "profileImage": "https://cloudinary.com/user.jpg"
      },
      "salon": "507f1f77bcf86cd799439012",
      "booking": "507f1f77bcf86cd799439050",
      "rating": 5,
      "comment": "Excellent service! Very professional staff and great ambiance.",
      "categories": {
        "ambiance": 5,
        "service": 5,
        "value": 4
      },
      "images": ["https://cloudinary.com/review-img1.jpg"],
      "isVerified": true,
      "helpful": 0,
      "createdAt": "2025-12-12T23:55:00.000Z"
    },
    "salonRating": {
      "newAverage": 4.6,
      "totalReviews": 121
    }
  }
}
```

#### Error Responses

**Already Reviewed (409)**
```json
{
  "success": false,
  "error": {
    "code": "REVIEW_ALREADY_EXISTS",
    "message": "You have already reviewed this booking"
  }
}
```

**Booking Not Completed (422)**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_COMPLETED",
    "message": "You can only review completed bookings"
  }
}
```

#### Related Models
- **Review Model:** Creates new review document
- **Booking Model:** Links review to booking
- **Salon Model:** Updates aggregated rating

#### Frontend Notes
- Show review form after booking completion
- Implement star rating component
- Allow image upload (before/after photos)
- Show character count for comment
- Disable submit if rating not selected
- Show preview before submitting

#### Edge Cases
- User tries to review without booking → Allow but mark as unverified
- User submits review multiple times → Prevent duplicates
- Salon deleted after booking → Allow review but mark salon as deleted

***

### 25. Get Salon Reviews

**Endpoint:** Retrieve reviews for a salon

**HTTP Method:** `GET`

**Route:** `/api/reviews/salon/:salonId`

**Access Level:** Public

**Authentication Required:** No

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | Salon ID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | Number | No | 1 | Page number |
| limit | Number | No | 10 | Results per page |
| sortBy | String | No | createdAt | Sort by: createdAt, rating, helpful |
| rating | Number | No | - | Filter by rating (1-5) |

#### Example Request
```http
GET /api/reviews/salon/507f1f77bcf86cd799439012?page=1&limit=10&sortBy=helpful
```

#### Business Logic

1. Validate salonId
2. Query reviews for this salon
3. Filter by rating if provided
4. Populate user details (name, profileImage)
5. Sort by specified field
6. Paginate results
7. Calculate rating distribution
8. Return reviews with summary

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "507f1f77bcf86cd799439060",
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "profileImage": "https://cloudinary.com/user.jpg"
        },
        "rating": 5,
        "comment": "Excellent service! Very professional staff.",
        "categories": {
          "ambiance": 5,
          "service": 5,
          "value": 4
        },
        "images": ["https://cloudinary.com/review-img1.jpg"],
        "isVerified": true,
        "helpful": 12,
        "createdAt": "2025-12-10T14:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 12,
      "totalItems": 120,
      "itemsPerPage": 10
    },
    "summary": {
      "averageRating": 4.5,
      "totalReviews": 120,
      "ratingDistribution": {
        "5": 70,
        "4": 35,
        "3": 10,
        "2": 3,
        "1": 2
      },
      "categoryAverages": {
        "ambiance": 4.6,
        "service": 4.5,
        "value": 4.3
      }
    }
  }
}
```

#### Frontend Notes
- Show rating distribution histogram
- Display verified badge for reviews with booking
- Implement "helpful" button (upvote reviews)
- Show review images in gallery
- Filter by star rating
- Sort by most helpful/recent

***

### 26. Update Review

**Endpoint:** Edit existing review

**HTTP Method:** `PUT`

**Route:** `/api/reviews/:reviewId`

**Access Level:** Authenticated User (own review)

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reviewId | ObjectId | Yes | Review ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "rating": 4,
  "comment": "Updated review after revisit",
  "categories": {
    "ambiance": 4,
    "service": 4,
    "value": 4
  }
}
```

#### Business Logic

1. Find review by ID
2. Verify review belongs to authenticated user
3. Check if review is within edit window (e.g., 30 days)
4. Update provided fields
5. Recalculate salon's average rating
6. Add to edit history (optional)
7. Return updated review

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "review": {
      "_id": "507f1f77bcf86cd799439060",
      "rating": 4,
      "comment": "Updated review after revisit",
      "updatedAt": "2025-12-12T23:55:00.000Z",
      "isEdited": true
    }
  }
}
```

#### Error Responses

**Edit Window Expired (422)**
```json
{
  "success": false,
  "error": {
    "code": "EDIT_WINDOW_EXPIRED",
    "message": "Reviews can only be edited within 30 days of submission"
  }
}
```

#### Notes
- Mark review as "edited"
- Allow editing within 30 days
- Consider storing edit history

***

### 27. Delete Review

**Endpoint:** Delete a review

**HTTP Method:** `DELETE`

**Route:** `/api/reviews/:reviewId`

**Access Level:** Authenticated User (own review), Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reviewId | ObjectId | Yes | Review ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Find review by ID
2. Verify user owns review OR is admin
3. Delete review document
4. Recalculate salon's average rating
5. Remove review reference from booking
6. Delete review images from Cloudinary
7. Return success

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": {
    "deleted": true
  }
}
```

#### Notes
- Soft delete recommended (mark as deleted)
- Update salon rating immediately
- Consider preventing deletion if review is old (>90 days)

***

### 28. Mark Review as Helpful

**Endpoint:** Upvote a review

**HTTP Method:** `PATCH`

**Route:** `/api/reviews/:reviewId/helpful`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reviewId | ObjectId | Yes | Review ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Find review by ID
2. Check if user already marked this review as helpful
3. If yes → remove helpful (toggle)
4. If no → add user to helpful list
5. Increment/decrement helpful counter
6. Return updated count

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Review marked as helpful",
  "data": {
    "helpful": 13,
    "userMarkedHelpful": true
  }
}
```

#### Notes
- Implement toggle behavior (click again to undo)
- Store user IDs who marked helpful (prevent spam)
- Use atomic increment for counter

***

## Favorite APIs

### 29. Add to Favorites

**Endpoint:** Add salon to user's favorites

**HTTP Method:** `POST`

**Route:** `/api/favorites`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "salonId": "507f1f77bcf86cd799439012"
}
```

#### Business Logic

1. Validate salonId exists
2. Check if salon already in user's favorites
3. Add salon to user's favorites array (in User model or separate Favorite model)
4. Increment salon's favorite count
5. Return success

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Salon added to favorites",
  "data": {
    "favoriteCount": 6,
    "isFavorite": true
  }
}
```

#### Error Responses

**Already Favorited (409)**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_FAVORITED",
    "message": "Salon is already in your favorites"
  }
}
```

***

### 30. Remove from Favorites

**Endpoint:** Remove salon from favorites

**HTTP Method:** `DELETE`

**Route:** `/api/favorites/:salonId`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | Salon ID |

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Remove salon from user's favorites array
2. Decrement salon's favorite count
3. Return success

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Salon removed from favorites",
  "data": {
    "favoriteCount": 5,
    "isFavorite": false
  }
}
```

***

### 31. Get User Favorites

**Endpoint:** Retrieve user's favorite salons

**HTTP Method:** `GET`

**Route:** `/api/favorites`

**Access Level:** Authenticated User

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| latitude | Number | No | - | User latitude for distance |
| longitude | Number | No | - | User longitude for distance |

#### Business Logic

1. Extract userId from token
2. Find user's favorite salon IDs
3. Fetch full salon details for each favorite
4. Calculate distance if coordinates provided
5. Calculate current wait time for each salon
6. Return salon list

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Elite Hair Studio",
        "location": {
          "address": "123 MG Road, Bangalore"
        },
        "distance": 2.5,
        "rating": {
          "average": 4.5,
          "count": 120
        },
        "waitTime": 25,
        "isOpen": true,
        "images": ["https://cloudinary.com/salon1.jpg"]
      }
    ],
    "totalFavorites": 5
  }
}
```

#### Frontend Notes
- Show empty state with "Browse salons" CTA
- Display distance if location available
- Show live wait time
- Enable quick booking from favorites
- Implement swipe-to-delete

***

## Analytics APIs

### 32. Get Salon Analytics (Owner Only)

**Endpoint:** Retrieve analytics for salon owner

**HTTP Method:** `GET`

**Route:** `/api/analytics/salon/:salonId`

**Access Level:** Salon Owner (own salon), Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | Salon ID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| startDate | Date | No | 30 days ago | Start date for analytics |
| endDate | Date | No | Now | End date for analytics |
| groupBy | String | No | day | Group by: day, week, month |

#### Example Request
```http
GET /api/analytics/salon/507f1f77bcf86cd799439012?startDate=2025-11-01&endDate=2025-12-12&groupBy=week
```

#### Business Logic

1. Verify user owns this salon OR is admin
2. Query bookings for date range
3. Aggregate data:
   - Total bookings by status
   - Revenue (completed bookings)
   - Average wait time
   - Peak hours
   - Popular services
   - Customer retention rate
   - Average rating over time
4. Group data by specified period
5. Return analytics

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBookings": 245,
      "completedBookings": 220,
      "cancelledBookings": 15,
      "noShowBookings": 10,
      "totalRevenue": 148500,
      "averageBookingValue": 675,
      "averageRating": 4.5,
      "totalReviews": 120,
      "uniqueCustomers": 180,
      "returningCustomers": 65,
      "customerRetentionRate": 36.1
    },
    "timeSeriesData": [
      {
        "period": "2025-11-18",
        "bookings": 35,
        "revenue": 21000,
        "averageWaitTime": 28,
        "cancelledBookings": 2
      },
      {
        "period": "2025-11-25",
        "bookings": 42,
        "revenue": 25200,
        "averageWaitTime": 32,
        "cancelledBookings": 1
      }
    ],
    "popularServices": [
      {
        "serviceId": "507f1f77bcf86cd799439030",
        "serviceName": "Men's Haircut",
        "bookingCount": 120,
        "revenue": 36000,
        "percentage": 48.9
      },
      {
        "serviceId": "507f1f77bcf86cd799439031",
        "serviceName": "Hair Coloring",
        "bookingCount": 65,
        "revenue": 97500,
        "percentage": 26.5
      }
    ],
    "peakHours": [
      {
        "hour": 14,
        "bookingCount": 45,
        "label": "2 PM - 3 PM"
      },
      {
        "hour": 18,
        "bookingCount": 52,
        "label": "6 PM - 7 PM"
      }
    ],
    "ratingTrend": [
      {
        "period": "2025-11",
        "averageRating": 4.3,
        "reviewCount": 38
      },
      {
        "period": "2025-12",
        "averageRating": 4.6,
        "reviewCount": 42
      }
    ],
    "dateRange": {
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-12-12T23:59:59.999Z"
    }
  }
}
```

#### Frontend Notes
- Display charts for time series data (line/bar charts)
- Show pie chart for popular services
- Highlight peak hours for capacity planning
- Show trend indicators (↑↓ compared to previous period)
- Enable date range picker
- Export analytics as PDF/CSV

***

### 33. Get Booking Statistics (Owner Only)

**Endpoint:** Detailed booking statistics

**HTTP Method:** `GET`

**Route:** `/api/analytics/salon/:salonId/bookings`

**Access Level:** Salon Owner (own salon), Admin

**Authentication Required:** Yes

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "bookingStats": {
      "totalBookings": 245,
      "statusBreakdown": {
        "pending": 5,
        "inProgress": 1,
        "completed": 220,
        "cancelled": 15,
        "noShow": 10
      },
      "cancellationRate": 6.1,
      "noShowRate": 4.1,
      "completionRate": 89.8,
      "averageServiceTime": 42,
      "averageWaitTime": 28
    },
    "customerStats": {
      "uniqueCustomers": 180,
      "newCustomers": 115,
      "returningCustomers": 65,
      "averageBookingsPerCustomer": 1.36
    },
    "revenueStats": {
      "totalRevenue": 148500,
      "averageRevenuePerBooking": 675,
      "projectedMonthlyRevenue": 185000
    }
  }
}
```

***

## Admin APIs

### 34. Get Platform Statistics (Admin Only)

**Endpoint:** Platform-wide analytics for admins

**HTTP Method:** `GET`

**Route:** `/api/admin/statistics`

**Access Level:** Admin

**Authentication Required:** Yes

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Business Logic

1. Verify user role is "admin"
2. Aggregate platform-wide statistics:
   - Total users, salons, bookings
   - Active users (logged in last 30 days)
   - Revenue by salon
   - Growth metrics
   - Top-rated salons
3. Return comprehensive statistics

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "platformStats": {
      "totalUsers": 15420,
      "totalSalons": 342,
      "totalBookings": 28750,
      "totalRevenue": 15250000,
      "activeUsers": 8920,
      "activeSalons": 298,
      "averageRating": 4.3
    },
    "growth": {
      "newUsersThisMonth": 1250,
      "newSalonsThisMonth": 28,
      "bookingsGrowth": 12.5,
      "revenueGrowth": 18.3
    },
    "topSalons": [
      {
        "salonId": "507f1f77bcf86cd799439012",
        "name": "Elite Hair Studio",
        "totalBookings": 520,
        "revenue": 350000,
        "rating": 4.8
      }
    ],
    "topCities": [
      {
        "city": "Bangalore",
        "salonCount": 145,
        "bookingCount": 12500
      },
      {
        "city": "Mumbai",
        "salonCount": 98,
        "bookingCount": 8900
      }
    ]
  }
}
```

#### Error Responses

**Unauthorized (403)**
```json
{
  "success": false,
  "error": {
    "code": "ADMIN_ACCESS_REQUIRED",
    "message": "This endpoint requires admin privileges"
  }
}
```

***

### 35. Get All Users (Admin Only)

**Endpoint:** Retrieve all users with filters

**HTTP Method:** `GET`

**Route:** `/api/admin/users`

**Access Level:** Admin

**Authentication Required:** Yes

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | Number | No | 1 | Page number |
| limit | Number | No | 50 | Results per page |
| role | String | No | - | Filter by role |
| search | String | No | - | Search by name, email, phone |
| sortBy | String | No | createdAt | Sort field |
| sortOrder | String | No | desc | asc or desc |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919876543210",
        "role": "user",
        "isVerified": true,
        "totalBookings": 12,
        "lastLogin": "2025-12-12T20:00:00.000Z",
        "createdAt": "2025-01-15T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 308,
      "totalItems": 15420,
      "itemsPerPage": 50
    }
  }
}
```

***

### 36. Delete User (Admin Only)

**Endpoint:** Delete a user account

**HTTP Method:** `DELETE`

**Route:** `/api/admin/users/:userId`

**Access Level:** Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | ObjectId | Yes | User ID to delete |

#### Business Logic

1. Verify admin role
2. Find user by ID
3. Cancel all active bookings
4. Soft delete or permanently delete based on policy
5. Anonymize user data in reviews
6. Return success

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deleted": true,
    "affectedBookings": 2
  }
}
```

***

### 37. Verify Salon (Admin Only)

**Endpoint:** Verify/approve a salon

**HTTP Method:** `PATCH`

**Route:** `/api/admin/salons/:salonId/verify`

**Access Level:** Admin

**Authentication Required:** Yes

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| salonId | ObjectId | Yes | Salon ID |

#### Request Body
```json
{
  "isVerified": true,
  "verificationNotes": "All documents verified"
}
```

#### Business Logic

1. Verify admin role
2. Find salon by ID
3. Update `isVerified` status
4. Add verification notes
5. Notify salon owner
6. Return updated salon

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Salon verified successfully",
  "data": {
    "salon": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Elite Hair Studio",
      "isVerified": true,
      "verifiedAt": "2025-12-12T23:55:00.000Z",
      "verificationNotes": "All documents verified"
    }
  }
}
```

***

## Complete Workflow Examples

### User Booking Flow (End-to-End)

```
1. User opens app
   └─> GET /api/auth/refresh-token (if token exists)

2. User grants location permission
   └─> Device provides coordinates: 12.9716, 77.5946

3. App fetches nearby salons
   └─> GET /api/salons/nearby?latitude=12.9716&longitude=77.5946&radius=5&limit=10
   └─> Displays list with distances and wait times

4. User taps on a salon
   └─> GET /api/salons/507f1f77bcf86cd799439012
   └─> Shows full salon details, services, reviews, wait time

5. User selects services and taps "Book Now"
   └─> POST /api/bookings
       Body: {
         "salonId": "507f1f77bcf86cd799439012",
         "services": ["507f1f77bcf86cd799439030"],
         "scheduledTime": "2025-12-13T14:00:00.000Z"
       }
   └─> Returns booking with queue position: 3, wait time: 25 mins

6. User waits and tracks booking
   └─> Periodically: GET /api/bookings/507f1f77bcf86cd799439050
   └─> Updates queue position in real-time

7. Salon owner starts service
   └─> PATCH /api/bookings/507f1f77bcf86cd799439050/start
   └─> User receives push notification

8. Service completed
   └─> PATCH /api/bookings/507f1f77bcf86cd799439050/complete
   └─> App prompts user to leave review

9. User submits review
   └─> POST /api/reviews
       Body: {
         "salonId": "507f1f77bcf86cd799439012",
         "bookingId": "507f1f77bcf86cd799439050",
         "rating": 5,
         "comment": "Great service!"
       }
   └─> Review saved, salon rating updated
```

***

### Salon Owner Daily Flow

```
1. Owner logs in
   └─> POST /api/auth/login
       Body: { "identifier": "owner@salon.com", "password": "***" }
   └─> Receives JWT token

2. Owner views today's queue
   └─> GET /api/bookings/salon/507f1f77bcf86cd799439012/queue
   └─> Displays 5 pending bookings

3. Owner starts first booking
   └─> PATCH /api/bookings/<bookingId>/start
   └─> Customer receives notification

4. Owner completes booking
   └─> PATCH /api/bookings/<bookingId>/complete
   └─> Moves to next in queue

5. Owner checks analytics (end of day)
   └─> GET /api/analytics/salon/507f1f77bcf86cd799439012?startDate=2025-12-12&endDate=2025-12-12
   └─> Views: 15 bookings today, ₹10,500 revenue, 4.6 avg rating

6. Owner updates opening hours
   └─> PUT /api/salons/507f1f77bcf86cd799439012
       Body: { "openingHours": { "monday": { "open": "10:00", "close": "22:00" } } }
```

***

## Rate Limiting & Security

### Rate Limiting Strategy

| Endpoint Category | Rate Limit | Window | Scope |
|-------------------|------------|--------|-------|
| Authentication | 5 requests | 15 min | Per IP |
| OTP Requests | 3 requests | 1 hour | Per phone |
| Public APIs (salons, reviews) | 100 requests | 15 min | Per IP |
| Authenticated APIs | 200 requests | 15 min | Per user |
| Admin APIs | 500 requests | 15 min | Per user |
| File Uploads | 10 uploads | 1 hour | Per user |

### Implementation
- Use `express-rate-limit` middleware
- Store rate limit counters in Redis
- Return `429 Too Many Requests` with `Retry-After` header
- Implement exponential backoff on client side

### Security Best Practices

**Token Security:**
- JWT tokens expire after 30 days
- Use HTTPS only in production
- Implement token blacklist for logout (Redis)
- Rotate JWT secret periodically

**Password Security:**
- Bcrypt with 10 salt rounds
- Minimum 8 characters, complexity requirements
- Implement account lockout after 5 failed attempts
- Force password reset after 90 days (optional)

**Input Validation:**
- Sanitize all user inputs
- Use Mongoose schema validation
- Implement request payload size limits (10MB)
- Validate ObjectId formats before querying

**API Security:**
- CORS configuration (whitelist frontend domains)
- Helmet.js for HTTP headers
- Input sanitization against NoSQL injection
- SQL/NoSQL injection prevention via parameterized queries

**File Upload Security:**
- Validate MIME types (not just extensions)
- Limit file sizes (5MB for images)
- Scan uploads for malware (ClamAV integration)
- Use signed URLs for Cloudinary uploads

***

## Frontend Integration Guide

### Authentication Flow

```dart
// 1. Store token securely
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage();

Future<void> saveToken(String token) async {
  await storage.write(key: 'jwt_token', value: token);
}

Future<String?> getToken() async {
  return await storage.read(key: 'jwt_token');
}

// 2. Add token to all API requests
import 'package:http/http.dart' as http;

Future<http.Response> authenticatedRequest(String url) async {
  final token = await getToken();
  return http.get(
    Uri.parse(url),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );
}

// 3. Handle token expiration
if (response.statusCode == 401) {
  // Token expired, refresh or re-login
  await refreshToken();
  // Retry original request
}
```

### Error Handling

```dart
class ApiException implements Exception {
  final String code;
  final String message;
  final List<String>? details;

  ApiException(this.code, this.message, [this.details]);

  factory ApiException.fromJson(Map<String, dynamic> json) {
    return ApiException(
      json['error']['code'],
      json['error']['message'],
      json['error']['details']?.cast<String>(),
    );
  }
}

// Usage
try {
  final response = await http.get(url);
  if (response.statusCode != 200) {
    final error = ApiException.fromJson(jsonDecode(response.body));
    throw error;
  }
} on ApiException catch (e) {
  // Show user-friendly error message
  showErrorDialog(e.message);
}
```

### Caching Strategy

```dart
// Use shared_preferences for simple caching
import 'package:shared_preferences/shared_preferences.dart';

class ApiCache {
  static Future<void> cacheSalonList(List<dynamic> salons) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('cached_salons', jsonEncode(salons));
    await prefs.setInt('cache_timestamp', DateTime.now().millisecondsSinceEpoch);
  }

  static Future<List<dynamic>?> getCachedSalons({int maxAgeMinutes = 10}) async {
    final prefs = await SharedPreferences.getInstance();
    final timestamp = prefs.getInt('cache_timestamp') ?? 0;
    final age = DateTime.now().millisecondsSinceEpoch - timestamp;
    
    if (age < maxAgeMinutes * 60 * 1000) {
      final cached = prefs.getString('cached_salons');
      return cached != null ? jsonDecode(cached) : null;
    }
    return null;
  }
}
```

### Real-Time Updates (Polling)

```dart
import 'dart:async';

class BookingTracker {
  Timer? _timer;

  void startTracking(String bookingId, Function(Map<String, dynamic>) onUpdate) {
    _timer = Timer.periodic(Duration(seconds: 30), (timer) async {
      final response = await http.get(
        Uri.parse('$baseUrl/api/bookings/$bookingId'),
        headers: {'Authorization': 'Bearer $token'},
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        onUpdate(data['data']['booking']);
      }
    });
  }

  void stopTracking() {
    _timer?.cancel();
  }
}

// Usage
final tracker = BookingTracker();
tracker.startTracking(bookingId, (booking) {
  setState(() {
    queuePosition = booking['queuePosition'];
    estimatedStartTime = booking['estimatedStartTime'];
  });
});
```

### Image Upload

```dart
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;

Future<String?> uploadProfileImage(File imageFile) async {
  final token = await getToken();
  final request = http.MultipartRequest(
    'POST',
    Uri.parse('$baseUrl/api/users/profile/upload-image'),
  );
  
  request.headers['Authorization'] = 'Bearer $token';
  request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
  
  final response = await request.send();
  
  if (response.statusCode == 200) {
    final responseBody = await response.stream.bytesToString();
    final data = jsonDecode(responseBody);
    return data['data']['imageUrl'];
  }
  
  return null;
}
```

### Common Mistakes to Avoid

1. **Storing Passwords Locally:**
   ```dart
   // ❌ NEVER DO THIS
   SharedPreferences.setString('user_password', password);
   
   // ✅ CORRECT: Only store JWT token securely
   FlutterSecureStorage().write(key: 'jwt_token', value: token);
   ```

2. **Exposing Sensitive Data in Logs:**
   ```dart
   // ❌ NEVER DO THIS
   print('User token: $jwtToken');
   print('API Response: ${response.body}');
   
   // ✅ CORRECT: Log without sensitive data
   debugPrint('API call successful');
   // Use production-safe logging
   if (kDebugMode) {
     print('Token received');
   }
   ```

3. **Not Handling Network Errors:**
   ```dart
   // ❌ BAD: Assumes network always works
   final response = await http.get(url);
   final data = jsonDecode(response.body);
   
   // ✅ CORRECT: Handle all error cases
   try {
     final response = await http.get(url).timeout(Duration(seconds: 10));
     if (response.statusCode == 200) {
       final data = jsonDecode(response.body);
       return data;
     } else {
       throw ApiException.fromJson(jsonDecode(response.body));
     }
   } on TimeoutException {
     throw NetworkException('Request timeout');
   } on SocketException {
     throw NetworkException('No internet connection');
   } catch (e) {
     throw UnknownException(e.toString());
   }
   ```

4. **Sending Unvalidated User Input:**
   ```dart
   // ❌ BAD: Sends raw user input
   final body = jsonEncode({'comment': userComment});
   
   // ✅ CORRECT: Validate and sanitize
   final sanitizedComment = userComment.trim();
   if (sanitizedComment.length > 1000) {
     throw ValidationException('Comment too long');
   }
   final body = jsonEncode({'comment': sanitizedComment});
   ```

5. **Not Implementing Retry Logic:**
   ```dart
   // ✅ IMPLEMENT: Exponential backoff retry
   Future<http.Response> retryableRequest(String url, {int maxRetries = 3}) async {
     int retries = 0;
     while (retries < maxRetries) {
       try {
         final response = await http.get(Uri.parse(url));
         if (response.statusCode == 200) return response;
         if (response.statusCode >= 500) {
           retries++;
           await Future.delayed(Duration(seconds: pow(2, retries).toInt()));
           continue;
         }
         throw ApiException.fromJson(jsonDecode(response.body));
       } catch (e) {
         if (retries == maxRetries - 1) rethrow;
         retries++;
         await Future.delayed(Duration(seconds: pow(2, retries).toInt()));
       }
     }
     throw Exception('Max retries exceeded');
   }
   ```

6. **Fetching Data on Every Widget Build:**
   ```dart
   // ❌ BAD: Fetches on every rebuild
   @override
   Widget build(BuildContext context) {
     fetchSalons(); // Called multiple times!
     return ListView(...);
   }
   
   // ✅ CORRECT: Fetch once in initState
   @override
   void initState() {
     super.initState();
     _fetchSalonsOnce();
   }
   
   Future<void> _fetchSalonsOnce() async {
     if (_salons == null) {
       final salons = await fetchSalons();
       setState(() => _salons = salons);
     }
   }
   ```

7. **Not Implementing Pull-to-Refresh:**
   ```dart
   // ✅ IMPLEMENT: RefreshIndicator for lists
   RefreshIndicator(
     onRefresh: () async {
       await fetchSalons(forceRefresh: true);
     },
     child: ListView.builder(...),
   )
   ```

8. **Ignoring Pagination:**
   ```dart
   // ✅ IMPLEMENT: Infinite scroll pagination
   class SalonListScreen extends StatefulWidget {
     @override
     _SalonListScreenState createState() => _SalonListScreenState();
   }
   
   class _SalonListScreenState extends State<SalonListScreen> {
     final ScrollController _scrollController = ScrollController();
     List<Salon> _salons = [];
     int _currentPage = 1;
     bool _hasMore = true;
     bool _isLoading = false;
   
     @override
     void initState() {
       super.initState();
       _fetchSalons();
       _scrollController.addListener(_scrollListener);
     }
   
     void _scrollListener() {
       if (_scrollController.position.pixels == 
           _scrollController.position.maxScrollExtent) {
         _fetchSalons();
       }
     }
   
     Future<void> _fetchSalons() async {
       if (_isLoading || !_hasMore) return;
       
       setState(() => _isLoading = true);
       
       final response = await http.get(
         Uri.parse('$baseUrl/api/salons/nearby?page=$_currentPage&limit=10'),
       );
       
       if (response.statusCode == 200) {
         final data = jsonDecode(response.body);
         final newSalons = (data['data']['salons'] as List)
             .map((json) => Salon.fromJson(json))
             .toList();
         
         setState(() {
           _salons.addAll(newSalons);
           _currentPage++;
           _hasMore = data['pagination']['hasNextPage'];
           _isLoading = false;
         });
       }
     }
   
     @override
     Widget build(BuildContext context) {
       return ListView.builder(
         controller: _scrollController,
         itemCount: _salons.length + (_hasMore ? 1 : 0),
         itemBuilder: (context, index) {
           if (index == _salons.length) {
             return Center(child: CircularProgressIndicator());
           }
           return SalonCard(salon: _salons[index]);
         },
       );
     }
   }
   ```

***

## API Versioning Strategy

### Current Implementation
- **Version:** v1 (implicit)
- **Base URL:** `/api/*`
- All endpoints currently under `/api/` prefix

### Future Versioning Plan

**URL-Based Versioning (Recommended):**
```
/api/v1/salons/nearby
/api/v2/salons/nearby
```

**Header-Based Versioning (Alternative):**
```http
GET /api/salons/nearby
Accept-Version: v1
```

### Version Migration Guidelines

1. **Backward Compatibility Window:**
   - Support previous version for minimum 6 months
   - Deprecated endpoints return `Deprecation` header
   - Example:
     ```http
     Deprecation: true
     Sunset: Sat, 13 Jun 2026 00:00:00 GMT
     Link: </api/v2/salons/nearby>; rel="successor-version"
     ```

2. **Breaking Changes Requiring New Version:**
   - Removing fields from response
   - Changing field data types
   - Modifying authentication mechanism
   - Changing URL structure

3. **Non-Breaking Changes (Same Version):**
   - Adding optional request parameters
   - Adding new fields to response
   - Adding new endpoints
   - Performance improvements

4. **Version Deprecation Process:**
   ```
   Month 1-3: Announce deprecation, add warning headers
   Month 4-6: Send email notifications to active API users
   Month 6: Disable old version, redirect to new version
   ```

***

## Database Schema Reference

### User Model

```javascript
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^\+[1-9]\d{1,14}$/ // E.164 format
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Never return in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'owner', 'admin'],
    default: 'user'
  },
  profileImage: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon'
  }],
  lastLogin: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
```

### Salon Model

```javascript
const salonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && // longitude
                 v[1] >= -90 && v[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates'
      }
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true,
      index: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    landmark: String
  },
  contactNumber: {
    type: String,
    required: true,
    match: /^\+[1-9]\d{1,14}$/
  },
  email: {
    type: String,
    lowercase: true,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
  },
  website: String,
  images: [{
    type: String
  }],
  services: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: 0
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 1
    },
    category: {
      type: String,
      enum: ['Haircut', 'Coloring', 'Styling', 'Treatment', 'Spa', 'Makeup', 'Other']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  openingHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  amenities: [{
    type: String,
    enum: ['WiFi', 'AC', 'Parking', 'Card Payment', 'Wheelchair Accessible', 'Kids Friendly']
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  favoriteCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Geospatial Index (CRITICAL for location queries)
salonSchema.index({ 'location.coordinates': '2dsphere' });

// Other Indexes
salonSchema.index({ owner: 1 });
salonSchema.index({ city: 1, 'rating.average': -1 });
salonSchema.index({ name: 'text', description: 'text' });
salonSchema.index({ isActive: 1, isDeleted: 1 });

// Virtual for checking if salon is currently open
salonSchema.virtual('isOpen').get(function() {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  
  const hours = this.openingHours[day];
  if (!hours || hours.closed) return false;
  
  return currentTime >= hours.open && currentTime <= hours.close;
});
```

### Booking Model

```javascript
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: true,
    index: true
  },
  services: [{
    serviceId: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    duration: Number
  }],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalDuration: {
    type: Number, // in minutes
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'pending',
    index: true
  },
  queuePosition: {
    type: Number,
    default: 0
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  estimatedStartTime: {
    type: Date
  },
  actualStartTime: {
    type: Date
  },
  completionTime: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 500
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'salon', 'admin']
  },
  cancelledAt: {
    type: Date
  },
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, {
  timestamps: true
});

// Compound Indexes
bookingSchema.index({ salon: 1, status: 1, queuePosition: 1 });
bookingSchema.index({ user: 1, status: 1, createdAt: -1 });
bookingSchema.index({ scheduledTime: 1, status: 1 });

// Virtual for checking if booking is active
bookingSchema.virtual('isActive').get(function() {
  return ['pending', 'in-progress'].includes(this.status);
});
```

### Review Model

```javascript
const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: true,
    index: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  categories: {
    ambiance: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 }
  },
  images: [{
    type: String
  }],
  isVerified: {
    type: Boolean,
    default: false // true if linked to completed booking
  },
  helpful: {
    type: Number,
    default: 0
  },
  helpfulBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  response: {
    text: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Compound Indexes
reviewSchema.index({ salon: 1, rating: 1 });
reviewSchema.index({ user: 1, salon: 1 }, { unique: true });
reviewSchema.index({ createdAt: -1 });

// Prevent multiple reviews per user per salon
reviewSchema.index({ user: 1, salon: 1 }, { 
  unique: true,
  partialFilterExpression: { isDeleted: false }
});
```

### OTP Model

```javascript
const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'reset_password'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// TTL Index - auto-delete after expiration
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for queries
otpSchema.index({ phone: 1, purpose: 1, verified: 1 });
```

***

## Environment Variables Reference

### Required Environment Variables

```bash
# Server Configuration
PORT=5000
NODE_ENV=development # development | production | test

# Database
MONGODB_URI=mongodb://localhost:27017/salon_booking
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/salon_booking

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=30d # Token expiration time

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# SMS Service (for OTP)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Google Maps API (for geocoding)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_PROD=https://app.trimzo.com

# Admin Credentials (Initial Setup)
ADMIN_EMAIL=admin@trimzo.com
ADMIN_PASSWORD=secure-admin-password

# Payment Gateway (Future)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Logging
LOG_LEVEL=info # error | warn | info | debug
LOG_FILE_PATH=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880 # 5MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg
```

### Environment-Specific Configuration

**Development (.env.development):**
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/salon_booking_dev
LOG_LEVEL=debug
RATE_LIMIT_MAX_REQUESTS=1000
```

**Production (.env.production):**
```bash
NODE_ENV=production
MONGODB_URI=${MONGODB_URI_PROD}
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=100
```

***

## Testing Guidelines

### API Testing with Postman/Thunder Client

**Collection Structure:**
```
Salon Booking API/
├── Auth/
│   ├── Register User
│   ├── Login User
│   ├── Send OTP
│   └── Verify OTP
├── Salons/
│   ├── Get Nearby Salons
│   ├── Get Salon by ID
│   └── Create Salon (Owner)
├── Bookings/
│   ├── Create Booking
│   ├── Get My Bookings
│   └── Cancel Booking
└── Reviews/
    ├── Create Review
    └── Get Salon Reviews
```

**Environment Variables in Postman:**
```json
{
  "baseUrl": "http://localhost:5000/api",
  "token": "{{login_token}}",
  "userId": "{{current_user_id}}",
  "salonId": "{{test_salon_id}}"
}
```

**Pre-request Script (Auto-login):**
```javascript
// Auto-refresh token if expired
const token = pm.environment.get("token");
if (!token) {
  pm.sendRequest({
    url: pm.environment.get("baseUrl") + "/auth/login",
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        identifier: "test@example.com",
        password: "Test123!"
      })
    }
  }, (err, res) => {
    if (!err) {
      const data = res.json();
      pm.environment.set("token", data.data.token);
    }
  });
}
```

### Unit Testing Example (Jest)

```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

describe('Auth API', () => {
  beforeAll(async () => {
    await User.deleteMany({}); // Clean database
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          phone: '+919876543210',
          password: 'Test123!'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          phone: '+919876543211',
          password: 'Test123!'
        })
        .expect(409);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test2@example.com',
          phone: '+919876543212',
          password: '123' // Too short
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'Test123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(401);
    });
  });
});
```

***

## Future Improvements

### Phase 1 (Q1 2026) - Performance & Reliability

1. **WebSocket Integration:**
   - Real-time queue position updates
   - Live booking status changes
   - Push notifications via Socket.io
   - Reduce polling frequency

2. **Redis Caching Layer:**
   - Cache nearby salon queries
   - Cache salon details for 10 minutes
   - Cache user sessions
   - Reduce database load by 60%

3. **Database Optimization:**
   - Implement read replicas for heavy read operations
   - Archive old bookings (>6 months) to separate collection
   - Optimize geospatial queries with compound indexes
   - Implement database connection pooling

4. **CDN Integration:**
   - Serve static assets via CloudFront/Cloudflare
   - Edge caching for salon images
   - Reduce image load time by 80%

### Phase 2 (Q2 2026) - Features

1. **Payment Integration:**
   - Stripe/Razorpay integration
   - Online booking deposits
   - Digital wallet support
   - Refund management

2. **Advanced Queue Management:**
   - Allow users to reserve specific time slots
   - Dynamic pricing based on demand
   - VIP queue (premium users)
   - Automated no-show detection

3. **Loyalty Program:**
   - Points system for bookings
   - Referral rewards
   - Membership tiers
   - Exclusive deals for loyal customers

4. **Advanced Analytics:**
   - Revenue forecasting
   - Customer lifetime value (CLV)
   - Churn prediction
   - A/B testing framework

### Phase 3 (Q3 2026) - Scale

1. **Multi-language Support:**
   - i18n implementation
   - Language detection from Accept-Language header
   - Localized content

2. **Microservices Architecture:**
   - Separate services for: Auth, Bookings, Payments, Notifications
   - Message queue (RabbitMQ/Kafka) for async communication
   - Service mesh (Istio) for orchestration

3. **Machine Learning Integration:**
   - Wait time prediction model
   - Personalized salon recommendations
   - Demand forecasting
   - Fraud detection

4. **Mobile App Push Notifications:**
   - FCM integration for Flutter
   - Booking reminders
   - Queue position updates
   - Promotional campaigns

### Phase 4 (Q4 2026) - Advanced Features

1. **Video Consultation:**
   - Integrated video calls (Twilio/Agora)
   - Virtual salon tours
   - Pre-booking consultations

2. **AI Chatbot:**
   - Customer support automation
   - Booking via chat
   - FAQ handling

3. **Salon Management Tools:**
   - Inventory management
   - Staff scheduling
   - Commission tracking
   - CRM integration

4. **Social Features:**
   - Share booking experiences
   - Before/after photo galleries
   - Social login (Google/Facebook)
   - Influencer partnerships

***

## Monitoring & Logging

### Logging Implementation

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'salon-booking-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Monitoring Metrics

**Key Metrics to Track:**
1. **API Performance:**
   - Response time (p50, p95, p99)
   - Request rate (requests/second)
   - Error rate (%)

2. **Business Metrics:**
   - Active users (DAU, MAU)
   - Bookings created/completed
   - Conversion rate (views → bookings)
   - Average booking value

3. **System Health:**
   - Database connection pool usage
   - Memory usage
   - CPU usage
   - Disk I/O

4. **Error Tracking:**
   - 4xx error breakdown
   - 5xx error frequency
   - Failed authentication attempts
   - Payment failures

**Tools:**
- **APM:** New Relic / Datadog
- **Error Tracking:** Sentry
- **Logs:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime:** Pingdom / UptimeRobot

***

## Deployment Guide

### Production Deployment Checklist

```
□ Environment variables configured
□ Database indexes created
□ MongoDB Atlas cluster provisioned
□ Cloudinary account configured
□ SMS service (Twilio) configured
□ Domain and SSL certificate ready
□ CORS whitelist updated
□ Rate limiting enabled
□ Logging configured
□ Monitoring tools integrated
□ Backup strategy implemented
□ CI/CD pipeline configured
□ Load balancer configured
□ Health check endpoint implemented
□ Graceful shutdown handling
□ Database migration scripts ready
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/salon_booking
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo-data:
```

### Health Check Endpoint

```javascript
// routes/health.js
router.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    checks: {
      database: 'unknown',
      redis: 'unknown'
    }
  };

  try {
    // Check MongoDB
    await mongoose.connection.db.admin().ping();
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'DEGRADED';
  }

  try {
    // Check Redis
    await redisClient.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'DEGRADED';
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

***

## Support & Contact

### API Documentation Updates
This documentation should be updated whenever:
- New endpoints are added
- Request/response formats change
- Authentication mechanism changes
- Business logic modifications occur

### For Developers
- **Repository:** github.com/trimzo/api
- **Issue Tracker:** github.com/trimzo/api/issues
- **Wiki:** github.com/trimzo/api/wiki
- **API Changelog:** github.com/trimzo/api/CHANGELOG.md

### For Partners/Integrators
- **Developer Portal:** developer.trimzo.com
- **Support Email:** api-support@trimzo.com
- **API Status:** status.trimzo.com

***

## Glossary

| Term | Definition |
|------|------------|
| **Queue Position** | User's position in the booking queue (1 = next to be served) |
| **Wait Time** | Estimated minutes until service starts |
| **Active Booking** | Booking with status "pending" or "in-progress" |
| **Verified Review** | Review linked to a completed booking |
| **Geospatial Query** | MongoDB query using coordinates to find nearby locations |
| **JWT** | JSON Web Token - Authentication token format |
| **Soft Delete** | Marking record as deleted without removing from database |
| **Idempotency** | Operation that produces same result regardless of how many times executed |
| **Rate Limiting** | Restricting number of API requests per time window |
| **TTL Index** | Time-to-live index that auto-deletes expired documents |

***

**End of Documentation**

**Document Version:** 1.0  
**Last Updated:** December 13, 2025  
**Total Endpoints Documented:** 37  
**Pages:** Complete API Reference

This documentation is a living document and should be updated as the API evolves. For questions or clarifications, please contact the development team.