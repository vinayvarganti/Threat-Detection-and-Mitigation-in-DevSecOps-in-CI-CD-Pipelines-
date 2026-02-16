import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Security,
  PlayArrow,
  ExpandMore,
  Code,
  NetworkCheck,
  Assessment
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const SecurityScan = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [scans, setScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [currentPipelineId, setCurrentPipelineId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch scans when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchScans(selectedProjectId);
    } else {
      setScans([]);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await axios.get('/api/projects');
      if (response.data.success) {
        setProjects(response.data.data.projects);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchScans = async (projectId) => {
    setLoadingScans(true);
    try {
      // First get related pipelines to filter or just use getScans with logic?
      // The API /api/scans supports listing scans. 
      // Ideally we should filter by project ID but the scans endpoint in 'scans.js' 
      // takes 'pipelineId' or defaults to user's scans. 
      // For better UX, we might need to filter client side or enhance API.
      // Let's rely on finding all scans and filtering by pipeline's project id client side for now, 
      // or just fetching all user scans and filtering.

      // Actually, let's fetch pipelines for the project first, then their scans?
      // Or simpler: /api/pipelines?projectId=...

      const response = await axios.get(`/api/pipelines?projectId=${projectId}`);
      if (response.data.success && response.data.data.pipelines) {
        // Pipelines contain scans populated
        const allScans = response.data.data.pipelines.reduce((acc, pipeline) => {
          if (pipeline.scans) {
            // Add pipeline info to scan for display
            pipeline.scans.forEach(s => s.pipelineDate = pipeline.createdAt);
            return acc.concat(pipeline.scans);
          }
          return acc;
        }, []);

        // Sort by date desc
        allScans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setScans(allScans);
      }
    } catch (err) {
      console.error('Error fetching scans:', err);
      setError('Failed to load scan history');
    } finally {
      setLoadingScans(false);
    }
  };

  const handleStartScan = async () => {
    if (!selectedProjectId) return;

    setScanning(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/pipelines', {
        projectId: selectedProjectId,
        name: `Manual Scan ${new Date().toLocaleString()}`,
        configuration: {
          scanTypes: ['sast', 'dast', 'dependency', 'container', 'code-quality']
        }
      });

      if (response.data.success) {
        const pipelineId = response.data.data.pipeline._id;
        setCurrentPipelineId(pipelineId);
        setSuccess('Scan started successfully!');

        // Start polling
        pollScanStatus(pipelineId);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start scan');
      setScanning(false);
    }
  };

  const pollScanStatus = (pipelineId) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/scans?pipelineId=${pipelineId}`);
        if (response.data.success) {
          const currentScans = response.data.data.scans;
          const allFinished = currentScans.every(s => s.status === 'completed' || s.status === 'failed');

          if (allFinished) {
            clearInterval(interval);
            setScanning(false);
            setSuccess('Scan completed!');
            fetchScans(selectedProjectId); // Refresh list
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success'; // or default
      default: return 'default';
    }
  };

  const getToolIcon = (tool) => {
    if (!tool) return <Security />;
    if (tool.includes('SAST')) return <Code />;
    if (tool.includes('ZAP')) return <NetworkCheck />;
    if (tool.includes('Sonar')) return <Assessment />;
    return <Security />;
  };

  const handleViewDetails = (scan) => {
    setSelectedScan(scan);
    setOpenDetailDialog(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Security Scans
      </Typography>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Project</InputLabel>
              <Select
                value={selectedProjectId}
                label="Select Project"
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={loadingProjects || scanning}
              >
                {projects.map((project) => (
                  <MenuItem key={project._id} value={project._id}>
                    {project.name} ({project.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              size="large"
              startIcon={scanning ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
              onClick={handleStartScan}
              disabled={!selectedProjectId || scanning}
              color="primary"
            >
              {scanning ? 'Scanning...' : 'Start New Scan'}
            </Button>
          </Grid>
        </Grid>

        {scanning && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Running SAST, DAST, and Code Quality checks...
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      </Paper>

      {/* Results List */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Scan History
      </Typography>

      {loadingScans ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : scans.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          No scans found for this project.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {scans.map((scan) => (
            <Grid item xs={12} md={6} lg={4} key={scan._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getToolIcon(scan.tool)}
                      <Typography variant="h6">{scan.tool}</Typography>
                    </Box>
                    <Chip
                      label={scan.status}
                      color={scan.status === 'completed' ? 'success' : scan.status === 'failed' ? 'error' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Type: {scan.type.toUpperCase()}
                  </Typography>
                  <Typography variant="caption" display="block" gutterBottom>
                    {new Date(scan.createdAt).toLocaleString()}
                  </Typography>

                  {scan.result && scan.result.summary && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={`Crit: ${scan.result.summary.critical}`} size="small" color="error" variant="outlined" />
                      <Chip label={`High: ${scan.result.summary.high}`} size="small" color="warning" variant="outlined" />
                      <Chip label={`Med: ${scan.result.summary.medium}`} size="small" color="info" variant="outlined" />
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 2 }}
                    fullWidth
                    onClick={() => handleViewDetails(scan)}
                  >
                    View Results
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Details Dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedScan?.tool} Scan Results
        </DialogTitle>
        <DialogContent dividers>
          {selectedScan && selectedScan.result && selectedScan.result.vulnerabilities && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Found {selectedScan.result.vulnerabilities.length} issues
              </Typography>

              {selectedScan.result.vulnerabilities.length === 0 ? (
                <Alert severity="success">No vulnerabilities found!</Alert>
              ) : (
                selectedScan.result.vulnerabilities.map((vuln, index) => (
                  <Accordion key={index} disableGutters elevation={0} sx={{ border: '1px solid #eee' }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Chip label={vuln.severity} color={getSeverityColor(vuln.severity)} size="small" sx={{ width: 80 }} />
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          {vuln.title}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ bgcolor: '#fafafa' }}>
                      <Typography variant="body2" paragraph>
                        <strong>Description:</strong> {vuln.description}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Category:</strong> {vuln.category}
                      </Typography>
                      {vuln.location && (
                        <Typography variant="body2" paragraph sx={{ fontFamily: 'monospace' }}>
                          <strong>Location:</strong> {vuln.location.file} {vuln.location.line ? `:${vuln.location.line}` : ''}
                        </Typography>
                      )}
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <strong>Remediation:</strong> {vuln.remediation}
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityScan;