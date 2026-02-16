const mongoose = require('mongoose');

const ThreatPredictionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  pipelineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline'
  },
  threatType: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  probability: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  impact: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  description: {
    type: String
  },
  indicators: {
    type: Array,
    default: []
  },
  modelVersion: {
    type: String,
    required: true
  },
  features: {
    type: Object,
    default: {}
  },
  prediction: {
    type: Object,
    default: {
      timeframe: '24h',
      likelihood: 0,
      riskFactors: [],
      mitigationSuggestions: []
    }
  },
  status: {
    type: String,
    enum: ['active', 'monitoring', 'resolved', 'false_positive'],
    default: 'active'
  },
  validUntil: {
    type: Date
  },
  actualOutcome: {
    type: String,
    enum: ['occurred', 'prevented', 'unknown'],
    default: 'unknown'
  },
  feedback: {
    type: Object,
    default: {
      accuracy: null,
      usefulness: null,
      comments: null
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ThreatPrediction', ThreatPredictionSchema);