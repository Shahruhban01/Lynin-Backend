const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // ✅ Removed index: true — covered by compound index below
    },
    adminName: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String,
      default: null,
    },
    actionType: {
      type: String,
      enum: [
        'user_soft_delete',
        'user_restore',
        'salon_verify',
        'salon_unverify',
        'salon_disable',
        'salon_enable',
        'booking_view',
        'statistics_view',
        'admin_login',
      ],
      required: true,
      // ✅ Removed index: true — covered by compound index below
    },
    entityType: {
      type: String,
      enum: ['user', 'salon', 'booking', 'system'],
      required: true,
      // ✅ Removed index: true — covered by compound index below
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // ✅ Removed index: true — covered by compound index below
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      // ✅ Removed index: true — TTL index below already creates this index
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
adminAuditLogSchema.index({ adminId: 1, timestamp: -1 });
adminAuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
adminAuditLogSchema.index({ actionType: 1, timestamp: -1 });

// TTL index — auto-delete logs older than 2 years (63,072,000 seconds)
// ✅ This is the ONLY index on timestamp — no duplicate
adminAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
