const express = require('express');
const { Project, Vulnerability, Scan, User, AuditLog, Pipeline } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { role } = req.user;

        // Helper filter for projects
        const projectMatch = role === 'admin' ? {} : { userId };

        // 1. Total Projects
        const projectsCount = await Project.countDocuments(projectMatch);

        // Pre-fetch relevant IDs for filtering child resources (if not admin)
        let relevantScanIds = null;
        if (role !== 'admin') {
            const userProjects = await Project.find({ userId }).select('_id');
            const projectIds = userProjects.map(p => p._id);

            const userPipelines = await Pipeline.find({ projectId: { $in: projectIds } }).select('_id');
            const pipelineIds = userPipelines.map(p => p._id);

            const userScans = await Scan.find({ pipelineId: { $in: pipelineIds } }).select('_id');
            relevantScanIds = userScans.map(s => s._id);
        }

        // 2. Vulnerability Stats (broken down by severity)
        // Group vulnerabilities by severity
        const vulnMatch = relevantScanIds ? { scanId: { $in: relevantScanIds } } : {};

        const vulnStats = await Vulnerability.aggregate([
            { $match: vulnMatch },
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]);

        const severityCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        vulnStats.forEach(stat => {
            if (severityCounts.hasOwnProperty(stat._id)) {
                severityCounts[stat._id] = stat.count;
            }
        });

        // 3. Active Scans
        // Scans with status 'queued', 'in_progress', 'analyzing'
        const activeScanMatch = {
            status: { $in: ['queued', 'in_progress', 'analyzing'] }
        };

        // Use simpler logic: if we already have pipelineIds for user, filter by them
        if (role !== 'admin') {
            // We need to re-fetch pipelineIds if we want to check active scans (Scan -> Pipeline)
            // Or reuse the logic above if we want.
            // Let's do a reliable query:
            const userProjects = await Project.find({ userId }).select('_id');
            const projectIds = userProjects.map(p => p._id);
            const userPipelines = await Pipeline.find({ projectId: { $in: projectIds } }).select('_id');
            const pipelineIds = userPipelines.map(p => p._id);

            activeScanMatch.pipelineId = { $in: pipelineIds };
        }

        const activeScans = await Scan.countDocuments(activeScanMatch);


        // 4. Overall Risk Score
        // Average risk score of all projects
        const avgRiskResult = await Project.aggregate([
            { $match: projectMatch },
            { $group: { _id: null, avgRisk: { $avg: '$riskScore' } } }
        ]);

        const riskScore = avgRiskResult.length > 0
            ? parseFloat(avgRiskResult[0].avgRisk).toFixed(1)
            : 0;


        // 5. Recent Activity
        // Fetch recent audit logs/events
        const auditMatch = role === 'admin' ? {} : { userId };
        const recentActivity = await AuditLog.find(auditMatch)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'username');

        // Format recent activity
        const formattedActivity = recentActivity.map(log => ({
            id: log._id,
            type: log.action,
            project: log.details?.name || 'System',
            time: log.createdAt,
            description: `User ${log.userId ? log.userId.username : 'Unknown'} performed ${log.action}`
        }));

        res.json({
            success: true,
            data: {
                totalProjects: projectsCount,
                activeScans,
                vulnerabilities: severityCounts,
                riskScore: parseFloat(riskScore),
                recentActivity: formattedActivity
            }
        });

    } catch (error) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
});

module.exports = router;
