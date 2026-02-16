const express = require('express');
const { Vulnerability, Scan, Pipeline, Project } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all vulnerabilities for user's projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, severity, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (severity) query.severity = severity;
    if (status) query.status = status;

    // Filter by user ownership (Complex in NoSQL without heavy join or denormalization)
    // Strategy: Find all scanIDs belonging to user projects, then filter vulns by scanID.

    // 1. Get User Projects
    const userProjects = await Project.find({ userId: req.user._id }, '_id');
    const projectIds = userProjects.map(p => p._id);

    // 2. Get Pipelines
    const pipelines = await Pipeline.find({ projectId: { $in: projectIds } }, '_id');
    const pipelineIds = pipelines.map(p => p._id);

    // 3. Get Scans
    const scans = await Scan.find({ pipelineId: { $in: pipelineIds } }, '_id');
    const scanIds = scans.map(s => s._id);

    query.scanId = { $in: scanIds };

    const vulnerabilities = await Vulnerability.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('scanId'); // Populate specific fields if needed

    const total = await Vulnerability.countDocuments(query);

    // Remap for frontend if it expects deep nested objects like scan.pipeline.project
    // Ideally frontend should separate calls, but let's emulate structure if easy?
    // populate('scanId') gives us scan.
    // Deep populate in Mongoose: .populate({ path: 'scanId', populate: { path: 'pipelineId', populate: { path: 'projectId' } } })
    // Let's do deep populate to match previous "include" structure approximately.

    const fullyPopulatedVulns = await Vulnerability.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate({
        path: 'scanId',
        populate: {
          path: 'pipelineId',
          populate: {
            path: 'projectId',
            select: 'name id'
          }
        }
      });

    const remapped = fullyPopulatedVulns.map(v => {
      const obj = v.toObject();
      obj.scan = obj.scanId;
      if (obj.scan) {
        obj.scan.pipeline = obj.scan.pipelineId;
        if (obj.scan.pipeline) {
          obj.scan.pipeline.project = obj.scan.pipeline.projectId;
          delete obj.scan.pipeline.projectId;
        }
        delete obj.scan.pipelineId;
      }
      delete obj.scanId;
      return obj;
    });

    res.json({
      success: true,
      data: {
        vulnerabilities: remapped,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get vulnerabilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vulnerabilities'
    });
  }
});

// Update vulnerability status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    // Find vulnerability and check ownership
    const vulnerability = await Vulnerability.findById(req.params.id)
      .populate({
        path: 'scanId',
        populate: {
          path: 'pipelineId',
          populate: { path: 'projectId' }
        }
      });

    if (!vulnerability) {
      return res.status(404).json({
        success: false,
        message: 'Vulnerability not found'
      });
    }

    // Check ownership
    const projectOwnerId = vulnerability.scanId?.pipelineId?.projectId?.userId?.toString();
    if (projectOwnerId !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Vulnerability not found'
      });
    }

    vulnerability.status = status;
    vulnerability.resolvedDate = status === 'resolved' ? new Date() : null;

    await vulnerability.save();

    res.json({
      success: true,
      message: 'Vulnerability status updated',
      data: { vulnerability }
    });
  } catch (error) {
    logger.error('Update vulnerability status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vulnerability status'
    });
  }
});

module.exports = router;