// frontend/src/components/FileUpload/DataPreview.tsx - Enhanced for Real Data

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
  Pagination,
  LinearProgress,
  Skeleton,
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
  TableChart,
  Analytics,
} from '@mui/icons-material';

// Enhanced interfaces for real data
interface DataPreviewProps {
  fileId: string;
  fileName: string;
  initialData?: any[];
  initialColumns?: any[];
  totalRows?: number;
  onDataValidated?: (validation: DataValidation) => void;
  onColumnConfigured?: (config: ColumnConfig) => void;
  loadPreview?: (fileId: string, rows: number, page: number) => Promise<any>;
  loadColumns?: (fileId: string) => Promise<any>;
}

interface RealColumnInfo {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'mixed';
  data_type: string;
  null_count: number;
  unique_count: number;
  total_count: number;
  null_percentage: number;
  sample_values: any[];
  statistics?: any;
  data_quality: 'good' | 'fair' | 'poor';
  is_recommended_target?: boolean;
  is_recommended_feature?: boolean;
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
}

interface PaginatedData {
  data: any[];
  columns: string[];
  rows_shown: number;
  total_rows: number;
  current_page: number;
  rows_per_page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

const DataPreview: React.FC<DataPreviewProps> = ({
  fileId,
  fileName,
  initialData = [],
  initialColumns = [],
  totalRows = 0,
  onDataValidated,
  onColumnConfigured,
  loadPreview,
  loadColumns,
}) => {
  const [data, setData] = useState<any[]>(initialData);
  const [columns, setColumns] = useState<RealColumnInfo[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [selectedTargetColumn, setSelectedTargetColumn] = useState<string>('');
  const [selectedFeatureColumns, setSelectedFeatureColumns] = useState<string[]>([]);
  const [validation, setValidation] = useState<DataValidation | null>(null);
  const [previewRows, setPreviewRows] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data and columns
  useEffect(() => {
    loadInitialData();
  }, [fileId]);

  // Auto-select recommended columns
  useEffect(() => {
    if (columns.length > 0) {
      // Auto-select recommended target
      const recommendedTarget = columns.find(col => col.is_recommended_target);
      if (recommendedTarget && !selectedTargetColumn) {
        setSelectedTargetColumn(recommendedTarget.name);
      }

      // Auto-select recommended features
      const recommendedFeatures = columns
        .filter(col => col.is_recommended_feature)
        .map(col => col.name);
      if (recommendedFeatures.length > 0 && selectedFeatureColumns.length === 0) {
        setSelectedFeatureColumns(recommendedFeatures);
      }
    }
  }, [columns]);

  // Validate data whenever configuration changes
  useEffect(() => {
    if (columns.length > 0) {
      validateData();
    }
  }, [data, columns, selectedTargetColumn, selectedFeatureColumns]);

  // Update parent components
  useEffect(() => {
    if (validation) {
      onDataValidated?.(validation);
    }
  }, [validation, onDataValidated]);

  useEffect(() => {
    const config: ColumnConfig = {
      targetColumn: selectedTargetColumn,
      featureColumns: selectedFeatureColumns,
      excludedColumns: Array.from(hiddenColumns),
    };
    onColumnConfigured?.(config);
  }, [selectedTargetColumn, selectedFeatureColumns, hiddenColumns, onColumnConfigured]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use initial data if provided, otherwise load from API
      if (initialData.length > 0) {
        setData(initialData);
      } else if (loadPreview) {
        const previewData = await loadPreview(fileId, previewRows, currentPage);
        if (previewData) {
          setData(previewData.data || []);
          setTotalPages(previewData.total_pages || 1);
        }
      }

      // Load column information
      if (initialColumns.length > 0) {
        setColumns(initialColumns);
      } else if (loadColumns) {
        const columnsData = await loadColumns(fileId);
        if (columnsData) {
          setColumns(columnsData);
        }
      }

    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load preview data');
    } finally {
      setLoading(false);
    }
  };

  const loadPageData = async (page: number, rows: number) => {
    if (!loadPreview) return;

    try {
      setLoading(true);
      const previewData: PaginatedData = await loadPreview(fileId, rows, page);
      
      if (previewData) {
        setData(previewData.data);
        setCurrentPage(previewData.current_page);
        setTotalPages(previewData.total_pages);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load page data');
    } finally {
      setLoading(false);
    }
  };

  const handleRowsPerPageChange = (rows: number) => {
    setPreviewRows(rows);
    loadPageData(1, rows);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    loadPageData(page, previewRows);
  };

  const validateData = () => {
    const issues: ValidationIssue[] = [];
    
    // Check for missing values in critical columns
    columns.forEach(col => {
      if (col.null_percentage > 50) {
        issues.push({
          type: 'warning',
          column: col.name,
          message: `Column '${col.name}' has ${col.null_percentage.toFixed(1)}% missing values`,
          severity: 2
        });
      }
    });

    // Check target column
    if (selectedTargetColumn) {
      const targetCol = columns.find(col => col.name === selectedTargetColumn);
      if (targetCol) {
        if (targetCol.unique_count < 2) {
          issues.push({
            type: 'error',
            column: selectedTargetColumn,
            message: 'Target column must have at least 2 unique values for classification',
            severity: 3
          });
        }
        if (targetCol.null_count > 0) {
          issues.push({
            type: 'warning',
            column: selectedTargetColumn,
            message: `Target column has ${targetCol.null_count} missing values`,
            severity: 2
          });
        }
      }
    } else {
      issues.push({
        type: 'error',
        message: 'No target column selected',
        severity: 3
      });
    }

    // Check feature columns
    if (selectedFeatureColumns.length === 0) {
      issues.push({
        type: 'error',
        message: 'At least one feature column must be selected',
        severity: 3
      });
    }

    // Data quality assessment
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    
    let quality: DataValidation['quality'] = 'excellent';
    if (errorCount > 0) quality = 'poor';
    else if (warningCount > 2) quality = 'fair';
    else if (warningCount > 0) quality = 'good';

    const newValidation: DataValidation = {
      isValid: errorCount === 0,
      rowCount: totalRows || data.length,
      columnCount: columns.length,
      hasHeaders: true,
      hasTargetColumn: !!selectedTargetColumn,
      issues,
      quality
    };

    setValidation(newValidation);
  };

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

  const toggleFeatureColumn = (columnName: string) => {
    setSelectedFeatureColumns(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(col => col !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  const getColumnTypeColor = (type: RealColumnInfo['type']) => {
    switch (type) {
      case 'number': return 'primary';
      case 'text': return 'secondary';
      case 'boolean': return 'success';
      case 'date': return 'warning';
      case 'mixed': return 'error';
      default: return 'default';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'success';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const visibleColumns = columns.filter(col => !hiddenColumns.has(col.name));

  if (loading && data.length === 0) {
    return (
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" gutterBottom>Loading Data Preview...</Typography>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={400} sx={{ mt: 3 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Real Data Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {fileName} • {(totalRows || data.length).toLocaleString()} rows × {columns.length} columns
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<Refresh />}
            onClick={loadInitialData}
            disabled={loading}
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

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading Progress */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

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
                  <Chip 
                    label={validation.isValid ? 'READY' : 'ISSUES FOUND'}
                    color={validation.isValid ? 'success' : 'error'}
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
                    <Typography variant="body2" color="text.secondary">Ready</Typography>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {col.name}
                          <Chip label={col.type} size="small" color={getColumnTypeColor(col.type) as any} />
                          {col.is_recommended_target && (
                            <Chip label="Recommended" color="success" size="small" />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Feature Columns: {selectedFeatureColumns.length} selected
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto' }}>
                  {selectedFeatureColumns.map(col => (
                    <Chip 
                      key={col}
                      label={col}
                      size="small"
                      onDelete={() => toggleFeatureColumn(col)}
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
          <Typography variant="h6" gutterBottom>Column Analysis</Typography>
          
          <Grid container spacing={2}>
            {columns.map((col) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={col.name}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    border: hiddenColumns.has(col.name) ? '1px dashed #ccc' : '1px solid #e0e0e0',
                    opacity: hiddenColumns.has(col.name) ? 0.6 : 1,
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (col.name !== selectedTargetColumn) {
                      toggleFeatureColumn(col.name);
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap>
                      {col.name}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleColumnVisibility(col.name);
                      }}
                    >
                      {hiddenColumns.has(col.name) ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={col.type} 
                      size="small" 
                      color={getColumnTypeColor(col.type) as any}
                    />
                    <Chip 
                      label={col.data_quality} 
                      size="small" 
                      color={getQualityColor(col.data_quality) as any}
                    />
                  </Box>
                  
                  <Typography variant="caption" display="block" color="text.secondary">
                    Unique: {col.unique_count} / {col.total_count}
                  </Typography>
                  
                  {col.null_count > 0 && (
                    <Typography variant="caption" display="block" color="warning.main">
                      Missing: {col.null_count} ({col.null_percentage.toFixed(1)}%)
                    </Typography>
                  )}
                  
                  {col.statistics && (
                    <Box sx={{ mt: 1 }}>
                      {col.type === 'number' && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Range: {col.statistics.min?.toFixed(2)} - {col.statistics.max?.toFixed(2)}
                        </Typography>
                      )}
                      {col.type === 'text' && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Avg Length: {col.statistics.avg_length?.toFixed(0)} chars
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Sample: {col.sample_values.slice(0, 2).map(v => 
                        typeof v === 'string' && v.length > 15 ? v.substring(0, 12) + '...' : v
                      ).join(', ')}
                    </Typography>
                  </Box>

                  {/* Column role indicators */}
                  {col.name === selectedTargetColumn && (
                    <Chip 
                      label="Target" 
                      size="small" 
                      color="error" 
                      sx={{ position: 'absolute', top: 8, right: 40 }} 
                    />
                  )}
                  {selectedFeatureColumns.includes(col.name) && (
                    <Chip 
                      label="Feature" 
                      size="small" 
                      color="primary" 
                      sx={{ position: 'absolute', top: 8, right: 40 }} 
                    />
                  )}
                  {col.is_recommended_target && (
                    <Tooltip title="Recommended as target">
                      <Chip 
                        label="⭐T" 
                        size="small" 
                        color="success" 
                        sx={{ position: 'absolute', top: 35, right: 8 }} 
                      />
                    </Tooltip>
                  )}
                  {col.is_recommended_feature && (
                    <Tooltip title="Recommended as feature">
                      <Chip 
                        label="⭐F" 
                        size="small" 
                        color="info" 
                        sx={{ position: 'absolute', top: 35, right: 8 }} 
                      />
                    </Tooltip>
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
                <InputLabel>Rows per page</InputLabel>
                <Select
                  value={previewRows}
                  label="Rows per page"
                  onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                >
                  <MenuItem value={10}>10 rows</MenuItem>
                  <MenuItem value={25}>25 rows</MenuItem>
                  <MenuItem value={50}>50 rows</MenuItem>
                  <MenuItem value={100}>100 rows</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ maxHeight: 500, border: '1px solid #e0e0e0' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 50 }}>
                    #
                  </TableCell>
                  {visibleColumns.map((col) => (
                    <TableCell 
                      key={col.name} 
                      sx={{ 
                        fontWeight: 'bold', 
                        backgroundColor: '#f5f5f5',
                        position: 'relative',
                        minWidth: 120
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
                        
                        {col.null_count > 0 && (
                          <Tooltip title={`${col.null_count} missing values`}>
                            <Warning color="warning" fontSize="small" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                      {(currentPage - 1) * previewRows + index + 1}
                    </TableCell>
                    {visibleColumns.map((col) => (
                      <TableCell key={col.name}>
                        {col.type === 'text' && typeof row[col.name] === 'string' && row[col.name].length > 50 ? (
                          <Tooltip title={row[col.name]}>
                            <Typography variant="body2" sx={{ cursor: 'help' }}>
                              {row[col.name].substring(0, 47)}...
                            </Typography>
                          </Tooltip>
                        ) : col.type === 'number' && row[col.name] !== null ? (
                          <Typography variant="body2" fontFamily="monospace">
                            {typeof row[col.name] === 'number' ? row[col.name].toFixed(2) : row[col.name]}
                          </Typography>
                        ) : col.name === selectedTargetColumn && row[col.name] !== null ? (
                          <Chip 
                            label={String(row[col.name])}
                            size="small"
                            color="secondary"
                          />
                        ) : row[col.name] === null ? (
                          <Typography variant="body2" color="text.disabled" fontStyle="italic">
                            null
                          </Typography>
                        ) : (
                          String(row[col.name])
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination 
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {data.length} of {(totalRows || data.length).toLocaleString()} rows • 
              {visibleColumns.length} of {columns.length} columns visible • 
              Page {currentPage} of {totalPages}
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