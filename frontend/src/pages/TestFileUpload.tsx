import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  Button,
  Alert
} from '@mui/material';
import { FileUploader, DataPreview, ColumnMapper } from '../components/FileUpload';
import type { UploadedFile, DataValidation, TrainingConfiguration } from '../components/FileUpload';

const TestFileUploadPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [dataValidation, setDataValidation] = useState<DataValidation | null>(null);
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfiguration | null>(null);

  const steps = ['Upload File', 'Preview Data', 'Configure Training', 'Ready to Train'];

  const handleFileUploaded = (file: UploadedFile) => {
    console.log('✅ File uploaded:', file);
    setUploadedFile(file);
    // Auto advance to next step when file is uploaded successfully
    if (file.status === 'completed') {
      setActiveStep(1);
    }
  };

  const handleDataValidated = (validation: DataValidation) => {
    console.log('✅ Data validated:', validation);
    setDataValidation(validation);
    // Auto advance if data is valid
    if (validation.isValid) {
      setActiveStep(2);
    }
  };

  const handleConfigurationChange = (config: TrainingConfiguration) => {
    console.log('✅ Config updated:', config);
    setTrainingConfig(config);
    
    // Check if configuration is valid for training
    if (config.targetColumn && config.featureColumns.length > 0) {
      setActiveStep(3);
    }
  };

  const handleContinueToPreview = () => {
    if (uploadedFile && uploadedFile.status === 'completed') {
      setActiveStep(1);
    }
  };

  const handleContinueToConfig = () => {
    if (dataValidation && dataValidation.isValid) {
      setActiveStep(2);
    }
  };

  const resetFlow = () => {
    setActiveStep(0);
    setUploadedFile(null);
    setDataValidation(null);
    setTrainingConfig(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h3" gutterBottom align="center">
          🧪 Phase 3 Testing - File Upload System
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary">
          Complete workflow testing: Upload → Preview → Configure → Train
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Chip label="Backend ✅" color="success" />
          <Chip label="Frontend Components 🧪" color="warning" />
          <Chip label="Integration Flow 🔗" color="info" />
        </Box>
      </Paper>

      {/* Progress Stepper */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    '&.Mui-completed': { color: 'success.main' },
                    '&.Mui-active': { color: 'primary.main' }
                  }
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step 1: File Upload */}
      <Box sx={{ mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Step 1: File Upload Testing
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Test drag & drop, file validation, progress tracking
          </Typography>
          
          <FileUploader
            projectId="test-project-123"
            onFileUploaded={handleFileUploaded}
            onFileRemoved={(fileId) => {
              console.log('🗑️ File removed:', fileId);
              if (uploadedFile?.id === fileId) {
                setUploadedFile(null);
                setActiveStep(0);
              }
            }}
            maxFileSize={50}
            maxFiles={3}
          />
        </Paper>
      </Box>

      {/* Step 2: Data Preview */}
      {activeStep >= 1 && uploadedFile && (
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Step 2: Data Preview Testing
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Test data quality assessment, column analysis, preview table
            </Typography>
            
            <DataPreview
              fileId={uploadedFile.id}
              fileName={uploadedFile.name}
              onDataValidated={handleDataValidated}
              onColumnConfigured={(config) => {
                console.log('📊 Column config from preview:', config);
              }}
            />
            
            {/* Manual Continue Button for Testing */}
            {dataValidation && dataValidation.isValid && activeStep === 1 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleContinueToConfig}
                  size="large"
                >
                  🔄 Force Continue to Configuration
                </Button>
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Step 3: Column Configuration */}
      {activeStep >= 2 && dataValidation?.isValid && (
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Step 3: Training Configuration Testing
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Test target/feature selection, preprocessing options, model settings
            </Typography>
            
            <ColumnMapper
              columns={[
                // Mock realistic OSS data columns
                { 
                  name: 'id', 
                  type: 'number', 
                  uniqueCount: 100, 
                  nullCount: 0, 
                  sampleValues: [1, 2, 3, 4, 5],
                  isRecommendedFeature: false 
                },
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
                },
                { 
                  name: 'confidence', 
                  type: 'number', 
                  uniqueCount: 80, 
                  nullCount: 0, 
                  sampleValues: [0.95, 0.87, 0.92]
                },
                { 
                  name: 'timestamp', 
                  type: 'date', 
                  uniqueCount: 100, 
                  nullCount: 0, 
                  sampleValues: ['2024-01-01', '2024-01-02']
                }
              ]}
              onConfigurationChange={handleConfigurationChange}
              onValidationChange={(validation) => {
                console.log('✅ Config validation:', validation);
              }}
            />
          </Paper>
        </Box>
      )}

      {/* Step 4: Ready to Train */}
      {activeStep >= 3 && trainingConfig && (
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Step 4: Training Ready! 🎉
            </Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                ✅ Configuration Complete!
              </Typography>
              <Typography variant="body2">
                All components working correctly. Ready for Phase 4 integration.
              </Typography>
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {trainingConfig.targetColumn || 'None'}
                </Typography>
                <Typography variant="caption">Target Column</Typography>
              </Paper>
              
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="secondary">
                  {trainingConfig.featureColumns.length}
                </Typography>
                <Typography variant="caption">Feature Columns</Typography>
              </Paper>
              
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="info.main">
                  {Math.round((1 - trainingConfig.modelSettings.testSize) * 100)}% / {Math.round(trainingConfig.modelSettings.testSize * 100)}%
                </Typography>
                <Typography variant="caption">Train / Test Split</Typography>
              </Paper>
              
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">
                  {trainingConfig.modelSettings.algorithm === 'auto' ? 'Auto' : trainingConfig.modelSettings.algorithm}
                </Typography>
                <Typography variant="caption">Algorithm</Typography>
              </Paper>
            </Box>

            <Button 
              variant="contained" 
              size="large" 
              fullWidth
              onClick={() => {
                alert('🚀 Ready for Phase 4: ML Training Engine!\n\nNext: Integrate with OSS classification system (83.3% accuracy)');
              }}
            >
              Start ML Training (Phase 4)
            </Button>
          </Paper>
        </Box>
      )}

      {/* Control Panel */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>🎮 Test Controls</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={resetFlow}>
            🔄 Reset Test Flow
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => console.log({uploadedFile, dataValidation, trainingConfig})}
          >
            🔍 Log Debug Info
          </Button>
          <Button 
            variant="outlined"
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
          >
            ⬅️ Previous Step
          </Button>
          <Button 
            variant="outlined"
            onClick={() => setActiveStep(Math.min(3, activeStep + 1))}
            disabled={activeStep === 3}
          >
            ➡️ Next Step
          </Button>
        </Box>
      </Paper>

      {/* Debug Info */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>🔍 Debug Information</Typography>
        <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
          {JSON.stringify({
            currentStep: activeStep,
            uploadedFile: uploadedFile ? {
              id: uploadedFile.id,
              name: uploadedFile.name,
              status: uploadedFile.status,
              hasPreview: !!uploadedFile.preview
            } : null,
            dataValidation: dataValidation ? {
              isValid: dataValidation.isValid,
              quality: dataValidation.quality,
              issuesCount: dataValidation.issues.length
            } : null,
            trainingConfig: trainingConfig ? {
              targetColumn: trainingConfig.targetColumn,
              featureColumnsCount: trainingConfig.featureColumns.length,
              algorithm: trainingConfig.modelSettings.algorithm,
              testSize: trainingConfig.modelSettings.testSize
            } : null
          }, null, 2)}
        </pre>
      </Paper>
    </Container>
  );
};

export default TestFileUploadPage;