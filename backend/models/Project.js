const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['upload', 'github'],
    required: true
  },
  repositoryUrl: {
    type: String
  },
  targetUrl: {
    type: String,
    validate: {
      validator: function (v) {
        return !v || /^(http|https):\/\/[^ "]+$/.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  branch: {
    type: String,
    default: 'main'
  },
  language: {
    type: String
  },
  framework: {
    type: String
  },
  filePath: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  lastScanDate: {
    type: Date
  },
  configuration: {
    type: Object,
    default: {
      scanTypes: {
        sast: true,
        dast: true,
        dependency: true,
        container: true
      },
      thresholds: {
        critical: 0,
        high: 5,
        medium: 10,
        low: 20
      },
      notifications: {
        onScanComplete: true,
        onVulnerabilityFound: true,
        onThreatPredicted: true
      },
      automation: {
        autoScan: true,
        autoMitigation: false,
        scanSchedule: 'daily'
      }
    }
  },
  metadata: {
    type: Object,
    default: {}
  },
  sonarQubeConfig: {
    url: { type: String },
    token: { type: String },
    projectKey: { type: String },
    enabled: { type: Boolean, default: false }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', ProjectSchema);