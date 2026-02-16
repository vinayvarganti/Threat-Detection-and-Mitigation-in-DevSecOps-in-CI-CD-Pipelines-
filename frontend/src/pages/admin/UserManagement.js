import React from 'react';
import { Typography, Box } from '@mui/material';

const UserManagement = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Management
      </Typography>
      <Typography variant="body1">
        User management functionality will be implemented here.
      </Typography>
    </Box>
  );
};

export default UserManagement;