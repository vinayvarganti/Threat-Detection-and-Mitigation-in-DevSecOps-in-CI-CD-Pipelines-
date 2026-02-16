const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const { Project, Pipeline, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const axios = require('axios');
const scanService = require('../services/scanService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/projects');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `project-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.zip', '.tar', '.gz', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only zip, tar, gz, and rar files are allowed.'));
    }
  }
});

// Get all projects for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // Manual populate doesn't work easily for reverse relationships (pipelines) efficiently in one query without aggregate.
    // For now, we will skip including the "latest pipeline" in the list view to simplify, or fetch it separately if critical.
    // The frontend likely just lists projects.

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Fetch latest pipelines manually
    const pipelines = await Pipeline.find({ projectId: project._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Attach to project object (convert to POJO first)
    const projectData = project.toObject();
    projectData.pipelines = pipelines;

    res.json({
      success: true,
      data: { project: projectData }
    });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project'
    });
  }
});

// Create new project (file upload)
router.post('/upload', authenticateToken, upload.single('projectFile'), [
  body('name').isLength({ min: 1, max: 100 }).trim(),
  body('description').optional().isLength({ max: 500 }),
  body('language').optional().isLength({ max: 50 }),
  body('framework').optional().isLength({ max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Project file is required'
      });
    }

    const { name, description, language, framework, targetUrl } = req.body;

    const project = await Project.create({
      name,
      description,
      targetUrl, // Added targetUrl
      type: 'upload',
      language,
      framework,
      filePath: req.file.path,
      userId: req.user._id,
      metadata: {
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        uploadDate: new Date()
      }
    });

    // Log project creation
    await AuditLog.create({
      userId: req.user._id,
      action: 'project_create',
      resource: 'project',
      resourceId: project._id.toString(),
      details: { name, type: 'upload' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Project created: ${project.name} by ${req.user.email}`);

    // Trigger automated scan if enabled
    if (project.configuration && project.configuration.automation && project.configuration.automation.autoScan) {
      try {
        const pipeline = await Pipeline.create({
          name: `Initial Scan - ${project.name}`,
          projectId: project._id,
          triggerType: 'manual', // or 'auto'
          startTime: new Date(),
          status: 'running'
        });
        await scanService.startScan(pipeline._id);
        logger.info(`Auto-scan started for project: ${project.name}`);
      } catch (scanError) {
        logger.error(`Failed to trigger auto-scan for project ${project.name}: ${scanError.message}`);
        // Don't fail the request, just log it
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project }
    });
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project'
    });
  }
});

// Create new project (GitHub integration)
router.post('/github', authenticateToken, [
  body('name').isLength({ min: 1, max: 100 }).trim(),
  body('repositoryUrl').isURL().custom((value) => {
    const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    if (!githubUrlPattern.test(value)) {
      throw new Error('Must be a valid GitHub repository URL (https://github.com/username/repository)');
    }
    return true;
  }),
  body('branch').optional().isLength({ max: 50 }),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, repositoryUrl, branch = 'main', description, targetUrl } = req.body;

    const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    if (!githubUrlPattern.test(repositoryUrl)) {
      logger.warn(`GitHub Import Failed: Invalid URL format - ${repositoryUrl}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid GitHub repository URL format. expected: https://github.com/username/repository'
      });
    }

    const repoPath = repositoryUrl.replace('https://github.com/', '').replace(/\/$/, '');
    const [owner, repo] = repoPath.split('/');

    if (!owner || !repo || repoPath.split('/').length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GitHub repository URL. Must be in format: https://github.com/username/repository'
      });
    }

    // Validate if repository exists on GitHub
    try {
      await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
    } catch (githubError) {
      if (githubError.response && githubError.response.status === 404) {
        logger.warn(`GitHub Import Failed: Repo not found (404) - ${repositoryUrl}`);
        return res.status(400).json({
          success: false,
          message: 'GitHub repository not found. Please check the URL and ensure it is public.'
        });
      }
      logger.warn(`GitHub API validation warning for ${owner}/${repo}: ${githubError.message}`);
    }

    // Check if project with same repository already exists for this user
    const existingProject = await Project.findOne({
      userId: req.user._id,
      repositoryUrl: repositoryUrl
    });

    if (existingProject) {
      logger.warn(`GitHub Import Failed: Duplicate project - ${repositoryUrl}`);
      return res.status(400).json({
        success: false,
        message: 'A project with this GitHub repository already exists'
      });
    }

    const project = await Project.create({
      name,
      description,
      type: 'github',
      repositoryUrl,
      targetUrl, // Added targetUrl
      branch,
      userId: req.user._id,
      metadata: {
        connectedDate: new Date(),
        owner,
        repository: repo
      }
    });

    await AuditLog.create({
      userId: req.user._id,
      action: 'project_create',
      resource: 'project',
      resourceId: project._id.toString(),
      details: { name, type: 'github', repositoryUrl },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`GitHub project connected: ${project.name} by ${req.user.email}`);

    // Trigger automated scan if enabled
    if (project.configuration && project.configuration.automation && project.configuration.automation.autoScan) {
      try {
        const pipeline = await Pipeline.create({
          name: `Initial Scan - ${project.name}`,
          projectId: project._id,
          triggerType: 'manual',
          startTime: new Date(),
          status: 'running'
        });
        await scanService.startScan(pipeline._id);
        logger.info(`Auto-scan started for project: ${project.name}`);
      } catch (scanError) {
        logger.error(`Failed to trigger auto-scan for project ${project.name}: ${scanError.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'GitHub project connected successfully',
      data: { project }
    });
  } catch (error) {
    logger.error('Connect GitHub project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect GitHub project'
    });
  }
});

// Update project
router.put('/:id', authenticateToken, [
  body('name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('description').optional().isLength({ max: 500 }),
  body('configuration').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const allowedFields = ['name', 'description', 'configuration', 'status'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    await project.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'project_update',
      resource: 'project',
      resourceId: project._id.toString(),
      details: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project }
    });
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.filePath) {
      try {
        await fs.unlink(project.filePath);
      } catch (fileError) {
        logger.warn(`Failed to delete project file: ${fileError.message}`);
      }
    }

    await Project.deleteOne({ _id: project._id });

    await AuditLog.create({
      userId: req.user._id,
      action: 'project_delete',
      resource: 'project',
      resourceId: project._id.toString(),
      details: { name: project.name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Project deleted: ${project.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project'
    });
  }
});

// Get project statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const pipelines = await Pipeline.find({ projectId: project._id });

    const stats = {
      totalPipelines: pipelines.length,
      successfulPipelines: pipelines.filter(p => p.status === 'completed').length,
      failedPipelines: pipelines.filter(p => p.status === 'failed').length,
      riskScore: project.riskScore,
      lastScanDate: project.lastScanDate,
      status: project.status
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get project stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project statistics'
    });
  }
});

module.exports = router;