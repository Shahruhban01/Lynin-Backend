const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true, // Built-in index
    },
    name: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true, // Built-in index
    },
    fcmToken: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('User', userSchema);
