import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Description,
  CheckCircle,
  ErrorOutline,
  InsertDriveFile,
  TableChart,
} from '@mui/icons-material';

// Types
interface FileUploadProps {
  projectId?: string;
  onFileUploaded?: (file: UploadedFile) => void;
  onFileRemoved?: (fileId: string) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  maxFiles?: number;
}

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  preview?: {
    rows: number;
    columns: number;
    headers: string[];
  };
}

// Helper functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.includes('csv')) return <TableChart color="success" />;
  if (fileType.includes('excel') || fileType.includes('sheet')) return <InsertDriveFile color="primary" />;
  return <Description color="action" />;
};

const validateFile = (file: File, maxSize: number, acceptedTypes: string[]): string | null => {
  // Size validation
  if (file.size > maxSize * 1024 * 1024) {
    return `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${maxSize}MB)`;
  }

  // Type validation
  const isValidType = acceptedTypes.some(type => 
    file.type === type || file.name.toLowerCase().endsWith(type.replace('application/', '.').replace('text/', '.'))
  );
  
  if (!isValidType) {
    return `File type not supported. Accepted types: ${acceptedTypes.map(t => t.split('/').pop()).join(', ')}`;
  }

  return null;
};

// Helper function for safe error handling
const getErrorMessage = (error: unknown): string => {
  if (error instanceof globalThis.Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

const FileUploader: React.FC<FileUploadProps> = ({
  projectId,
  onFileUploaded,
  onFileRemoved,
  maxFileSize = 50, // 50MB default
  acceptedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json'
  ],
  maxFiles = 5,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  // File selection handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  // Process selected files
  const handleFiles = useCallback(async (files: File[]) => {
    if (uploadedFiles.length + files.length > maxFiles) {
      setGlobalError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);
    setGlobalError(null);

    for (const file of files) {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Validate file
      const validationError = validateFile(file, maxFileSize, acceptedTypes);
      
      if (validationError) {
        const errorFile: UploadedFile = {
          id: fileId,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'error',
          progress: 0,
          error: validationError,
        };
        
        setUploadedFiles(prev => [...prev, errorFile]);
        continue;
      }

      // Create initial file entry
      const newFile: UploadedFile = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
      };

      setUploadedFiles(prev => [...prev, newFile]);

      try {
        // Simulate file processing and upload
        await processFile(file, fileId);
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        updateFileStatus(fileId, 'error', 0, errorMessage);
      }
    }

    setIsUploading(false);
  }, [uploadedFiles.length, maxFiles, maxFileSize, acceptedTypes]);

  // Process individual file (mock implementation)
  const processFile = async (file: File, fileId: string): Promise<void> => {
    try {
      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        updateFileProgress(fileId, progress);
      }

      // Parse file preview (mock)
      const preview = await parseFilePreview(file);
      
      updateFileStatus(fileId, 'completed', 100);
      updateFilePreview(fileId, preview);

      // Notify parent component
      const uploadedFile = uploadedFiles.find(f => f.id === fileId);
      if (uploadedFile && onFileUploaded) {
        onFileUploaded({...uploadedFile, status: 'completed', progress: 100, preview});
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      updateFileStatus(fileId, 'error', 0, errorMessage);
      throw err;
    }
  };

  // Mock file parsing for preview
  const parseFilePreview = async (file: File): Promise<UploadedFile['preview']> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          
          if (file.name.endsWith('.csv')) {
            const lines = content.split('\n').filter(line => line.trim());
            const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
            
            resolve({
              rows: Math.max(0, lines.length - 1),
              columns: headers.length,
              headers: headers.slice(0, 10), // Limit to first 10 columns for display
            });
          } else {
            // Mock for Excel files
            resolve({
              rows: Math.floor(Math.random() * 1000) + 100,
              columns: Math.floor(Math.random() * 20) + 5,
              headers: ['Column A', 'Column B', 'Column C', 'Column D', 'Column E'],
            });
          }
        } catch (parseErr: unknown) {
          resolve({
            rows: 0,
            columns: 0,
            headers: [],
          });
        }
      };
      
      reader.onerror = () => {
        reject(new globalThis.Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  // Update file progress
  const updateFileProgress = (fileId: string, progress: number) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, progress } : file
      )
    );
  };

  // Update file status
  const updateFileStatus = (fileId: string, status: UploadedFile['status'], progress?: number, error?: string) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, status, ...(progress !== undefined && { progress }), ...(error && { error }) }
          : file
      )
    );
  };

  // Update file preview
  const updateFilePreview = (fileId: string, preview: UploadedFile['preview']) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, preview } : file
      )
    );
  };

  // Remove file
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    if (onFileRemoved) {
      onFileRemoved(fileId);
    }
  };

  // Get status chip color
  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'error': return 'error';
      case 'uploading': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Upload Area */}
      <Paper
        sx={{
          p: 4,
          border: isDragOver ? '2px dashed #1976d2' : '2px dashed #e0e0e0',
          backgroundColor: isDragOver ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.02)',
          },
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Drag & drop your dataset files here
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          or click to browse files
        </Typography>

        <Button variant="outlined" component="span" disabled={isUploading}>
          Choose Files
        </Button>

        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Supported formats: CSV, Excel (.xlsx, .xls), JSON
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            Maximum file size: {maxFileSize}MB • Maximum files: {maxFiles}
          </Typography>
        </Box>
      </Paper>

      {/* Global Error Display */}
      {globalError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Paper sx={{ mt: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Uploaded Files ({uploadedFiles.length}/{maxFiles})
            </Typography>
          </Box>
          
          <Divider />
          
          <List>
            {uploadedFiles.map((file, index) => (
              <React.Fragment key={file.id}>
                <ListItem>
                  <ListItemIcon>
                    {getFileIcon(file.type)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" component="span">
                          {file.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={file.status}
                          color={getStatusColor(file.status) as any}
                          icon={
                            file.status === 'completed' ? <CheckCircle fontSize="small" /> :
                            file.status === 'error' ? <ErrorOutline fontSize="small" /> : undefined
                          }
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.size)}
                          {file.preview && (
                            <> • {file.preview.rows} rows × {file.preview.columns} columns</>
                          )}
                        </Typography>
                        
                        {file.status === 'uploading' && (
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={file.progress}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {file.progress}% uploaded
                            </Typography>
                          </Box>
                        )}
                        
                        {file.error && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {file.error}
                          </Alert>
                        )}
                        
                        {file.preview && file.status === 'completed' && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="success.main">
                              ✓ Preview available • Headers: {file.preview.headers.slice(0, 3).join(', ')}
                              {file.preview.headers.length > 3 && '...'}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => removeFile(file.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {index < uploadedFiles.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Upload Summary */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {uploadedFiles.filter(f => f.status === 'completed').length} completed • 
            {uploadedFiles.filter(f => f.status === 'uploading').length} uploading • 
            {uploadedFiles.filter(f => f.status === 'error').length} errors
          </Typography>
          
          {uploadedFiles.some(f => f.status === 'completed') && (
            <Button 
              variant="contained" 
              size="small"
              onClick={() => {
                // Notify parent that user wants to continue
                const completedFile = uploadedFiles.find(f => f.status === 'completed');
                if (completedFile && onFileUploaded) {
                  onFileUploaded(completedFile);
                }
              }}
            >
              Continue to Data Preview
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default FileUploader;