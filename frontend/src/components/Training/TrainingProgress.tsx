import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Speed,
  Timeline,
  Api,
  CloudUpload,
} from '@mui/icons-material';

interface TrainingProgressProps {
  jobId: string;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
}

interface TrainingStatus {
  id: string;
  status: 'queued' | 'preprocessing' | 'training' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

const TrainingProgress: React.FC<TrainingProgressProps> = ({
  jobId,
  onComplete,
  onError
}) => {
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const steps = [
    { key: 'queued', label: 'Queued', icon: <Timeline /> },
    { key: 'preprocessing', label: 'Preprocessing', icon: <Speed /> },
    { key: 'training', label: 'Training Model', icon: <Api /> },
    { key: 'completed', label: 'Completed', icon: <CheckCircle /> },
  ];

  const getActiveStep = () => {
    if (!status) return 0;
    return steps.findIndex(step => step.key === status.status);
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/training/${jobId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch training status');
      }
      
      const data = await response.json();
      setStatus(data);
      setLoading(false);
      
      // Handle completion
      if (data.status === 'completed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        onComplete?.(data);
      } else if (data.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        onError?.(data.current_step || 'Training failed');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();
    
    // Set up polling every 2 seconds
    const interval = setInterval(fetchStatus, 2000);
    setPollingInterval(interval);
    
    // Cleanup
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

  const getStatusColor = (stepStatus: string) => {
    if (!status) return 'default';
    
    const currentStepIndex = steps.findIndex(step => step.key === status.status);
    const stepIndex = steps.findIndex(step => step.key === stepStatus);
    
    if (status.status === 'failed') return 'error';
    if (stepIndex < currentStepIndex) return 'success';
    if (stepIndex === currentStepIndex) return 'primary';
    return 'default';
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return 'Not started';
    if (!end) return 'In progress...';
    
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (loading && !status) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography>Loading training status...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6">Training Error</Typography>
        <Typography>{error}</Typography>
      </Alert>
    );
  }

  if (!status) return null;

  return (
    <Box>
      {/* Training Status Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Model Training Progress
          </Typography>
          <Chip 
            label={status.status.toUpperCase()}
            color={status.status === 'completed' ? 'success' : 
                   status.status === 'failed' ? 'error' : 'primary'}
            size="large"
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {status.current_step || 'Initializing...'}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {status.progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={status.progress}
            color={status.status === 'failed' ? 'error' : 'primary'}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,0.1)',
            }}
          />
        </Box>

        {/* Step Indicator */}
        <Stepper activeStep={getActiveStep()} alternativeLabel>
          {steps.map((step, index) => (
            <Step 
              key={step.key} 
              completed={status.status === 'completed' || getActiveStep() > index}
            >
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      color: getStatusColor(step.key),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(step.key) === 'primary' ? 'primary.main' : 'transparent',
                      border: getStatusColor(step.key) !== 'primary' ? '2px solid currentColor' : 'none'
                    }}
                  >
                    {step.icon}
                  </Box>
                )}
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Training Details */}
      <Grid container spacing={3}>
        {/* Time Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⏱️ Timing Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Started:</Typography>
                  <Typography variant="body2">
                    {status.started_at ? new Date(status.started_at).toLocaleTimeString() : 'Not started'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Duration:</Typography>
                  <Typography variant="body2">
                    {formatDuration(status.started_at, status.completed_at)}
                  </Typography>
                </Box>
                {status.completed_at && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Completed:</Typography>
                    <Typography variant="body2">
                      {new Date(status.completed_at).toLocaleTimeString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Performance Metrics
              </Typography>
              {status.status === 'completed' && status.accuracy ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {(status.accuracy * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Accuracy
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="secondary.main" fontWeight="bold">
                        {status.f1_score ? (status.f1_score * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        F1 Score
                      </Typography>
                    </Box>
                  </Grid>
                  {status.precision && (
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Typography variant="h6" color="success.main">
                          {(status.precision * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Precision
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {status.recall && (
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Typography variant="h6" color="warning.main">
                          {(status.recall * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Recall
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {status.status === 'failed' ? 'Training failed - no metrics available' : 
                     'Metrics will be available after training completes'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions */}
      {status.status === 'completed' && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            🚀 Next Steps
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => {
                // Navigate to deployment page
                window.location.href = `/training/${jobId}/deploy`;
              }}
            >
              Deploy Model
            </Button>
            <Button
              variant="outlined"
              startIcon={<Analytics />}
              onClick={() => {
                // Navigate to results page
                window.location.href = `/training/${jobId}/results`;
              }}
            >
              View Detailed Results
            </Button>
          </Box>
        </Paper>
      )}

      {/* Error Display */}
      {status.status === 'failed' && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography variant="h6">Training Failed</Typography>
          <Typography>{status.current_step}</Typography>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="error">
              Retry Training
            </Button>
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default TrainingProgress;