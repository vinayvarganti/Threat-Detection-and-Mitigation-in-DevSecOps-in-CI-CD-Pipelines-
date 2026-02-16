const express = require('express');
const { Scan, Pipeline, Project, Vulnerability } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all scans for user's projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, pipelineId } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (pipelineId) query.pipelineId = pipelineId;

    // Filter by user's projects if not specific pipeline
    if (!pipelineId) {
      // Find all pipelines for user's projects
      const userProjects = await Project.find({ userId: req.user._id }, '_id');
      const projectIds = userProjects.map(p => p._id);

      const userPipelines = await Pipeline.find({ projectId: { $in: projectIds } }, '_id');
      const pipelineIds = userPipelines.map(p => p._id);

      // If no pipelineId filter, restrict to user's pipelines
      query.pipelineId = { $in: pipelineIds };
    } else {
      // Verify user owns the pipeline project
      const pipeline = await Pipeline.findById(pipelineId).populate('projectId');
      if (!pipeline || pipeline.projectId.userId.toString() !== req.user._id.toString()) {
        // If pipeline doesn't exist or belongs to another user, return empty or unauthorized?
        // Returning empty list is safer/easier
        query.pipelineId = null; // Forces empty result
      }
    }

    const scans = await Scan.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate({
        path: 'pipelineId',
        populate: { path: 'projectId', select: 'name' }
      });

    // Remap pipelineId -> pipeline for consistency if needed?
    // Frontend likely expects `pipeline` object.
    const remappedScans = scans.map(s => {
      const obj = s.toObject();
      obj.pipeline = obj.pipelineId;
      delete obj.pipelineId;
      return obj;
    });

    const total = await Scan.countDocuments(query);

    res.json({
      success: true,
      data: {
        scans: remappedScans,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get scans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scans'
    });
  }
});

// Get single scan
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id)
      .populate({
        path: 'pipelineId',
        populate: { path: 'projectId' }
      });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    // Authorization check
    if (scan.pipelineId.projectId.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found' // obscure existence
      });
    }

    // Fetch vulnerabilities manually (reverse relationship)
    // Assuming Vulnerability model has scanId
    const vulnerabilities = await Vulnerability.find({ scanId: scan._id });

    const scanObj = scan.toObject();
    scanObj.pipeline = scanObj.pipelineId;
    delete scanObj.pipelineId;
    scanObj.vulnerabilities = vulnerabilities;

    res.json({
      success: true,
      data: { scan: scanObj }
    });
  } catch (error) {
    logger.error('Get scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scan'
    });
  }
});

module.exports = router;