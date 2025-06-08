import React from 'react';
import { 
  Box, 
  AppBar,
  Toolbar,
  Typography,
  IconButton
} from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import Dashboard from '../components/Dashboard/Dashboard';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Navigation */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Platform
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {user?.email}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              title="Logout"
            >
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Dashboard Content */}
      <Dashboard />
    </Box>
  );
};

export default DashboardPage;