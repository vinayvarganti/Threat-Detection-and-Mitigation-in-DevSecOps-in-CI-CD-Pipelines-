
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    GitHub,
    CloudUpload,
    AccessTime
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ProjectList = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/projects');
            if (response.data.success) {
                setProjects(response.data.data.projects);
            }
        } catch (err) {
            console.error('Failed to fetch projects:', err);
            setError('Failed to load projects. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (project) => {
        setProjectToDelete(project);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!projectToDelete) return;

        try {
            await axios.delete(`/api/projects/${projectToDelete._id}`);
            setProjects(projects.filter(p => p._id !== projectToDelete._id));
            setDeleteDialogOpen(false);
            setProjectToDelete(null);
        } catch (err) {
            console.error('Failed to delete project:', err);
            // Optional: Show error toast
            setError('Failed to delete project.');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'secure': return 'success';
            case 'vulnerable': return 'error';
            case 'scanning': return 'warning';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                My Projects
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="projects table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Project Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Date Added</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {projects.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography variant="body1" sx={{ py: 3 }}>
                                        No projects found.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        onClick={() => navigate('/dashboard/upload')}
                                    >
                                        Add New Project
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            projects.map((project) => (
                                <TableRow key={project._id} hover>
                                    <TableCell component="th" scope="row">
                                        <Typography variant="subtitle2">
                                            {project.name}
                                        </Typography>
                                        {project.description && (
                                            <Typography variant="caption" color="text.secondary">
                                                {project.description.substring(0, 50)}...
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {project.type === 'github' ? <GitHub fontSize="small" /> : <CloudUpload fontSize="small" />}
                                            {project.type === 'github' ? 'GitHub' : 'Upload'}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <AccessTime fontSize="small" color="action" />
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={project.status || 'unknown'}
                                            color={getStatusColor(project.status)}
                                            size="small"
                                            sx={{ textTransform: 'capitalize' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            color="primary"
                                            onClick={() => navigate('/dashboard/vulnerabilities')} // Ideally link to specific project details
                                            title="View Details"
                                        >
                                            <ViewIcon />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDeleteClick(project)}
                                            title="Delete Project"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Project?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>{projectToDelete?.name}</strong>?
                        This will permanently remove the project and all associated scan data.
                        This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProjectList;
