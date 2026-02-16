import React from 'react';
import { Typography, Box, Card, CardContent, Switch } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';

const ProfileSettings = () => {
  const { mode, toggleTheme } = useTheme();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile & Settings
      </Typography>

      <Card sx={{ mt: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {mode === 'dark' ? <DarkMode sx={{ mr: 2 }} /> : <LightMode sx={{ mr: 2 }} />}
              <Typography variant="body1">
                {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Typography>
            </Box>
            <Switch
              checked={mode === 'dark'}
              onChange={toggleTheme}
              inputProps={{ 'aria-label': 'toggle theme' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Toggle between light and dark themes to customize your viewing experience.
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="body1" color="text.secondary">
        User profile settings and preferences will be displayed here.
      </Typography>
    </Box>
  );
};

export default ProfileSettings;