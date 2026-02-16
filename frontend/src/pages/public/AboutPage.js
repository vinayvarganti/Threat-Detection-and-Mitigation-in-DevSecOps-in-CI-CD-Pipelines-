import React from 'react';
import { Typography, Box, Container } from '@mui/material';

const AboutPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        About DevSecOps Platform
      </Typography>
      <Typography variant="body1" paragraph>
        Our DevSecOps Platform is a comprehensive security solution that integrates 
        security into every stage of the development lifecycle. Built with modern 
        technologies and AI-powered threat detection, it helps organizations 
        proactively identify and mitigate security risks.
      </Typography>
    </Container>
  );
};

export default AboutPage;