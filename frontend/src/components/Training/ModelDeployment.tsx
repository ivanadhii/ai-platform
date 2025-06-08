import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload,
  Api,
  CheckCircle,
  ContentCopy,
  PlayArrow,
} from '@mui/icons-material';

interface ModelDeploymentProps {
  jobId: string;
  trainingResults: {
    accuracy: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
  };
}

const ModelDeployment: React.FC<ModelDeploymentProps> = ({
  jobId,
  trainingResults
}) => {
  const [modelName, setModelName] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const handleDeploy = async () => {
    if (!modelName.trim()) {
      setError('Model name is required');
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      const response = await fetch(`/api/training/${jobId}/deploy?model_name=${encodeURIComponent(modelName)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Deployment failed');
      }

      const result = await response.json();
      setDeploymentResult(result);
      setDeployed(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  const handleTest = async () => {
    if (!testInput.trim() || !deploymentResult) {
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`/api${deploymentResult.api_endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ text: testInput })
      });

      if (!response.ok) {
        throw new Error('Prediction failed');
      }

      const result = await response.json();
      setTestResult(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const steps = ['Configure Deployment', 'Deploy Model', 'Test API'];
  const activeStep = !deployed ? 0 : !testResult ? 1 : 2;

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Deploy Your Model 🚀
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Your model is ready for deployment. Give it a name and deploy it as a REST API.
      </Typography>

      {/* Progress Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Grid container spacing={3}>
        {/* Deployment Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Deployment Configuration
              </Typography>
              
              {!deployed ? (
                <Box>
                  <TextField
                    fullWidth
                    label="Model Name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g., OSS Text Classifier v1"
                    sx={{ mb: 2 }}
                    disabled={deploying}
                  />
                  
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={deploying ? <CircularProgress size={20} /> : <CloudUpload />}
                    onClick={handleDeploy}
                    disabled={deploying || !modelName.trim()}
                    size="large"
                  >
                    {deploying ? 'Deploying...' : 'Deploy Model'}
                  </Button>
                </Box>
              ) : (
                <Alert severity="success" icon={<CheckCircle />}>
                  <Typography variant="h6">Deployment Successful! 🎉</Typography>
                  <Typography variant="body2">
                    Model "{deploymentResult?.model_name || modelName}" is now live and ready to serve predictions.
                  </Typography>
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Model Performance Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Model Performance
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="success.contrastText">
                      {(trainingResults.accuracy * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="success.contrastText">
                      Accuracy
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="primary.contrastText">
                      {trainingResults.f1_score ? (trainingResults.f1_score * 100).toFixed(1) : 'N/A'}%
                    </Typography>
                    <Typography variant="body2" color="primary.contrastText">
                      F1 Score
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Your model achieved excellent performance and is ready for production use.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* API Information */}
      {deployed && deploymentResult && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            🔗 API Information
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Endpoint URL:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={`${window.location.origin}/api${deploymentResult.api_endpoint}`}
                    InputProps={{ readOnly: true }}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopy />}
                    onClick={() => copyToClipboard(`${window.location.origin}/api${deploymentResult.api_endpoint}`)}
                  >
                    Copy
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Model ID:
                </Typography>
                <Chip label={deploymentResult.model_id} />
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Usage Example (cURL):
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
{`curl -X POST \\
  ${window.location.origin}/api${deploymentResult.api_endpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"text": "Saya ingin mengurus SBU"}'`}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Test Interface */}
      {deployed && deploymentResult && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            🧪 Test Your Model
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Test Input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter text to classify (e.g., 'Saya ingin mengurus SBU konstruksi')"
                sx={{ mb: 2 }}
              />
              
              <Button
                variant="outlined"
                startIcon={testing ? <CircularProgress size={20} /> : <PlayArrow />}
                onClick={handleTest}
                disabled={testing || !testInput.trim()}
              >
                {testing ? 'Testing...' : 'Test Prediction'}
              </Button>
            </Grid>

            <Grid item xs={12} md={4}>
              {testResult && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Prediction Result
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label={testResult.prediction}
                        color="primary"
                        size="large"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      Confidence: {(testResult.confidence * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Processing Time: {testResult.processing_time_ms.toFixed(1)}ms
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default ModelDeployment;