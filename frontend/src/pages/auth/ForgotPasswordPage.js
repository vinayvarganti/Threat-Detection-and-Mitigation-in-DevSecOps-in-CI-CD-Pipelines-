import React from 'react';
import { Typography, Box, Container } from '@mui/material';

const ForgotPasswordPage = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Forgot Password
      </Typography>
      <Typography variant="body1" paragraph>
        Password recovery functionality will be implemented here.
      </Typography>
    </Container>
  );
};

export default ForgotPasswordPage;