const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  pipelineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline',
    required: true
  },
  type: {
    type: String,
    enum: ['sast', 'dast', 'dependency', 'container', 'code-quality'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'scanning', 'completed', 'failed'],
    default: 'pending'
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  result: {
    type: Object,
    default: {
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    }
  },
  rawOutput: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Scan', ScanSchema);