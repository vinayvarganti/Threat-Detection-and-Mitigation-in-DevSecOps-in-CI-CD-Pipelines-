import React from 'react';
import { Typography, Box, Container } from '@mui/material';

const FeaturesPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Platform Features
      </Typography>
      <Typography variant="body1" paragraph>
        Explore the comprehensive security features of our DevSecOps platform.
      </Typography>
    </Container>
  );
};

export default FeaturesPage;