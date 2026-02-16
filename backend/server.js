const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// sequelize import removed
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const scanRoutes = require('./routes/scans');
const vulnerabilityRoutes = require('./routes/vulnerabilities');
const pipelineRoutes = require('./routes/pipelines');
const threatRoutes = require('./routes/threats');
// const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (required for rate limiting behind proxy)
const server = createServer(app);
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow any origin for development stability
    callback(null, true);
  },
  credentials: true
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  trustProxy: false // Disable proxy trust for local development
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    logger.info(`Client ${socket.id} joined project ${projectId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/vulnerabilities', vulnerabilityRoutes);
app.use('/api/pipelines', pipelineRoutes);
// ... (previous routes)
app.use('/api/threats', threatRoutes);
app.use('/api/logs', require('./routes/logs')); // Added logs route
// app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ... (rest of file)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Database connection and server startup
const connectDB = require('./config/db');

// ... (previous imports)

// Connect to database
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();


module.exports = app;