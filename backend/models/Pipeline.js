const mongoose = require('mongoose');

const PipelineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  stage: {
    type: String,
    enum: [
      'initialization',
      'code_checkout',
      'sast_scan',
      'dependency_scan',
      'container_scan',
      'dast_scan',
      'security_gate',
      'deployment',
      'monitoring',
      'completed'
    ],
    default: 'initialization'
  },
  triggerType: {
    type: String,
    enum: ['manual', 'scheduled', 'webhook', 'api'],
    required: true
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  configuration: {
    type: Object,
    default: {
      scanTypes: ['sast', 'dast', 'dependency', 'container'],
      thresholds: {
        critical: 0,
        high: 5,
        medium: 10
      },
      deployment: {
        environment: 'staging',
        autoPromote: false
      }
    }
  },
  results: {
    type: Object,
    default: {
      summary: {
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0
      },
      stages: {},
      securityGate: {
        passed: false,
        blockers: []
      }
    }
  },
  logs: {
    type: String
  },
  errorMessage: {
    type: String
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Pipeline', PipelineSchema);