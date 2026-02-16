const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 }),
  body('preferences').optional().isObject()
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

    const { firstName, lastName, preferences } = req.body;
    const user = req.user; // Mongoose document from auth middleware

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (preferences) {
      // Deep merge or replace? Usually replace at top level or diligent merge.
      // Mongoose doesn't auto-merge partial objects in assignment unless using set.
      // Simple assignment of object replaces it. But we defined preferences as Object in schema.
      // Let's assume replace or we can merge manually if needed.
      // Existing code was `req.body[field]`.
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    // Log profile update
    await AuditLog.create({
      userId: user._id,
      action: 'profile_update',
      resource: 'user',
      resourceId: user._id.toString(),
      details: { firstName, lastName, preferences },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;