import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Import components
import { FileUploader, DataPreview, ColumnMapper } from '../components/FileUpload';
import TrainingProgress from '../components/Training/TrainingProgress';
import ModelDeployment from '../components/Training/ModelDeployment';

const TrainingWorkflowPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [dataValidation, setDataValidation] = useState<any>(null);
  const [trainingConfig, setTrainingConfig] = useState<any>(null);
  const [trainingJobId, setTrainingJobId] = useState<string | null>(null);
  const [trainingResults, setTrainingResults] = useState<any>(null);

  const steps = [
    'Upload Dataset',
    'Preview & Validate',
    'Configure Training',
    'Model Training',
    'Deploy Model'
  ];

  const handleFileUploaded = (file: any) => {
    setUploadedFile(file);
    if (file.status === 'completed') {
      setActiveStep(1);
    }
  };

  const handleDataValidated = (validation: any) => {
    setDataValidation(validation);
    if (validation.isValid) {
      setActiveStep(2);
    }
  };

  const handleConfigurationComplete = (config: any) => {
    setTrainingConfig(config);
    setActiveStep(3);
  };

  const startTraining = async () => {
    if (!uploadedFile || !trainingConfig || !projectId) {
      return;
    }

    try {
      const response = await fetch('/api/training/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          project_id: projectId,
          dataset_id: uploadedFile.id,
          target_column: trainingConfig.targetColumn,
          feature_columns: trainingConfig.featureColumns,
          algorithm: trainingConfig.modelSettings.algorithm,
          test_size: trainingConfig.modelSettings.testSize,
          preprocessing_config: trainingConfig.preprocessing
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start training');
      }

      const result = await response.json();
      setTrainingJobId(result.id);
      
    } catch (error) {
      console.error('Training start error:', error);
    }
  };

  const handleTrainingComplete = (results: any) => {
    setTrainingResults(results);
    setActiveStep(4);
  };

  // Auto-start training when configuration is complete
  useEffect(() => {
    if (activeStep === 3 && trainingConfig && !trainingJobId) {
      startTraining();
    }
  }, [activeStep, trainingConfig, trainingJobId]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Train Your AI Model 🤖
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Complete workflow from data upload to model deployment
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label.Mui-completed': {
                    color: 'success.main'
                  },
                  '& .MuiStepLabel-label.Mui-active': {
                    color: 'primary.main'
                  }
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Box>
        {/* Step 1: Upload Dataset */}
        {activeStep >= 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Step 1: Upload Your Dataset
            </Typography>
            <FileUploader
              projectId={projectId}
              onFileUploaded={handleFileUploaded}
              onFileRemoved={() => {
                setUploadedFile(null);
                setActiveStep(0);
              }}
            />
          </Box>
        )}

        {/* Step 2: Data Preview */}
        {activeStep >= 1 && uploadedFile && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Step 2: Preview & Validate Data
            </Typography>
            <DataPreview
              fileId={uploadedFile.id}
              fileName={uploadedFile.name}
              onDataValidated={handleDataValidated}
              onColumnConfigured={(config) => {
                console.log('Column config from preview:', config);
              }}
            />
            
            {dataValidation?.isValid && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                  size="large"
                >
                  Continue to Configuration
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Step 3: Configure Training */}
        {activeStep >= 2 && dataValidation?.isValid && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Step 3: Configure Training
            </Typography>
            <ColumnMapper
              columns={[
                // Use real columns from uploaded file or mock data
                { 
                  name: 'text', 
                  type: 'text', 
                  uniqueCount: 95, 
                  nullCount: 2, 
                  sampleValues: ['Saya ingin mengurus SBU konstruksi', 'Kenapa NIB saya belum keluar?'],
                  isRecommendedFeature: true 
                },
                { 
                  name: 'category', 
                  type: 'text', 
                  uniqueCount: 2, 
                  nullCount: 0, 
                  sampleValues: ['layanan', 'pengaduan'],
                  isRecommendedTarget: true 
                }
              ]}
              onConfigurationChange={handleConfigurationComplete}
              onValidationChange={(validation) => {
                console.log('Config validation:', validation);
              }}
            />
          </Box>
        )}

        {/* Step 4: Training Progress */}
        {activeStep >= 3 && trainingJobId && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Step 4: Training Your Model
            </Typography>
            <TrainingProgress
              jobId={trainingJobId}
              onComplete={handleTrainingComplete}
              onError={(error) => {
                console.error('Training error:', error);
              }}
            />
          </Box>
        )}

        {/* Step 5: Model Deployment */}
        {activeStep >= 4 && trainingResults && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Step 5: Deploy Your Model
            </Typography>
            <ModelDeployment
              jobId={trainingJobId!}
              trainingResults={trainingResults}
            />
          </Box>
        )}
      </Box>

      {/* Navigation Controls */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
          >
            Previous
          </Button>
          
          <Typography variant="body2" color="text.secondary">
            Step {activeStep + 1} of {steps.length}
          </Typography>
          
          <Button
            onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
            disabled={activeStep === steps.length - 1}
            variant="contained"
          >
            Next
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TrainingWorkflowPage;