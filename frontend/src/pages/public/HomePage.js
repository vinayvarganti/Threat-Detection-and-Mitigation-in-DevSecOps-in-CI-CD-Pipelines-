import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  Chip
} from '@mui/material';
import {
  Security,
  Speed,
  AutoFixHigh,
  Visibility,
  CloudQueue,
  IntegrationInstructions
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Security fontSize="large" color="primary" />,
      title: 'Proactive Security',
      description: 'Early vulnerability detection in CI/CD pipelines with comprehensive security scanning.'
    },
    {
      icon: <AutoFixHigh fontSize="large" color="primary" />,
      title: 'AI-Powered Threats',
      description: 'Machine learning-based threat prediction and automated mitigation responses.'
    },
    {
      icon: <Speed fontSize="large" color="primary" />,
      title: 'Real-time Monitoring',
      description: 'Continuous security monitoring with instant alerts and threat notifications.'
    },
    {
      icon: <Visibility fontSize="large" color="primary" />,
      title: 'Comprehensive Visibility',
      description: 'Complete visibility into security posture with detailed reports and analytics.'
    },
    {
      icon: <CloudQueue fontSize="large" color="primary" />,
      title: 'Multi-Cloud Support',
      description: 'Deploy and monitor across different cloud environments seamlessly.'
    },
    {
      icon: <IntegrationInstructions fontSize="large" color="primary" />,
      title: 'Easy Integration',
      description: 'Simple integration with existing CI/CD pipelines and development workflows.'
    }
  ];

  const stats = [
    { label: 'Vulnerabilities Detected', value: '10,000+' },
    { label: 'Threats Prevented', value: '2,500+' },
    { label: 'Projects Protected', value: '500+' },
    { label: 'Response Time', value: '<5min' }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          py: 12,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
            Proactive Threat Detection & Mitigation
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 4, opacity: 0.9 }}>
            Secure your DevSecOps pipelines with AI-powered threat prediction and automated security responses
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              color="secondary"
              onClick={() => navigate('/register')}
              sx={{ px: 4, py: 1.5 }}
            >
              Get Started Free
            </Button>
            <Button
              variant="outlined"
              size="large"
              color="inherit"
              onClick={() => navigate('/features')}
              sx={{ px: 4, py: 1.5, borderColor: 'white', color: 'white' }}
            >
              Learn More
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: 6, backgroundColor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {stat.value}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Comprehensive Security Platform
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 6 }}
          >
            Everything you need to secure your development lifecycle
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                    <Box sx={{ mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Security Tools Section */}
      <Box sx={{ py: 8, backgroundColor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
            Integrated Security Tools
          </Typography>
          <Typography
            variant="body1"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Built-in support for industry-leading security tools
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            {[
              'SAST (Static Analysis)',
              'DAST (Dynamic Analysis)',
              'Dependency Scanning',
              'Container Security',
              'OWASP ZAP',
              'Snyk',
              'Docker Bench',
              'GitHub Integration'
            ].map((tool) => (
              <Chip
                key={tool}
                label={tool}
                variant="outlined"
                size="medium"
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: 8,
          background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
          color: 'white',
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Secure Your Pipeline?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of developers who trust our platform for proactive security
          </Typography>
          <Button
            variant="contained"
            size="large"
            color="secondary"
            onClick={() => navigate('/register')}
            sx={{ px: 6, py: 2 }}
          >
            Start Your Free Trial
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;