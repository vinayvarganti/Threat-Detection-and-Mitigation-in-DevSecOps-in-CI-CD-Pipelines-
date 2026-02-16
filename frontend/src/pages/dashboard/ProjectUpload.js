import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Grid
} from '@mui/material';
import {
  CloudUpload,
  GitHub,
  Security,
  CheckCircle,
  Error as ErrorIcon,
  PlayArrow,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';

const ProjectUpload = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanProgress, setScanProgress] = useState(null);

  // GitHub form
  const [githubData, setGithubData] = useState({
    name: '',
    repositoryUrl: '',
    targetUrl: '', // For DAST
    sonarQubeConfig: {
      enabled: false,
      url: '',
      token: '',
      projectKey: ''
    },
    branch: 'main',
    description: ''
  });

  // Upload form
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    language: '',
    framework: '',
    targetUrl: '' // Added targetUrl
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/zip': ['.zip'],
      'application/x-tar': ['.tar'],
      'application/gzip': ['.gz']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setSelectedFile(acceptedFiles[0]);
      setError('');
    }
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleGithubSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate GitHub URL
    const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;

    if (!githubUrlPattern.test(githubData.repositoryUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repository)');
      setLoading(false);
      return;
    }

    // Validate required fields
    if (!githubData.name.trim()) {
      setError('Project name is required');
      setLoading(false);
      return;
    }

    if (!githubData.repositoryUrl.trim()) {
      setError('GitHub repository URL is required');
      setLoading(false);
      return;
    }

    try {
      // First, validate if the GitHub repository exists
      const repoPath = githubData.repositoryUrl.replace('https://github.com/', '');
      const [owner, repo] = repoPath.replace(/\/$/, '').split('/');

      // Check if repository exists by making a request to GitHub API
      try {
        const githubResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
          transformRequest: (data, headers) => {
            delete headers['Authorization'];
            return data;
          }
        });
        if (githubResponse.status !== 200) {
          throw new Error('Repository not found');
        }
      } catch (githubError) {
        if (githubError.response?.status === 404) {
          setError('GitHub repository not found. Please check the URL and make sure the repository is public.');
          setLoading(false);
          return;
        } else if (githubError.response?.status === 403) {
          setError('GitHub API rate limit exceeded. Please try again later.');
          setLoading(false);
          return;
        }
        // Continue if it's a network error - the repository might still be valid
      }

      // Create project
      const response = await axios.post('/api/projects/github', githubData);

      if (response.data.success) {
        // Use _id as Mongoose returns it by default
        const projectId = response.data.data.project._id || response.data.data.project.id;
        setCurrentProjectId(projectId);
        setSuccess('GitHub repository connected successfully!');

        // Start security scan
        await startSecurityScan(projectId);
      }
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.message || 'Invalid repository data');
      } else if (err.response?.status === 401) {
        setError('Authentication required. Please login again.');
      } else if (err.response?.status === 404) {
        setError('Repository not found or not accessible');
      } else {
        setError(err.response?.data?.message || 'Failed to connect GitHub repository');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!uploadData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (selectedFile.size > maxSize) {
      setError('File size exceeds 100MB limit. Please choose a smaller file.');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/zip', 'application/x-tar', 'application/gzip', 'application/x-gzip'];
    const allowedExtensions = ['.zip', '.tar', '.gz', '.tgz'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

    if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload a ZIP, TAR, or GZ file.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('projectFile', selectedFile);
      formData.append('name', uploadData.name);
      formData.append('description', uploadData.description);
      formData.append('language', uploadData.language);
      formData.append('framework', uploadData.framework);
      formData.append('targetUrl', uploadData.targetUrl); // Added targetUrl

      const response = await axios.post('/api/projects/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000, // 60 second timeout for large files
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // You could add a progress bar here
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });

      if (response.data.success) {
        // Use _id as Mongoose returns it by default
        const projectId = response.data.data.project._id || response.data.data.project.id;
        setCurrentProjectId(projectId);
        setSuccess('Project uploaded successfully!');

        // Start security scan
        await startSecurityScan(projectId);
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Upload timeout. Please try with a smaller file or check your connection.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || 'Invalid file or project data');
      } else if (err.response?.status === 413) {
        setError('File too large. Maximum size is 100MB.');
      } else if (err.response?.status === 401) {
        setError('Authentication required. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to upload project');
      }
    } finally {
      setLoading(false);
    }
  };

  // Define steps constant outside or inside component
  const SCAN_STEPS = [
    'Initializing',
    'SAST Scan',
    'Dependency Scan',
    'Container Scan',
    'DAST Scan',
    'Security Gate',
    'Complete'
  ];

  const startSecurityScan = async (projectId) => {
    if (!projectId) {
      console.error('No project ID provided to startSecurityScan');
      setError('Internal Error: Missing project ID. Cannot start scan.');
      return;
    }

    try {
      setScanProgress({
        activeStep: 0,
        steps: SCAN_STEPS,
        status: 'running'
      });

      // Create pipeline
      const pipelineResponse = await axios.post('/api/pipelines', {
        projectId,
        name: 'Security Scan Pipeline',
        configuration: {
          scanTypes: ['sast', 'dast', 'dependency', 'container']
        }
      });

      if (pipelineResponse.data.success) {
        // Start polling for real results
        const newPipelineId = pipelineResponse.data.data.pipeline._id || pipelineResponse.data.data.pipeline.id;
        pollScanStatus(newPipelineId);
      }
    } catch (err) {
      console.error('Failed to start security scan:', err);
      setScanProgress({
        steps: SCAN_STEPS,
        activeStep: 0,
        status: 'failed',
        error: 'Failed to start security scan'
      });
    }
  };

  const pollScanStatus = (pipelineId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/scans?pipelineId=${pipelineId}`);

        if (response.data.success) {
          const scans = response.data.data.scans;
          const total = scans.length;
          const completed = scans.filter(s => s.status === 'completed' || s.status === 'failed').length;

          if (total === 0) return;

          // Update progress based on completion (0-6 steps)
          // steps: Init, SAST, Dep, Cont, DAST, Gate, Complete
          // We map completed count to these steps roughly
          const mappedStep = Math.min(Math.round((completed / total) * 5) + 1, 5);

          setScanProgress(prev => ({
            ...prev,
            activeStep: mappedStep
          }));

          if (completed === total) {
            clearInterval(pollInterval);

            // Aggregate results
            let critical = 0, high = 0, medium = 0, low = 0;
            let hasFailures = false;

            scans.forEach(s => {
              if (s.status === 'failed') hasFailures = true;
              if (s.result && s.result.summary) {
                critical += s.result.summary.critical || 0;
                high += s.result.summary.high || 0;
                medium += s.result.summary.medium || 0;
                low += s.result.summary.low || 0;
              }
            });

            // Pass/Fail Logic: Fail if Critical > 0 or High > 0
            const passed = !hasFailures && critical === 0 && high === 0;

            setScanProgress(prev => ({
              ...prev,
              activeStep: 6,
              status: 'completed',
              results: {
                passed,
                vulnerabilities: { critical, high, medium, low },
                recommendation: passed
                  ? 'Security Gate Passed. Ready for deployment.'
                  : 'Security Gate Failed. Critical/High vulnerabilities detected.'
              }
            }));
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Don't stop polling on transient errors, but maybe limit retries in prod
      }
    }, 2000);
  };

  const handleReset = () => {
    setScanProgress(null);
    setSuccess('');
    setError('');
    setSelectedFile(null);
    setCurrentProjectId(null);
    setGithubData({ ...githubData, name: '', description: '', branch: 'main', targetUrl: '' });
    setUploadData({ ...uploadData, name: '', description: '', language: '', framework: '', targetUrl: '' });
  };

  const handleDeleteProject = async () => {
    if (!currentProjectId) return;

    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`/api/projects/${currentProjectId}`);
      handleReset();
      setSuccess('Project deleted successfully. You can now scan a new project.');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Add New Project
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect a GitHub repository or upload your project for security scanning
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<GitHub />} label="GitHub Repository" />
          <Tab icon={<CloudUpload />} label="Upload Project" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* GitHub Tab */}
          {tabValue === 0 && (
            <Box component="form" onSubmit={handleGithubSubmit}>
              <TextField
                fullWidth
                label="Project Name"
                value={githubData.name}
                onChange={(e) => setGithubData({ ...githubData, name: e.target.value })}
                required
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="GitHub Repository URL"
                value={githubData.repositoryUrl}
                onChange={(e) => setGithubData({ ...githubData, repositoryUrl: e.target.value })}
                placeholder="https://github.com/username/repository"
                required
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Branch"
                value={githubData.branch}
                onChange={(e) => setGithubData({ ...githubData, branch: e.target.value })}
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Description"
                value={githubData.description}
                onChange={(e) => setGithubData({ ...githubData, description: e.target.value })}
                multiline
                rows={3}
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <Accordion sx={{ mb: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">SonarQube Configuration (Optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={githubData.sonarQubeConfig.enabled}
                            onChange={(e) => setGithubData({
                              ...githubData,
                              sonarQubeConfig: { ...githubData.sonarQubeConfig, enabled: e.target.checked }
                            })}
                          />
                        }
                        label="Enable SonarQube Integration"
                      />
                    </Grid>
                    {githubData.sonarQubeConfig.enabled && (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="SonarQube Server URL"
                            placeholder="http://localhost:9000"
                            value={githubData.sonarQubeConfig.url}
                            onChange={(e) => setGithubData({
                              ...githubData,
                              sonarQubeConfig: { ...githubData.sonarQubeConfig, url: e.target.value }
                            })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Project Key"
                            placeholder="my-project-key"
                            value={githubData.sonarQubeConfig.projectKey}
                            onChange={(e) => setGithubData({
                              ...githubData,
                              sonarQubeConfig: { ...githubData.sonarQubeConfig, projectKey: e.target.value }
                            })}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Authentication Token"
                            type="password"
                            placeholder="squ_..."
                            value={githubData.sonarQubeConfig.token}
                            onChange={(e) => setGithubData({
                              ...githubData,
                              sonarQubeConfig: { ...githubData.sonarQubeConfig, token: e.target.value }
                            })}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <GitHub />}
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Connect & Scan'}
              </Button>
            </Box>
          )}

          {/* Upload Tab */}
          {tabValue === 1 && (
            <Box component="form" onSubmit={handleFileUpload}>
              <TextField
                fullWidth
                label="Project Name"
                value={uploadData.name}
                onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                required
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  mb: 2,
                  bgcolor: isDragActive ? 'action.hover' : 'background.paper'
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {selectedFile ? selectedFile.name : 'Drop your project file here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to browse (ZIP, TAR, GZ files)
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="Programming Language"
                value={uploadData.language}
                onChange={(e) => setUploadData({ ...uploadData, language: e.target.value })}
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Framework"
                value={uploadData.framework}
                onChange={(e) => setUploadData({ ...uploadData, framework: e.target.value })}
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Description"
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                multiline
                rows={3}
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
                disabled={loading || !selectedFile}
              >
                {loading ? 'Uploading...' : 'Upload & Scan'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Scan Progress */}
      {scanProgress && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Security Scan Progress
          </Typography>

          <Stepper activeStep={scanProgress.activeStep} sx={{ mb: 3 }}>
            {scanProgress.steps && scanProgress.steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {scanProgress.status === 'running' && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Running security scans...
              </Typography>
            </Box>
          )}

          {scanProgress.status === 'completed' && scanProgress.results && (
            <Card sx={{ bgcolor: scanProgress.results.passed ? 'success.light' : 'error.light' }}>
              <CardContent>


                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {scanProgress.results.passed ? (
                      <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                    ) : (
                      <ErrorIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                    )}
                    <Box>
                      <Typography variant="h6">
                        {scanProgress.results.passed ? 'Security Gate Passed' : 'Security Gate Failed'}
                      </Typography>
                      <Typography variant="body2">
                        {scanProgress.results.recommendation}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    Vulnerabilities Found:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip label={`Critical: ${scanProgress.results.vulnerabilities.critical}`} color="error" size="small" />
                    <Chip label={`High: ${scanProgress.results.vulnerabilities.high}`} color="warning" size="small" />
                    <Chip label={`Medium: ${scanProgress.results.vulnerabilities.medium}`} color="info" size="small" />
                    <Chip label={`Low: ${scanProgress.results.vulnerabilities.low}`} color="default" size="small" />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<Security />}
                      href="/dashboard/vulnerabilities"
                    >
                      View Vulnerabilities
                    </Button>
                    {scanProgress.results.passed && (
                      <Button
                        variant="outlined"
                        startIcon={<PlayArrow />}
                        color="success"
                      >
                        Deploy Project
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDeleteProject}
                      disabled={loading}
                      sx={{ ml: 2 }}
                    >
                      Delete Project
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {scanProgress.status === 'failed' && (
            <Alert severity="error">
              {scanProgress.error || 'Security scan failed'}
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ProjectUpload;