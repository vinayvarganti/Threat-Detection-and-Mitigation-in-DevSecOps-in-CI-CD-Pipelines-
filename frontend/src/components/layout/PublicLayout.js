import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { Security, Shield } from '@mui/icons-material';

const PublicLayout = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Shield sx={{ mr: 2 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold'
            }}
          >
            DevSecOps Platform
          </Typography>
          
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
          <Button color="inherit" component={Link} to="/about">
            About
          </Button>
          <Button color="inherit" component={Link} to="/features">
            Features
          </Button>
          <Button color="inherit" component={Link} to="/architecture">
            Architecture
          </Button>
          <Button color="inherit" component={Link} to="/contact">
            Contact
          </Button>
          
          <Box sx={{ ml: 2 }}>
            <Button
              color="inherit"
              onClick={() => navigate('/login')}
              sx={{ mr: 1 }}
            >
              Login
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => navigate('/register')}
            >
              Register
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © 2024 DevSecOps Platform. Built for proactive threat detection and mitigation.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default PublicLayout;