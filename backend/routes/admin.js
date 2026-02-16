const express = require('express');
const { User, Project, AuditLog } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken, requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const users = await User.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(users.count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get all projects
router.get('/projects', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const projects = await Project.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        projects: projects.rows,
        pagination: {
          total: projects.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(projects.count / limit)
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

// Get audit logs
router.get('/audit', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const logs = await AuditLog.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        logs: logs.rows,
        pagination: {
          total: logs.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(logs.count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

module.exports = router;