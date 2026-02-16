import React from 'react';
import { Typography, Box } from '@mui/material';

const AdminDashboard = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1">
        Admin dashboard functionality will be implemented here.
      </Typography>
    </Box>
  );
};

export default AdminDashboard;