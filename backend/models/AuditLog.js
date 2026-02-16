const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Changed from UUID
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: String // Can be ObjectId or other ID types
  },
  details: {
    type: Object
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);