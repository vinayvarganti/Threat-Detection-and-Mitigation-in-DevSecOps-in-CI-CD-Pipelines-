const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register
router.post('/register', [
  body('username').isLength({ min: 3, max: 50 }).isAlphanumeric(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').isLength({ min: 1, max: 50 }),
  body('lastName').isLength({ min: 1, max: 50 })
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

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName
    });

    // Generate token
    const token = generateToken(user._id); // Mongoose uses _id

    // Log registration
    await AuditLog.create({
      userId: user._id,
      action: 'user_register',
      resource: 'user',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`New user registered: ${user.email}`);

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
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

    const { email, password } = req.body;

    // Find user with password
    // Mongoose: select('+password') to include password explicitly
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Log login
    await AuditLog.create({
      userId: user._id,
      action: 'user_login',
      resource: 'user',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`User logged in: ${user.email}`);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user, // Mongoose document toJSON handles removing sensitive fields if configured, but manual undefined is safer here given changed logic
        token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

// Logout (client-side token removal, server-side logging)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout
    await AuditLog.create({
      userId: req.user._id, // Assumes middleware populates req.user
      action: 'user_logout',
      resource: 'user',
      resourceId: req.user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router;