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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { RegisterData } from '../../services/types';

interface RegisterFormProps {
  onRegister: (userData: RegisterData) => Promise<void>;
  onNavigateToLogin: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onNavigateToLogin,
  isLoading = false,
  error,
}) => {
  const [formData, setFormData] = useState<RegisterData & { confirmPassword: string }>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
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

    // Full name validation
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      const { confirmPassword, ...registerData } = formData;
      await onRegister(registerData);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Register error:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 450, mx: 'auto', mt: 8 }}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sign Up
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Create your account to start building AI models
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
          id="full_name"
          label="Full Name"
          name="full_name"
          autoComplete="name"
          autoFocus
          value={formData.full_name}
          onChange={handleInputChange}
          error={!!formErrors.full_name}
          helperText={formErrors.full_name}
          disabled={isLoading}
        />

        <TextField
          sx={{ mt: 2, mb: 1 }}
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleInputChange}
          error={!!formErrors.email}
          helperText={formErrors.email}
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
          autoComplete="new-password"
          value={formData.password}
          onChange={handleInputChange}
          error={!!formErrors.password}
          helperText={formErrors.password}
          disabled={isLoading}
        />

        <TextField
          sx={{ mt: 2, mb: 1 }}
          required
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          id="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          error={!!formErrors.confirmPassword}
          helperText={formErrors.confirmPassword}
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
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>

        <Box textAlign="center">
          <Typography variant="body2">
            Already have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                onNavigateToLogin();
              }}
              disabled={isLoading}
            >
              Sign in here
            </Link>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default RegisterForm;