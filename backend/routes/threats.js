const express = require('express');
const { ThreatPrediction, Project, Pipeline, Scan } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const scanService = require('../services/scanService');

const router = express.Router();

// Trigger threat analysis manually
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Verify project ownership
    const project = await Project.findOne({ _id: projectId, userId: req.user._id });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Find latest pipeline for context (or create a dummy one if none exists, though ideally getting from scan)
    // For simplicity, let's grab the most recent scan if available
    let pipeline = await Pipeline.findOne({ projectId: project._id }).sort({ createdAt: -1 });

    // If no pipeline, we might need to create a temporary context/pipeline or fail responsibly.
    // Let's create a "Manual Analysis" pipeline context if none exists.
    if (!pipeline) {
      pipeline = await Pipeline.create({
        projectId: project._id,
        name: 'Manual Analysis ' + new Date().toISOString(),
        triggerType: 'manual',
        status: 'completed'
      });
    }

    // Fetch recent scans to analyze
    // We want scans that belong to this project. If we just created a pipeline, it has no scans.
    // So we should look for ANY recent scans for this project's pipelines.
    const pipelines = await Pipeline.find({ projectId: project._id }, '_id');
    const pipelineIds = pipelines.map(p => p._id);

    // Get last 5 scans to provide context
    const scans = await Scan.find({ pipelineId: { $in: pipelineIds } })
      .sort({ createdAt: -1 })
      .limit(5);

    if (scans.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No scans found to analyze. Please upload vulnerabilities or run a scan first.'
      });
    }

    // Run prediction
    await scanService.runThreatPrediction(project, pipeline, scans);

    // Fetch the newly created predictions
    const predictions = await ThreatPrediction.find({ pipelineId: pipeline._id });

    res.json({
      success: true,
      message: 'Threat analysis completed',
      data: {
        threats: predictions
      }
    });

  } catch (error) {
    logger.error('Analyze threats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze threats'
    });
  }
});

// Get all threat predictions for user's projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, severity, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (severity) query.severity = severity;
    if (status) query.status = status;

    // Filter by user's projects
    const userProjects = await Project.find({ userId: req.user._id }, '_id');
    const projectIds = userProjects.map(p => p._id);

    query.projectId = { $in: projectIds };

    const threats = await ThreatPrediction.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('projectId', 'name'); // Populate project name

    // Remap for frontend
    const remappedThreats = threats.map(t => {
      const obj = t.toObject();
      obj.project = obj.projectId; // Map projectId -> project
      delete obj.projectId;
      return obj;
    });

    const total = await ThreatPrediction.countDocuments(query);

    res.json({
      success: true,
      data: {
        threats: remappedThreats,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get threats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch threat predictions'
    });
  }
});

// Update threat prediction status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    // Find threat
    const threat = await ThreatPrediction.findById(req.params.id).populate('projectId');

    if (!threat) {
      return res.status(404).json({
        success: false,
        message: 'Threat prediction not found'
      });
    }

    // Check ownership
    // threat.projectId is the populated Project document
    if (threat.projectId.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Threat prediction not found'
      });
    }

    threat.status = status;
    await threat.save();

    const threatObj = threat.toObject();
    threatObj.project = threatObj.projectId;
    delete threatObj.projectId;

    res.json({
      success: true,
      message: 'Threat prediction status updated',
      data: { threat: threatObj }
    });
  } catch (error) {
    logger.error('Update threat status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update threat status'
    });
  }
});

module.exports = router;