import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box 
          sx={{ 
            p: 3, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: '50vh' 
          }}
        >
          <Box sx={{ maxWidth: 500, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Something went wrong</AlertTitle>
              {process.env.NODE_ENV === 'development' && this.state.error ? (
                <Box component="pre" sx={{ fontSize: '0.75rem', mt: 1, textAlign: 'left' }}>
                  {this.state.error.message}
                </Box>
              ) : (
                'An unexpected error occurred. Please try again.'
              )}
            </Alert>
            <Button 
              variant="contained" 
              onClick={this.handleRetry}
              sx={{ mt: 1 }}
            >
              Try Again
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;