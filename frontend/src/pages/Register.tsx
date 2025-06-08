import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import RegisterForm from '../components/Auth/RegisterForm';
import { useAuth } from '../hooks/useAuth';
import { RegisterData } from '../services/types';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, isAuthenticated, clearError } = useAuth();

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

  const handleRegister = async (userData: RegisterData) => {
    try {
      await register(userData);
      // Navigation will happen automatically via useEffect after auto-login
    } catch (error) {
      // Error is handled by useAuth hook
    }
  };

  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <RegisterForm
          onRegister={handleRegister}
          onNavigateToLogin={handleNavigateToLogin}
          isLoading={isLoading}
          error={error}
        />
      </Box>
    </Container>
  );
};

export default RegisterPage;