// frontend/src/pages/TestFileUpload.tsx - Updated for Real Data

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
  Alert,
  CircularProgress
} from '@mui/material';
import { FileUploader, DataPreview, ColumnMapper } from '../components/FileUpload';
import type { UploadedFile, DataValidation, TrainingConfiguration } from '../components/FileUpload';

// Updated interfaces for real data
interface RealDatasetInfo {
  dataset_id: string;
  filename: string;
  file_size: number;
  rows_count: number;
  columns_count: number;
  upload_status: string;
  uploaded_at: string;
  columns: any[];
  preview_data: any[];
  file_path: string;
}

const TestFileUploadPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [realDataset, setRealDataset] = useState<RealDatasetInfo | null>(null);
  const [dataValidation, setDataValidation] = useState<DataValidation | null>(null);
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfiguration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = ['Upload File', 'Preview Data', 'Configure Training', 'Ready to Train'];

  const handleFileUploaded = async (file: UploadedFile) => {
    console.log('✅ File uploaded:', file);
    setUploadedFile(file);
    setLoading(true);
    setError(null);

    try {
      // Call real backend API
      const formData = new FormData();
      formData.append('file', file.file);

      const response = await fetch(`http://localhost:8000/upload/file/test-project-123`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const datasetInfo: RealDatasetInfo = await response.json();
      console.log('📊 Real dataset info:', datasetInfo);
      
      setRealDataset(datasetInfo);
      setActiveStep(1); // Auto advance to preview
      
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleDataValidated = (validation: DataValidation) => {
    console.log('✅ Data validated:', validation);
    setDataValidation(validation);
    if (validation.isValid) {
      setActiveStep(2);
    }
  };

  const handleConfigurationChange = (config: TrainingConfiguration) => {
    console.log('✅ Config updated:', config);
    setTrainingConfig(config);
    
    if (config.targetColumn && config.featureColumns.length > 0) {
      setActiveStep(3);
    }
  };

  const resetFlow = () => {
    setActiveStep(0);
    setUploadedFile(null);
    setRealDataset(null);
    setDataValidation(null);
    setTrainingConfig(null);
    setError(null);
  };

  const loadDatasetPreview = async (datasetId: string, rows: number = 10, page: number = 1) => {
    try {
      const response = await fetch(
        `http://localhost:8000/upload/dataset/${datasetId}/preview?rows=${rows}&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      return await response.json();
    } catch (err: any) {
      console.error('Preview error:', err);
      setError(err.message);
      return null;
    }
  };

  const loadDatasetColumns = async (datasetId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/upload/dataset/${datasetId}/columns`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load columns');
      }

      return await response.json();
    } catch (err: any) {
      console.error('Columns error:', err);
      setError(err.message);
      return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h3" gutterBottom align="center">
          🧪 Phase 4 Testing - Real Data Upload System
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary">
          Complete workflow: Upload → Real Preview → Configure → Train
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Chip label="Backend Real API ✅" color="success" />
          <Chip label="File Processing 🔄" color="warning" />
          <Chip label="Real Data Preview 🧪" color="info" />
        </Box>
      </Paper>

      {/* Global Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {/* Global Loading */}
      {loading && (
        <Paper sx={{ p: 3, mb: 4, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Processing your file...</Typography>
          <Typography variant="body2" color="text.secondary">
            This may take a few moments for large files
          </Typography>
        </Paper>
      )}

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
            Step 1: Real File Upload Testing
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload CSV/Excel files - backend will process and return real preview data
          </Typography>
          
          <FileUploader
            projectId="test-project-123"
            onFileUploaded={handleFileUploaded}
            onFileRemoved={(fileId) => {
              console.log('🗑️ File removed:', fileId);
              if (uploadedFile?.id === fileId) {
                setUploadedFile(null);
                setRealDataset(null);
                setActiveStep(0);
              }
            }}
            maxFileSize={50}
            maxFiles={1}
          />

          {/* Real Dataset Info Display */}
          {realDataset && (
            <Paper sx={{ p: 2, mt: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                ✅ File Processed Successfully!
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="body2">Filename</Typography>
                  <Typography variant="h6">{realDataset.filename}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">Rows</Typography>
                  <Typography variant="h6">{realDataset.rows_count.toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">Columns</Typography>
                  <Typography variant="h6">{realDataset.columns_count}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2">File Size</Typography>
                  <Typography variant="h6">{(realDataset.file_size / 1024 / 1024).toFixed(2)} MB</Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </Paper>
      </Box>

      {/* Step 2: Real Data Preview */}
      {activeStep >= 1 && realDataset && (
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Step 2: Real Data Preview Testing
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Preview your actual uploaded data with pagination and column analysis
            </Typography>
            
            <DataPreview
              fileId={realDataset.dataset_id}
              fileName={realDataset.filename}
              initialData={realDataset.preview_data}
              initialColumns={realDataset.columns}
              totalRows={realDataset.rows_count}
              onDataValidated={handleDataValidated}
              onColumnConfigured={(config) => {
                console.log('📊 Column config from preview:', config);
              }}
              loadPreview={loadDatasetPreview}
              loadColumns={loadDatasetColumns}
            />
            
            {/* Manual Continue Button */}
            {dataValidation && dataValidation.isValid && activeStep === 1 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setActiveStep(2)}
                  size="large"
                >
                  🔄 Continue to Configuration
                </Button>
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Step 3: Column Configuration */}
      {activeStep >= 2 && realDataset && dataValidation?.isValid && (
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Step 3: Real Training Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your ML training with real column data and recommendations
            </Typography>
            
            <ColumnMapper
              columns={realDataset.columns.map(col => ({
                name: col.name,
                type: col.type,
                uniqueCount: col.unique_count,
                nullCount: col.null_count,
                sampleValues: col.sample_values,
                isRecommendedTarget: col.is_recommended_target || false,
                isRecommendedFeature: col.is_recommended_feature || false,
              }))}
              onConfigurationChange={handleConfigurationChange}
              onValidationChange={(validation) => {
                console.log('✅ Config validation:', validation);
              }}
            />
          </Paper>
        </Box>
      )}

      {/* Step 4: Ready to Train */}
      {activeStep >= 3 && trainingConfig && realDataset && (
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Step 4: Ready for Real ML Training! 🎉
            </Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                ✅ Real Data Configuration Complete!
              </Typography>
              <Typography variant="body2">
                Your actual uploaded file is processed and ready for ML training.
              </Typography>
            </Alert>

            {/* Real Data Summary */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {realDataset.filename}
                </Typography>
                <Typography variant="caption">Source File</Typography>
              </Paper>
              
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="error">
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
                  {realDataset.rows_count.toLocaleString()}
                </Typography>
                <Typography variant="caption">Training Rows</Typography>
              </Paper>
              
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">
                  {Math.round((1 - trainingConfig.modelSettings.testSize) * 100)}% / {Math.round(trainingConfig.modelSettings.testSize * 100)}%
                </Typography>
                <Typography variant="caption">Train / Test Split</Typography>
              </Paper>
              
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
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
                alert(`🚀 Ready for ML Training!\n\nFile: ${realDataset.filename}\nRows: ${realDataset.rows_count}\nTarget: ${trainingConfig.targetColumn}\nFeatures: ${trainingConfig.featureColumns.length}\n\nNext: Integrate with OSS classification system!`);
              }}
            >
              Start Real ML Training (Phase 4 Complete!)
            </Button>
          </Paper>
        </Box>
      )}

      {/* Enhanced Control Panel */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>🎮 Test Controls</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={resetFlow}>
            🔄 Reset Test Flow
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => console.log({uploadedFile, realDataset, dataValidation, trainingConfig})}
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

      {/* Enhanced Debug Info */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>🔍 Debug Information</Typography>
        <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
          {JSON.stringify({
            currentStep: activeStep,
            uploadedFile: uploadedFile ? {
              id: uploadedFile.id,
              name: uploadedFile.name,
              status: uploadedFile.status,
              hasPreview: !!uploadedFile.preview
            } : null,
            realDataset: realDataset ? {
              dataset_id: realDataset.dataset_id,
              filename: realDataset.filename,
              rows_count: realDataset.rows_count,
              columns_count: realDataset.columns_count,
              upload_status: realDataset.upload_status,
              preview_data_length: realDataset.preview_data.length,
              columns_sample: realDataset.columns.slice(0, 2)
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