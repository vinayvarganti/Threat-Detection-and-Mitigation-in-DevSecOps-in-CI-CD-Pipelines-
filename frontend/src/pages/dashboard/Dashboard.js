import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Security,
  Warning,
  CheckCircle,
  TrendingUp,
  Assessment,
  Speed
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeScans: 0,
    vulnerabilities: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    riskScore: 0,
    recentActivity: []
  });

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Fallback to initial state or show error in UI
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ color: `${color}.main`, mr: 1 }}>
            {icon}
          </Box>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        </Box>
        <Typography variant="h3" component="div" color={`${color}.main`}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const VulnerabilityCard = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Vulnerability Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="error.main">
                {stats.vulnerabilities.critical}
              </Typography>
              <Typography variant="caption">Critical</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {stats.vulnerabilities.high}
              </Typography>
              <Typography variant="caption">High</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {stats.vulnerabilities.medium}
              </Typography>
              <Typography variant="caption">Medium</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {stats.vulnerabilities.low}
              </Typography>
              <Typography variant="caption">Low</Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const RiskScoreCard = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Overall Risk Score
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h3" color={stats.riskScore > 7 ? 'error.main' : stats.riskScore > 4 ? 'warning.main' : 'success.main'}>
            {stats.riskScore}/10
          </Typography>
          <Box sx={{ ml: 2, flexGrow: 1 }}>
            <LinearProgress
              variant="determinate"
              value={stats.riskScore * 10}
              color={stats.riskScore > 7 ? 'error' : stats.riskScore > 4 ? 'warning' : 'success'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Based on current vulnerabilities and threat predictions
        </Typography>
      </CardContent>
    </Card>
  );

  const RecentActivityCard = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        {stats.recentActivity.map((activity) => (
          <Box key={activity.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ mr: 2 }}>
              {activity.type === 'scan_completed' && <CheckCircle color="success" />}
              {activity.type === 'vulnerability_found' && <Warning color="warning" />}
              {activity.type === 'threat_predicted' && <Security color="error" />}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2">
                {activity.type.replace('_', ' ').toUpperCase()} - {activity.project}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(activity.time).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Security Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome back, {user?.firstName}! Here's your security overview.
        </Typography>

        {/* Connection Status */}
        <Box sx={{ mt: 2 }}>
          <Chip
            icon={connected ? <CheckCircle /> : <Warning />}
            label={connected ? 'Real-time Connected' : 'Connection Lost'}
            color={connected ? 'success' : 'warning'}
            variant="outlined"
            size="small"
          />
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          You have {stats.vulnerabilities.critical} critical vulnerabilities that need immediate attention.
        </Alert>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Security />}
            onClick={() => navigate('/dashboard/upload')}
          >
            Upload Project
          </Button>
          <Button
            variant="outlined"
            startIcon={<Assessment />}
            onClick={() => navigate('/dashboard/vulnerabilities')}
          >
            View Reports
          </Button>
          <Button
            variant="outlined"
            startIcon={<TrendingUp />}
            onClick={() => navigate('/dashboard/threats')}
          >
            Threat Predictions
          </Button>
        </Box>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3}>
        {/* Top Row - Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Projects"
            value={stats.totalProjects}
            icon={<Assessment />}
            color="primary"
            subtitle="Active projects"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Scans"
            value={stats.activeScans}
            icon={<Speed />}
            color="info"
            subtitle="Currently running"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Critical Issues"
            value={stats.vulnerabilities.critical}
            icon={<Warning />}
            color="error"
            subtitle="Require immediate action"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Security Score"
            value={`${Math.round((10 - stats.riskScore) * 10)}%`}
            icon={<Security />}
            color="success"
            subtitle="Overall security health"
          />
        </Grid>

        {/* Second Row - Detailed Views */}
        <Grid item xs={12} md={6}>
          <VulnerabilityCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <RiskScoreCard />
        </Grid>

        {/* Third Row - Activity */}
        <Grid item xs={12}>
          <RecentActivityCard />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;