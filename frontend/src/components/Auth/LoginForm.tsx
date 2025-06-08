import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Link,
} from '@mui/material';
import { LoginCredentials } from '../../services/types';

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onNavigateToRegister: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onNavigateToRegister,
  isLoading = false,
  error,
}) => {
  const [formData, setFormData] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.username.trim()) {
      errors.username = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.username)) {
      errors.username = 'Please enter a valid email';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onLogin(formData);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Login error:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sign In
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Welcome back! Please sign in to your account.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          sx={{ mt: 2, mb: 1 }}
          required
          fullWidth
          id="username"
          label="Email Address"
          name="username"
          autoComplete="email"
          autoFocus
          value={formData.username}
          onChange={handleInputChange}
          error={!!formErrors.username}
          helperText={formErrors.username}
          disabled={isLoading}
        />

        <TextField
          sx={{ mt: 2, mb: 1 }}
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={formData.password}
          onChange={handleInputChange}
          error={!!formErrors.password}
          helperText={formErrors.password}
          disabled={isLoading}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>

        <Box textAlign="center">
          <Typography variant="body2">
            Don't have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                onNavigateToRegister();
              }}
              disabled={isLoading}
            >
              Sign up here
            </Link>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default LoginForm;