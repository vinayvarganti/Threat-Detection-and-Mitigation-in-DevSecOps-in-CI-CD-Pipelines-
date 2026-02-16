import React from 'react';
import { Typography, Box, Container } from '@mui/material';

const ArchitecturePage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        System Architecture
      </Typography>
      <Typography variant="body1" paragraph>
        Learn about the technical architecture and design of our DevSecOps platform.
      </Typography>
    </Container>
  );
};

export default ArchitecturePage;