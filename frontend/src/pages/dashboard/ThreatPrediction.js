import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  BugReport as BugReportIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const ThreatPrediction = () => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchThreats();
  }, []);

  const fetchThreats = async () => {
    try {
      const response = await axios.get('/api/threats');
      if (response.data.success) {
        setThreats(response.data.data.threats);
      }
    } catch (err) {
      console.error('Failed to fetch threats:', err);
      setError('Failed to load threat predictions.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <SecurityIcon sx={{ mr: 1, fontSize: 40, color: 'primary.main' }} />
        AI Threat Predictions
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Advanced AI analysis of your project's security posture and potential future threats.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {!loading && threats.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No threat predictions found yet. Run a pipeline scan to generate AI predictions.
        </Alert>
      )}

      <Grid container spacing={3}>
        {threats.map((threat) => (
          <Grid item xs={12} key={threat.id}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" component="div">
                      {threat.threatType.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Project: {threat.project?.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={threat.severity.toUpperCase()}
                    color={getSeverityColor(threat.severity)}
                    icon={<WarningIcon />}
                  />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="overline" color="text.secondary">Probability</Typography>
                      <Typography variant="h3" color="primary">
                        {Math.round(threat.probability * 100)}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle2" gutterBottom>
                      Analysis & Risk Factors
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {threat.description}
                    </Typography>

                    {threat.prediction?.mitigation_suggestions && (
                      <>
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 1, color: 'success.main' }}>
                          Recommended Mitigations
                        </Typography>
                        <List dense>
                          {threat.prediction.mitigation_suggestions.map((suggestion, index) => (
                            <ListItem key={index}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckCircleIcon color="success" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={suggestion} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ThreatPrediction;