// User related types
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  subscription_plan: 'free' | 'starter' | 'professional' | 'enterprise';
  api_calls_used: number;
  models_created: number;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Project related types
export interface Project {
  id: string;
  name: string;
  description?: string;
  ai_type: AIType;
  status: ProjectStatus;
  dataset_uploaded: boolean;
  model_trained: boolean;
  model_deployed: boolean;
  accuracy?: number;
  api_endpoint?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export type AIType = 
  | 'text_classification'
  | 'sentiment_analysis'
  | 'named_entity_recognition'
  | 'document_classification'
  | 'regression'
  | 'clustering';

export type ProjectStatus = 
  | 'created'
  | 'uploading'
  | 'processing'
  | 'training'
  | 'completed'
  | 'deployed'
  | 'error';

// Dataset related types
export interface Dataset {
  id: string;
  filename: string;
  file_size: number;
  rows_count: number;
  columns_count: number;
  columns: DatasetColumn[];
  preview_data: any[];
  upload_status: 'uploading' | 'processing' | 'ready' | 'error';
  uploaded_at: string;
  project_id: string;
}

export interface DatasetColumn {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  sample_values: any[];
  null_count: number;
  unique_count: number;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Training related types
export interface TrainingConfig {
  project_id: string;
  target_column: string;
  feature_columns: string[];
  test_size: number;
  algorithm?: string;
  hyperparameters?: Record<string, any>;
}

export interface TrainingJob {
  id: string;
  project_id: string;
  status: TrainingStatus;
  progress: number;
  current_step: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  confusion_matrix?: number[][];
  training_logs: TrainingLog[];
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export type TrainingStatus = 
  | 'queued'
  | 'preprocessing'
  | 'training'
  | 'evaluating'
  | 'completed'
  | 'failed';

export interface TrainingLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

// Model related types
export interface Model {
  id: string;
  name: string;
  project_id: string;
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  deployment_status: DeploymentStatus;
  api_endpoint?: string;
  api_calls_count: number;
  version: string;
  created_at: string;
  deployed_at?: string;
}

export type DeploymentStatus = 
  | 'not_deployed'
  | 'deploying'
  | 'deployed'
  | 'deployment_failed';

export interface PredictionRequest {
  data: Record<string, any>;
}

export interface PredictionResponse {
  prediction: any;
  confidence: number;
  model_version: string;
  processing_time_ms: number;
}

// Dashboard related types
export interface DashboardStats {
  total_projects: number;
  active_models: number;
  api_calls_this_month: number;
  api_calls_limit: number;
  models_limit: number;
  subscription_plan: string;
  recent_projects: Project[];
  usage_chart_data: UsageDataPoint[];
  model_performance: ModelPerformance[];
}

export interface UsageDataPoint {
  date: string;
  api_calls: number;
  training_jobs: number;
  models_created: number;
}

export interface ModelPerformance {
  model_name: string;
  accuracy: number;
  api_calls: number;
  avg_response_time: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface ApiError {
  detail: string;
  status_code: number;
}

// Subscription related types
export interface SubscriptionPlan {
  name: string;
  models_limit: number;
  api_calls_limit: number;
  features: string[];
  price_monthly: number;
  price_yearly: number;
}

export interface UsageQuota {
  models_used: number;
  models_limit: number;
  api_calls_used: number;
  api_calls_limit: number;
  storage_used: number;
  storage_limit: number;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Component prop types
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Form validation types
export interface FormErrors {
  [key: string]: string;
}

export interface FormState {
  values: Record<string, any>;
  errors: FormErrors;
  isSubmitting: boolean;
  isValid: boolean;
}