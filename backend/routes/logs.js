const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth'); // Fixed import
const logger = require('../utils/logger');

// @route   GET /api/logs
// @desc    Get server logs (last 100 lines)
// @access  Private (Admin/Manager only ideally, but 'protect' is good for now)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const logPath = path.join(__dirname, '../../logs/combined.log'); // Adjust path based on your structure

        if (!fs.existsSync(logPath)) {
            // If no log file exists yet, return empty list or message
            return res.status(200).json({ logs: [] });
        }

        // Read file
        // For large files, reading entire file is bad. But for this demo/MVP, it's okay.
        // Better approach: fs.read with buffer from end.
        // Let's implement a simple tail-like read.

        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.trim().split('\n');

        // Return last 100 lines
        const lastLines = lines.slice(-100);

        // Parse JSON logs if possible, or return as strings
        const parsedLogs = lastLines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return { message: line, timestamp: new Date() }; // Fallback
            }
        });

        // Reverse to show newest first
        res.json({ logs: parsedLogs.reverse() });

    } catch (err) {
        logger.error(`Error fetching logs: ${err.message}`);
        res.status(500).json({ message: 'Failed to fetch logs' });
    }
});

module.exports = router;
