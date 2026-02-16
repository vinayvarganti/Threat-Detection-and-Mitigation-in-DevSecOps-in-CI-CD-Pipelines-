const express = require('express');
const { Pipeline, Project, Scan } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const scanService = require('../services/scanService');

const router = express.Router();

// Get all pipelines for user's projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    // Find projects for this user first
    const userProjects = await Project.find({ userId: req.user._id }, '_id');
    const projectIds = userProjects.map(p => p._id);

    query.projectId = { $in: projectIds };

    const pipelines = await Pipeline.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('projectId', 'name'); // Populate project name

    // Helper to attach scans
    const pipelinesWithScans = await Promise.all(pipelines.map(async (pipeline) => {
      const scans = await Scan.find({ pipelineId: pipeline._id });
      const pObj = pipeline.toObject();
      pObj.project = pObj.projectId; // Remap for frontend consistency if needed
      delete pObj.projectId;
      pObj.scans = scans;
      return pObj;
    }));

    const total = await Pipeline.countDocuments(query);

    res.json({
      success: true,
      data: {
        pipelines: pipelinesWithScans,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get pipelines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipelines'
    });
  }
});

// Create new pipeline
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, name, configuration } = req.body;

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const pipeline = await Pipeline.create({
      name,
      projectId,
      configuration,
      triggerType: 'manual',
      startTime: new Date()
    });

    // Trigger Security Scan
    // We don't await the execution (handled in service), but we await the creation of scan records
    const scans = await scanService.startScan(pipeline._id);

    res.status(201).json({
      success: true,
      message: 'Pipeline created and scan started',
      data: { pipeline, scans }
    });
  } catch (error) {
    logger.error('Create pipeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pipeline'
    });
  }
});

module.exports = router;