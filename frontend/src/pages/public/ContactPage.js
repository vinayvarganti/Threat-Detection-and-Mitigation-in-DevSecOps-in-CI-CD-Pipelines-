import React from 'react';
import { Typography, Box, Container } from '@mui/material';

const ContactPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Contact Us
      </Typography>
      <Typography variant="body1" paragraph>
        Get in touch with our team for support and inquiries.
      </Typography>
    </Container>
  );
};

export default ContactPage;