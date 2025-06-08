import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Info,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  Download,
  Settings,
} from '@mui/icons-material';

// Types
interface DataPreviewProps {
  fileId: string;
  fileName: string;
  onDataValidated?: (validation: DataValidation) => void;
  onColumnConfigured?: (config: ColumnConfig) => void;
}

interface ColumnInfo {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'mixed';
  dataType: string;
  nullCount: number;
  uniqueCount: number;
  sampleValues: any[];
  hasNulls: boolean;
  isNumeric: boolean;
  isDateTime: boolean;
  statistics?: {
    min?: any;
    max?: any;
    mean?: number;
    median?: number;
    mode?: any;
  };
}

interface DataValidation {
  isValid: boolean;
  rowCount: number;
  columnCount: number;
  hasHeaders: boolean;
  hasTargetColumn: boolean;
  issues: ValidationIssue[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  column?: string;
  message: string;
  severity: number;
}

interface ColumnConfig {
  targetColumn: string | null;
  featureColumns: string[];
  excludedColumns: string[];
  dataTransformations: Record<string, string>;
}

// Mock data
const mockData = [
  { id: 1, text: "Saya ingin mengurus SBU konstruksi", category: "layanan", confidence: 0.95 },
  { id: 2, text: "Kenapa NIB saya belum keluar?", category: "pengaduan", confidence: 0.87 },
  { id: 3, text: "Bagaimana cara perpanjang SIUP?", category: "layanan", confidence: 0.92 },
  { id: 4, text: "Website OSS error terus", category: "pengaduan", confidence: 0.78 },
  { id: 5, text: "Butuh bantuan KBLI untuk usaha", category: "layanan", confidence: 0.89 },
  { id: 6, text: "Proses terlalu lama, sudah 2 minggu", category: "pengaduan", confidence: 0.94 },
  { id: 7, text: "Mau daftar OSS untuk usaha baru", category: "layanan", confidence: 0.96 },
  { id: 8, text: "System maintenance kapan selesai?", category: "pengaduan", confidence: 0.82 },
];

const mockColumns: ColumnInfo[] = [
  {
    name: 'id',
    type: 'number',
    dataType: 'integer',
    nullCount: 0,
    uniqueCount: 8,
    sampleValues: [1, 2, 3, 4, 5],
    hasNulls: false,
    isNumeric: true,
    isDateTime: false,
    statistics: { min: 1, max: 8, mean: 4.5, median: 4.5 }
  },
  {
    name: 'text',
    type: 'text',
    dataType: 'string',
    nullCount: 0,
    uniqueCount: 8,
    sampleValues: ["Saya ingin mengurus SBU konstruksi", "Kenapa NIB saya belum keluar?"],
    hasNulls: false,
    isNumeric: false,
    isDateTime: false
  },
  {
    name: 'category',
    type: 'text',
    dataType: 'string',
    nullCount: 0,
    uniqueCount: 2,
    sampleValues: ["layanan", "pengaduan"],
    hasNulls: false,
    isNumeric: false,
    isDateTime: false
  },
  {
    name: 'confidence',
    type: 'number',
    dataType: 'float',
    nullCount: 0,
    uniqueCount: 8,
    sampleValues: [0.95, 0.87, 0.92, 0.78, 0.89],
    hasNulls: false,
    isNumeric: true,
    isDateTime: false,
    statistics: { min: 0.78, max: 0.96, mean: 0.89, median: 0.89 }
  }
];

const DataPreview: React.FC<DataPreviewProps> = ({
  fileId,
  fileName,
  onDataValidated,
  onColumnConfigured
}) => {
  const [data, setData] = useState(mockData);
  const [columns, setColumns] = useState<ColumnInfo[]>(mockColumns);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [selectedTargetColumn, setSelectedTargetColumn] = useState<string>('category');
  const [selectedFeatureColumns, setSelectedFeatureColumns] = useState<string[]>(['text']);
  const [validation, setValidation] = useState<DataValidation | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewRows, setPreviewRows] = useState(10);

  // Data validation
  useEffect(() => {
    validateData();
  }, [data, columns]);

  const validateData = () => {
    const issues: ValidationIssue[] = [];
    
    // Check for missing values
    columns.forEach(col => {
      if (col.hasNulls && col.nullCount > data.length * 0.1) {
        issues.push({
          type: 'warning',
          column: col.name,
          message: `Column '${col.name}' has ${col.nullCount} missing values (${((col.nullCount / data.length) * 100).toFixed(1)}%)`,
          severity: 2
        });
      }
    });

    // Check for low unique values in potential feature columns
    columns.forEach(col => {
      if (col.type === 'text' && col.uniqueCount < 3 && col.name !== selectedTargetColumn) {
        issues.push({
          type: 'info',
          column: col.name,
          message: `Column '${col.name}' has only ${col.uniqueCount} unique values - consider as categorical`,
          severity: 1
        });
      }
    });

    // Check target column
    const targetCol = columns.find(col => col.name === selectedTargetColumn);
    if (targetCol && targetCol.uniqueCount < 2) {
      issues.push({
        type: 'error',
        column: selectedTargetColumn,
        message: 'Target column must have at least 2 unique values for classification',
        severity: 3
      });
    }

    // Determine data quality
    let quality: DataValidation['quality'] = 'excellent';
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    
    if (errorCount > 0) quality = 'poor';
    else if (warningCount > 2) quality = 'fair';
    else if (warningCount > 0) quality = 'good';

    const newValidation: DataValidation = {
      isValid: errorCount === 0,
      rowCount: data.length,
      columnCount: columns.length,
      hasHeaders: true,
      hasTargetColumn: !!selectedTargetColumn,
      issues,
      quality
    };

    setValidation(newValidation);
    onDataValidated?.(newValidation);
  };

  // Column configuration
  useEffect(() => {
    const config: ColumnConfig = {
      targetColumn: selectedTargetColumn,
      featureColumns: selectedFeatureColumns,
      excludedColumns: Array.from(hiddenColumns),
      dataTransformations: {}
    };
    onColumnConfigured?.(config);
  }, [selectedTargetColumn, selectedFeatureColumns, hiddenColumns]);

  const toggleColumnVisibility = (columnName: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        newSet.delete(columnName);
      } else {
        newSet.add(columnName);
      }
      return newSet;
    });
  };

  const getColumnTypeColor = (type: ColumnInfo['type']) => {
    switch (type) {
      case 'number': return 'primary';
      case 'text': return 'secondary';
      case 'boolean': return 'success';
      case 'date': return 'warning';
      case 'mixed': return 'error';
      default: return 'default';
    }
  };

  const getQualityColor = (quality: DataValidation['quality']) => {
    switch (quality) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const visibleColumns = columns.filter(col => !hiddenColumns.has(col.name));
  const visibleData = data.slice(0, previewRows);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Data Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {fileName} • {data.length} rows × {columns.length} columns
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<Refresh />}
            onClick={() => validateData()}
          >
            Refresh
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Download />}
          >
            Export Sample
          </Button>
        </Box>
      </Box>

      {/* Data Quality Summary */}
      {validation && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h6">Data Quality Assessment</Typography>
                  <Chip 
                    label={validation.quality.toUpperCase()} 
                    color={getQualityColor(validation.quality) as any}
                    size="small"
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Rows</Typography>
                    <Typography variant="h6">{validation.rowCount.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Columns</Typography>
                    <Typography variant="h6">{validation.columnCount}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Issues</Typography>
                    <Typography variant="h6" color={validation.issues.length > 0 ? 'warning.main' : 'success.main'}>
                      {validation.issues.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Valid</Typography>
                    <Typography variant="h6" color={validation.isValid ? 'success.main' : 'error.main'}>
                      {validation.isValid ? 'Yes' : 'No'}
                    </Typography>
                  </Grid>
                </Grid>

                {validation.issues.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Issues Found:</Typography>
                    {validation.issues.slice(0, 3).map((issue, index) => (
                      <Alert 
                        key={index} 
                        severity={issue.type === 'error' ? 'error' : issue.type === 'warning' ? 'warning' : 'info'}
                        sx={{ mb: 1 }}
                      >
                        {issue.column && <strong>{issue.column}:</strong>} {issue.message}
                      </Alert>
                    ))}
                    {validation.issues.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{validation.issues.length - 3} more issues
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Column Configuration</Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Target Column</InputLabel>
                  <Select
                    value={selectedTargetColumn || ''}
                    label="Target Column"
                    onChange={(e) => setSelectedTargetColumn(e.target.value)}
                  >
                    {columns.map(col => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Feature Columns: {selectedFeatureColumns.length} selected
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedFeatureColumns.map(col => (
                    <Chip 
                      key={col}
                      label={col}
                      size="small"
                      onDelete={() => setSelectedFeatureColumns(prev => prev.filter(c => c !== col))}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Column Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Column Information</Typography>
          
          <Grid container spacing={2}>
            {columns.map((col) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={col.name}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    border: hiddenColumns.has(col.name) ? '1px dashed #ccc' : '1px solid #e0e0e0',
                    opacity: hiddenColumns.has(col.name) ? 0.6 : 1,
                    position: 'relative'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap>
                      {col.name}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => toggleColumnVisibility(col.name)}
                    >
                      {hiddenColumns.has(col.name) ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </Box>
                  
                  <Chip 
                    label={col.type} 
                    size="small" 
                    color={getColumnTypeColor(col.type) as any}
                    sx={{ mb: 1 }}
                  />
                  
                  <Typography variant="caption" display="block" color="text.secondary">
                    Unique: {col.uniqueCount} / {data.length}
                  </Typography>
                  
                  {col.hasNulls && (
                    <Typography variant="caption" display="block" color="warning.main">
                      Nulls: {col.nullCount}
                    </Typography>
                  )}
                  
                  {col.statistics && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Range: {col.statistics.min} - {col.statistics.max}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Sample: {col.sampleValues.slice(0, 2).map(v => 
                        typeof v === 'string' && v.length > 20 ? v.substring(0, 17) + '...' : v
                      ).join(', ')}
                    </Typography>
                  </Box>

                  {/* Column role indicators */}
                  {col.name === selectedTargetColumn && (
                    <Chip 
                      label="Target" 
                      size="small" 
                      color="error" 
                      sx={{ position: 'absolute', top: 8, right: 8 }} 
                    />
                  )}
                  {selectedFeatureColumns.includes(col.name) && (
                    <Chip 
                      label="Feature" 
                      size="small" 
                      color="primary" 
                      sx={{ position: 'absolute', top: 8, right: 8 }} 
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Data Table Preview */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Data Preview</Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Show rows</InputLabel>
                <Select
                  value={previewRows}
                  label="Show rows"
                  onChange={(e) => setPreviewRows(Number(e.target.value))}
                >
                  <MenuItem value={5}>5 rows</MenuItem>
                  <MenuItem value={10}>10 rows</MenuItem>
                  <MenuItem value={25}>25 rows</MenuItem>
                  <MenuItem value={50}>50 rows</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </Box>
          </Box>

          {showPreview && (
            <TableContainer component={Paper} sx={{ maxHeight: 500, border: '1px solid #e0e0e0' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      #
                    </TableCell>
                    {visibleColumns.map((col) => (
                      <TableCell 
                        key={col.name} 
                        sx={{ 
                          fontWeight: 'bold', 
                          backgroundColor: '#f5f5f5',
                          position: 'relative'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {col.name}
                          <Chip 
                            label={col.type} 
                            size="small" 
                            color={getColumnTypeColor(col.type) as any}
                          />
                          
                          {col.name === selectedTargetColumn && (
                            <Tooltip title="Target Variable">
                              <Chip label="T" size="small" color="error" />
                            </Tooltip>
                          )}
                          
                          {selectedFeatureColumns.includes(col.name) && (
                            <Tooltip title="Feature Variable">
                              <Chip label="F" size="small" color="primary" />
                            </Tooltip>
                          )}
                          
                          {col.hasNulls && (
                            <Tooltip title={`${col.nullCount} missing values`}>
                              <Warning color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                
                <TableBody>
                  {visibleData.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        {index + 1}
                      </TableCell>
                      {visibleColumns.map((col) => (
                        <TableCell key={col.name}>
                          {col.type === 'text' && typeof row[col.name as keyof typeof row] === 'string' && 
                           (row[col.name as keyof typeof row] as string).length > 50 ? (
                            <Tooltip title={row[col.name as keyof typeof row] as string}>
                              <Typography variant="body2" sx={{ cursor: 'help' }}>
                                {(row[col.name as keyof typeof row] as string).substring(0, 47)}...
                              </Typography>
                            </Tooltip>
                          ) : col.type === 'number' && col.name === 'confidence' ? (
                            <Chip 
                              label={`${(Number(row[col.name as keyof typeof row]) * 100).toFixed(1)}%`}
                              size="small"
                              color={Number(row[col.name as keyof typeof row]) > 0.8 ? 'success' : 'warning'}
                            />
                          ) : col.name === selectedTargetColumn ? (
                            <Chip 
                              label={String(row[col.name as keyof typeof row])}
                              size="small"
                              color="secondary"
                            />
                          ) : (
                            String(row[col.name as keyof typeof row])
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min(previewRows, data.length)} of {data.length} rows • 
              {visibleColumns.length} of {columns.length} columns visible
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<Settings />}
              >
                Column Settings
              </Button>
              <Button 
                variant="contained" 
                size="small"
                disabled={!validation?.isValid}
              >
                Continue to Training
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DataPreview;