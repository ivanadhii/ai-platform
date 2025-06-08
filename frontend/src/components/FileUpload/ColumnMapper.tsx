import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Alert,
  Slider,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  GpsFixed as Target,
  ViewColumn as Features,
  Settings,
  Transform,
  Tune,
  Info,
  CheckCircle,
  Warning,
  Add,
  Remove,
  SwapHoriz,
  AutoAwesome,
} from '@mui/icons-material';

// Types
interface ColumnMapperProps {
  columns: ColumnInfo[];
  onConfigurationChange?: (config: TrainingConfiguration) => void;
  onValidationChange?: (validation: ConfigValidation) => void;
}

interface ColumnInfo {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'mixed';
  uniqueCount: number;
  nullCount: number;
  sampleValues: any[];
  isRecommendedTarget?: boolean;
  isRecommendedFeature?: boolean;
}

interface TrainingConfiguration {
  targetColumn: string | null;
  featureColumns: string[];
  excludedColumns: string[];
  preprocessing: {
    handleMissingValues: 'drop' | 'fill_mean' | 'fill_mode' | 'fill_custom';
    customFillValue?: string;
    textProcessing: {
      lowercase: boolean;
      removeStopwords: boolean;
      removePunctuation: boolean;
      useStemmering: boolean;
    };
    numericalProcessing: {
      normalize: boolean;
      standardize: boolean;
      handleOutliers: boolean;
    };
  };
  modelSettings: {
    testSize: number;
    randomState: number;
    crossValidation: number;
    algorithm: 'auto' | 'logistic' | 'svm' | 'random_forest' | 'naive_bayes';
    hyperparameterTuning: boolean;
  };
}

interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// Mock data
const mockColumns: ColumnInfo[] = [
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
    sampleValues: ["Saya ingin mengurus SBU konstruksi", "Kenapa NIB saya belum keluar?"],
    isRecommendedFeature: true
  },
  {
    name: 'category',
    type: 'text',
    uniqueCount: 2,
    nullCount: 0,
    sampleValues: ["layanan", "pengaduan"],
    isRecommendedTarget: true
  },
  {
    name: 'confidence',
    type: 'number',
    uniqueCount: 80,
    nullCount: 0,
    sampleValues: [0.95, 0.87, 0.92],
    isRecommendedFeature: false
  },
  {
    name: 'timestamp',
    type: 'date',
    uniqueCount: 100,
    nullCount: 0,
    sampleValues: ["2024-01-01", "2024-01-02"],
    isRecommendedFeature: false
  }
];

const ColumnMapper: React.FC<ColumnMapperProps> = ({
  columns = mockColumns,
  onConfigurationChange,
  onValidationChange
}) => {
  const [config, setConfig] = useState<TrainingConfiguration>({
    targetColumn: columns.find(c => c.isRecommendedTarget)?.name || null,
    featureColumns: columns.filter(c => c.isRecommendedFeature).map(c => c.name),
    excludedColumns: [],
    preprocessing: {
      handleMissingValues: 'fill_mode',
      textProcessing: {
        lowercase: true,
        removeStopwords: true,
        removePunctuation: true,
        useStemmering: false
      },
      numericalProcessing: {
        normalize: true,
        standardize: false,
        handleOutliers: true
      }
    },
    modelSettings: {
      testSize: 0.2,
      randomState: 42,
      crossValidation: 5,
      algorithm: 'auto',
      hyperparameterTuning: true
    }
  });

  const [validation, setValidation] = useState<ConfigValidation>({
    isValid: false,
    errors: [],
    warnings: [],
    recommendations: []
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['target', 'features'])
  );

  // Validate configuration
  useEffect(() => {
    validateConfiguration();
  }, [config]);

  // Notify parent components
  useEffect(() => {
    onConfigurationChange?.(config);
    onValidationChange?.(validation);
  }, [config, validation, onConfigurationChange, onValidationChange]);

  const validateConfiguration = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Target column validation
    if (!config.targetColumn) {
      errors.push('Target column must be selected');
    } else {
      const targetCol = columns.find(c => c.name === config.targetColumn);
      if (targetCol) {
        if (targetCol.uniqueCount < 2) {
          errors.push('Target column must have at least 2 unique values');
        }
        if (targetCol.nullCount > 0) {
          warnings.push(`Target column has ${targetCol.nullCount} missing values`);
        }
        if (targetCol.uniqueCount > 50) {
          warnings.push('Target column has many unique values - consider if this is suitable for classification');
        }
      }
    }

    // Feature columns validation
    if (config.featureColumns.length === 0) {
      errors.push('At least one feature column must be selected');
    }

    // Text processing recommendations
    const textColumns = columns.filter(c => 
      c.type === 'text' && config.featureColumns.includes(c.name)
    );
    if (textColumns.length > 0) {
      recommendations.push('Text preprocessing is enabled for optimal text classification performance');
    }

    // Missing values check
    const columnsWithNulls = columns.filter(c => 
      (config.featureColumns.includes(c.name) || c.name === config.targetColumn) && c.nullCount > 0
    );
    if (columnsWithNulls.length > 0) {
      recommendations.push(`Missing value handling configured for ${columnsWithNulls.length} columns`);
    }

    // Test size validation
    if (config.modelSettings.testSize < 0.1 || config.modelSettings.testSize > 0.5) {
      warnings.push('Test size should typically be between 10% and 50%');
    }

    setValidation({
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    });
  };

  const updateConfig = (updates: Partial<TrainingConfiguration>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  const updatePreprocessing = (updates: Partial<TrainingConfiguration['preprocessing']>) => {
    setConfig(prev => ({
      ...prev,
      preprocessing: {
        ...prev.preprocessing,
        ...updates
      }
    }));
  };

  const updateTextProcessing = (updates: Partial<TrainingConfiguration['preprocessing']['textProcessing']>) => {
    setConfig(prev => ({
      ...prev,
      preprocessing: {
        ...prev.preprocessing,
        textProcessing: {
          ...prev.preprocessing.textProcessing,
          ...updates
        }
      }
    }));
  };

  const updateNumericalProcessing = (updates: Partial<TrainingConfiguration['preprocessing']['numericalProcessing']>) => {
    setConfig(prev => ({
      ...prev,
      preprocessing: {
        ...prev.preprocessing,
        numericalProcessing: {
          ...prev.preprocessing.numericalProcessing,
          ...updates
        }
      }
    }));
  };

  const updateModelSettings = (updates: Partial<TrainingConfiguration['modelSettings']>) => {
    setConfig(prev => ({
      ...prev,
      modelSettings: {
        ...prev.modelSettings,
        ...updates
      }
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const addFeatureColumn = (columnName: string) => {
    if (!config.featureColumns.includes(columnName)) {
      updateConfig({
        featureColumns: [...config.featureColumns, columnName]
      });
    }
  };

  const removeFeatureColumn = (columnName: string) => {
    updateConfig({
      featureColumns: config.featureColumns.filter(name => name !== columnName)
    });
  };

  const autoSelectFeatures = () => {
    const recommendedFeatures = columns
      .filter(c => c.isRecommendedFeature || 
        (c.type === 'text' && c.uniqueCount > 10) ||
        (c.type === 'number' && c.name !== 'id')
      )
      .map(c => c.name);
    
    updateConfig({ featureColumns: recommendedFeatures });
  };

  const resetToDefaults = () => {
    setConfig({
      targetColumn: columns.find(c => c.isRecommendedTarget)?.name || null,
      featureColumns: columns.filter(c => c.isRecommendedFeature).map(c => c.name),
      excludedColumns: [],
      preprocessing: {
        handleMissingValues: 'fill_mode',
        textProcessing: {
          lowercase: true,
          removeStopwords: true,
          removePunctuation: true,
          useStemmering: false
        },
        numericalProcessing: {
          normalize: true,
          standardize: false,
          handleOutliers: true
        }
      },
      modelSettings: {
        testSize: 0.2,
        randomState: 42,
        crossValidation: 5,
        algorithm: 'auto',
        hyperparameterTuning: true
      }
    });
  };

  const getColumnColor = (columnName: string) => {
    if (columnName === config.targetColumn) return 'error';
    if (config.featureColumns.includes(columnName)) return 'primary';
    if (config.excludedColumns.includes(columnName)) return 'default';
    return 'secondary';
  };

  const availableColumns = columns.filter(c => 
    c.name !== config.targetColumn && 
    !config.featureColumns.includes(c.name) &&
    !config.excludedColumns.includes(c.name)
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Column Mapping & Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure how your data columns will be used for machine learning training
        </Typography>
      </Box>

      {/* Validation Summary */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6">Configuration Status</Typography>
                <Chip 
                  label={validation.isValid ? 'Ready' : 'Issues Found'} 
                  color={validation.isValid ? 'success' : 'error'}
                  icon={validation.isValid ? <CheckCircle /> : <Warning />}
                />
              </Box>

              {validation.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  <strong>Errors:</strong>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {validation.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <strong>Warnings:</strong>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {validation.recommendations.length > 0 && (
                <Alert severity="info">
                  <strong>Recommendations:</strong>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validation.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Target Column Selection */}
      <Accordion 
        expanded={expandedSections.has('target')} 
        onChange={() => toggleSection('target')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Target color="error" />
            <Typography variant="h6">Target Column</Typography>
            {config.targetColumn && (
              <Chip label={config.targetColumn} color="error" size="small" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Target Column</InputLabel>
                <Select
                  value={config.targetColumn || ''}
                  label="Select Target Column"
                  onChange={(e) => updateConfig({ targetColumn: e.target.value || null })}
                >
                  {columns.map(col => (
                    <MenuItem key={col.name} value={col.name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{col.name}</span>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip label={col.type} size="small" />
                          <Chip label={`${col.uniqueCount} unique`} size="small" />
                          {col.isRecommendedTarget && (
                            <Chip label="Recommended" color="success" size="small" />
                          )}
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Target Column</strong> is what you want to predict. 
                  For classification, it should contain categories or labels.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Feature Columns Selection */}
      <Accordion 
        expanded={expandedSections.has('features')} 
        onChange={() => toggleSection('features')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Features color="primary" />
            <Typography variant="h6">Feature Columns</Typography>
            <Chip label={`${config.featureColumns.length} selected`} color="primary" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<AutoAwesome />}
              onClick={autoSelectFeatures}
            >
              Auto-Select Features
            </Button>
            <Button 
              variant="outlined"
              onClick={() => updateConfig({ featureColumns: [] })}
            >
              Clear All
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Selected Features</Typography>
              <List>
                {config.featureColumns.map(colName => {
                  const col = columns.find(c => c.name === colName);
                  return (
                    <ListItem key={colName}>
                      <ListItemIcon>
                        <Features color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={colName}
                        secondary={col ? `${col.type} • ${col.uniqueCount} unique values` : ''}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => removeFeatureColumn(colName)}
                          color="error"
                        >
                          <Remove />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Available Columns</Typography>
              <List>
                {availableColumns.map(col => (
                  <ListItem key={col.name}>
                    <ListItemIcon>
                      <Chip label={col.type} size="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={col.name}
                      secondary={`${col.uniqueCount} unique • ${col.nullCount} nulls`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={() => addFeatureColumn(col.name)}
                        color="primary"
                      >
                        <Add />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Preprocessing Configuration */}
      <Accordion 
        expanded={expandedSections.has('preprocessing')} 
        onChange={() => toggleSection('preprocessing')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Transform color="warning" />
            <Typography variant="h6">Data Preprocessing</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Missing Values */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Missing Values</Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Handle Missing Values</InputLabel>
                <Select
                  value={config.preprocessing.handleMissingValues}
                  label="Handle Missing Values"
                  onChange={(e) => updatePreprocessing({ 
                    handleMissingValues: e.target.value as any 
                  })}
                >
                  <MenuItem value="drop">Drop rows with missing values</MenuItem>
                  <MenuItem value="fill_mean">Fill with mean (numbers)</MenuItem>
                  <MenuItem value="fill_mode">Fill with most common value</MenuItem>
                  <MenuItem value="fill_custom">Fill with custom value</MenuItem>
                </Select>
              </FormControl>

              {config.preprocessing.handleMissingValues === 'fill_custom' && (
                <TextField
                  fullWidth
                  label="Custom Fill Value"
                  value={config.preprocessing.customFillValue || ''}
                  onChange={(e) => updatePreprocessing({ customFillValue: e.target.value })}
                />
              )}
            </Grid>

            {/* Text Processing */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Text Processing</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.preprocessing.textProcessing.lowercase}
                      onChange={(e) => updateTextProcessing({ lowercase: e.target.checked })}
                    />
                  }
                  label="Convert to lowercase"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.preprocessing.textProcessing.removeStopwords}
                      onChange={(e) => updateTextProcessing({ removeStopwords: e.target.checked })}
                    />
                  }
                  label="Remove stopwords"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.preprocessing.textProcessing.removePunctuation}
                      onChange={(e) => updateTextProcessing({ removePunctuation: e.target.checked })}
                    />
                  }
                  label="Remove punctuation"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.preprocessing.textProcessing.useStemmering}
                      onChange={(e) => updateTextProcessing({ useStemmering: e.target.checked })}
                    />
                  }
                  label="Use stemming (Indonesian)"
                />
              </Box>
            </Grid>

            {/* Numerical Processing */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Numerical Processing</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.preprocessing.numericalProcessing.normalize}
                      onChange={(e) => updateNumericalProcessing({ normalize: e.target.checked })}
                    />
                  }
                  label="Normalize (0-1 scale)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.preprocessing.numericalProcessing.standardize}
                      onChange={(e) => updateNumericalProcessing({ standardize: e.target.checked })}
                    />
                  }
                  label="Standardize (z-score)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.preprocessing.numericalProcessing.handleOutliers}
                      onChange={(e) => updateNumericalProcessing({ handleOutliers: e.target.checked })}
                    />
                  }
                  label="Handle outliers"
                />
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Model Settings */}
      <Accordion 
        expanded={expandedSections.has('model')} 
        onChange={() => toggleSection('model')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tune color="info" />
            <Typography variant="h6">Model Settings</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Train/Test Split */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Train/Test Split: {Math.round((1 - config.modelSettings.testSize) * 100)}% / {Math.round(config.modelSettings.testSize * 100)}%
              </Typography>
              <Slider
                value={config.modelSettings.testSize}
                onChange={(_, value) => updateModelSettings({ testSize: value as number })}
                min={0.1}
                max={0.5}
                step={0.05}
                marks={[
                  { value: 0.1, label: '10%' },
                  { value: 0.2, label: '20%' },
                  { value: 0.3, label: '30%' },
                  { value: 0.4, label: '40%' },
                  { value: 0.5, label: '50%' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              />
              <Typography variant="caption" color="text.secondary">
                Percentage of data used for testing
              </Typography>
            </Grid>

            {/* Algorithm Selection */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Algorithm</InputLabel>
                <Select
                  value={config.modelSettings.algorithm}
                  label="Algorithm"
                  onChange={(e) => updateModelSettings({ algorithm: e.target.value as any })}
                >
                  <MenuItem value="auto">Auto-select best algorithm</MenuItem>
                  <MenuItem value="logistic">Logistic Regression</MenuItem>
                  <MenuItem value="svm">Support Vector Machine</MenuItem>
                  <MenuItem value="random_forest">Random Forest</MenuItem>
                  <MenuItem value="naive_bayes">Naive Bayes</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Auto-select will test multiple algorithms
              </Typography>
            </Grid>

            {/* Cross Validation */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Cross Validation: {config.modelSettings.crossValidation}-fold
              </Typography>
              <Slider
                value={config.modelSettings.crossValidation}
                onChange={(_, value) => updateModelSettings({ crossValidation: value as number })}
                min={3}
                max={10}
                step={1}
                marks={[
                  { value: 3, label: '3' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' }
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Number of folds for cross-validation
              </Typography>
            </Grid>

            {/* Advanced Settings */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>Advanced Settings</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Random State"
                    type="number"
                    value={config.modelSettings.randomState}
                    onChange={(e) => updateModelSettings({ randomState: parseInt(e.target.value) || 42 })}
                    helperText="For reproducible results"
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.modelSettings.hyperparameterTuning}
                        onChange={(e) => updateModelSettings({ hyperparameterTuning: e.target.checked })}
                      />
                    }
                    label="Hyperparameter Tuning"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Automatically optimize model parameters (takes longer)
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Configuration Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Configuration Summary</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Target color="error" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" color="error.main">
                  {config.targetColumn || 'Not Selected'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Target Column
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Features color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" color="primary.main">
                  {config.featureColumns.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Feature Columns
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <SwapHoriz color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" color="warning.main">
                  {Math.round((1 - config.modelSettings.testSize) * 100)}% / {Math.round(config.modelSettings.testSize * 100)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Train / Test Split
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Tune color="info" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" color="info.main">
                  {config.modelSettings.algorithm === 'auto' ? 'Auto' : config.modelSettings.algorithm.replace('_', ' ')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Algorithm
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          variant="outlined" 
          startIcon={<Settings />}
          onClick={resetToDefaults}
        >
          Reset to Defaults
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined">
            Save Configuration
          </Button>
          <Button 
            variant="contained" 
            disabled={!validation.isValid}
            size="large"
          >
            Start Training
          </Button>
        </Box>
      </Box>

      {/* Training Preview */}
      {validation.isValid && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            ✅ Ready to Start Training!
          </Typography>
          <Typography variant="body2">
            Configuration is valid. The model will be trained using <strong>{config.targetColumn}</strong> as 
            target with <strong>{config.featureColumns.length}</strong> feature columns. 
            {config.modelSettings.algorithm === 'auto' 
              ? ' Multiple algorithms will be tested to find the best performer.'
              : ` ${config.modelSettings.algorithm.replace('_', ' ')} algorithm will be used.`
            }
            {config.modelSettings.hyperparameterTuning && ' Hyperparameter tuning is enabled for optimal performance.'}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ColumnMapper;