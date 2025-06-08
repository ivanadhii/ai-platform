// frontend/src/components/FileUpload/index.ts

export { default as FileUploader } from './FileUploader';
export { default as DataPreview } from './DataPreview';
export { default as ColumnMapper } from './ColumnMapper';

// Re-export types from individual components
// These types are defined within the components themselves
export type UploadedFile = {
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
};

export type FileUploadProgress = {
  loaded: number;
  total: number;
  percentage: number;
};

export type ColumnInfo = {
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
  isRecommendedTarget?: boolean;
  isRecommendedFeature?: boolean;
};

export type DataValidation = {
  isValid: boolean;
  rowCount: number;
  columnCount: number;
  hasHeaders: boolean;
  hasTargetColumn: boolean;
  issues: ValidationIssue[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
};

export type ValidationIssue = {
  type: 'error' | 'warning' | 'info';
  column?: string;
  message: string;
  severity: number;
};

export type ColumnConfig = {
  targetColumn: string | null;
  featureColumns: string[];
  excludedColumns: string[];
  dataTransformations: Record<string, string>;
};

export type TrainingConfiguration = {
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
};

export type ConfigValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
};