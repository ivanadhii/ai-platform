import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import LoginForm from '../components/Auth/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { LoginCredentials } from '../services/types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, clearError } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      await login(credentials);
      // Navigation will happen automatically via useEffect
    } catch (error) {
      // Error is handled by useAuth hook
    }
  };

  const handleNavigateToRegister = () => {
    navigate('/register');
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <LoginForm
          onLogin={handleLogin}
          onNavigateToRegister={handleNavigateToRegister}
          isLoading={isLoading}
          error={error}
        />
      </Box>
    </Container>
  );
};

export default LoginPage;