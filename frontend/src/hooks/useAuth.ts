import { useState, useEffect, createContext, useContext } from 'react';
import { User, LoginCredentials, RegisterData, AuthResponse } from '../services/types';
import ApiService from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  const clearError = () => setError(null);

  // Check if user is already logged in on app start
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const userData = await ApiService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        // Token might be expired or invalid
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authResponse: AuthResponse = await ApiService.login(credentials);
      
      // Store token
      localStorage.setItem('access_token', authResponse.access_token);
      
      // Get user data
      const userData = await ApiService.getCurrentUser();
      setUser(userData);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(userData));
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.response?.data?.detail || 'Login failed. Please check your credentials.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newUser = await ApiService.register(userData);
      
      // Auto-login after successful registration
      await login({
        username: userData.email,
        password: userData.password,
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          'Registration failed. Please try again.';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await ApiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear local state
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setIsLoading(false);
    }
  };

  const updateUser = async (userUpdates: Partial<User>): Promise<void> => {
    try {
      setError(null);
      const updatedUser = await ApiService.updateUser(userUpdates);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error: any) {
      console.error('Update user error:', error);
      setError(error.response?.data?.detail || 'Failed to update user.');
      throw error;
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    error,
    clearError,
  };
};

export { AuthContext };