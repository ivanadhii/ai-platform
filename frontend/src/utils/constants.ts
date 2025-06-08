// API Endpoints
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  PROJECTS: '/projects',
  UPLOAD: '/upload',
  TRAIN: '/train',
  MODELS: '/models',
  DASHBOARD: '/dashboard',
} as const;

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    models_limit: 1,
    api_calls_limit: 1000,
    features: ['1 AI Model', '1,000 API calls/month', 'Basic Support'],
    price_monthly: 0,
    price_yearly: 0,
  },
  STARTER: {
    name: 'Starter',
    models_limit: 5,
    api_calls_limit: 50000,
    features: ['5 AI Models', '50,000 API calls/month', 'Email Support', 'Data Export'],
    price_monthly: 29,
    price_yearly: 290,
  },
  PROFESSIONAL: {
    name: 'Professional',
    models_limit: 25,
    api_calls_limit: 500000,
    features: ['25 AI Models', '500,000 API calls/month', 'Priority Support', 'Advanced Analytics', 'Custom Preprocessing'],
    price_monthly: 149,
    price_yearly: 1490,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    models_limit: 999,
    api_calls_limit: 9999999,
    features: ['Unlimited Models', 'Unlimited API calls', 'Dedicated Support', 'On-premise Deployment', 'Custom Integration'],
    price_monthly: 499,
    price_yearly: 4990,
  },
} as const;

// AI Types
export const AI_TYPES = {
  TEXT_CLASSIFICATION: {
    id: 'text_classification',
    name: 'Text Classification',
    description: 'Categorize text into predefined classes',
    example: 'Email spam detection, sentiment analysis',
    icon: '📝',
  },
  SENTIMENT_ANALYSIS: {
    id: 'sentiment_analysis',
    name: 'Sentiment Analysis',
    description: 'Analyze emotional tone in text',
    example: 'Product reviews, social media monitoring',
    icon: '😊',
  },
  NAMED_ENTITY_RECOGNITION: {
    id: 'named_entity_recognition',
    name: 'Named Entity Recognition',
    description: 'Extract entities like names, dates, locations',
    example: 'Document processing, information extraction',
    icon: '🏷️',
  },
  DOCUMENT_CLASSIFICATION: {
    id: 'document_classification',
    name: 'Document Classification',
    description: 'Classify documents by type or category',
    example: 'Legal documents, medical records',
    icon: '📄',
  },
  REGRESSION: {
    id: 'regression',
    name: 'Regression',
    description: 'Predict continuous numerical values',
    example: 'Price prediction, demand forecasting',
    icon: '📈',
  },
  CLUSTERING: {
    id: 'clustering',
    name: 'Clustering',
    description: 'Group similar data points together',
    example: 'Customer segmentation, anomaly detection',
    icon: '🎯',
  },
} as const;

// Project Status
export const PROJECT_STATUS = {
  CREATED: {
    id: 'created',
    name: 'Created',
    description: 'Project created, waiting for dataset',
    color: 'default',
    icon: '📋',
  },
  UPLOADING: {
    id: 'uploading',
    name: 'Uploading',
    description: 'Dataset is being uploaded',
    color: 'info',
    icon: '⬆️',
  },
  PROCESSING: {
    id: 'processing',
    name: 'Processing',
    description: 'Dataset is being processed',
    color: 'warning',
    icon: '⚙️',
  },
  TRAINING: {
    id: 'training',
    name: 'Training',
    description: 'Model is being trained',
    color: 'warning',
    icon: '🔄',
  },
  COMPLETED: {
    id: 'completed',
    name: 'Completed',
    description: 'Training completed successfully',
    color: 'success',
    icon: '✅',
  },
  DEPLOYED: {
    id: 'deployed',
    name: 'Deployed',
    description: 'Model is deployed and accessible via API',
    color: 'info',
    icon: '🚀',
  },
  ERROR: {
    id: 'error',
    name: 'Error',
    description: 'An error occurred during processing',
    color: 'error',
    icon: '❌',
  },
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ACCEPTED_TYPES: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
  ],
  ACCEPTED_EXTENSIONS: ['.csv', '.xlsx', '.xls', '.json'],
} as const;

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  SUCCESS: '#2e7d32',
  WARNING: '#ed6c02',
  ERROR: '#d32f2f',
  INFO: '#0288d1',
  GREY: '#757575',
} as const;

// Application Settings
export const APP_CONFIG = {
  NAME: 'AI Platform',
  VERSION: '1.0.0',
  DESCRIPTION: 'No-code machine learning platform',
  AUTHOR: 'AI Platform Team',
  SUPPORT_EMAIL: 'support@aiplatform.com',
  DOCS_URL: 'https://docs.aiplatform.com',
  GITHUB_URL: 'https://github.com/aiplatform',
} as const;

// Validation Rules
export const VALIDATION = {
  PROJECT_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9\s\-_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  },
  EMAIL: {
    PATTERN: /^\S+@\S+\.\S+$/,
  },
} as const;

// Default Values
export const DEFAULTS = {
  PAGINATION: {
    PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
  },
  TRAINING: {
    TEST_SIZE: 0.2,
    RANDOM_STATE: 42,
    MAX_ITERATIONS: 1000,
  },
  API: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
  },
} as const;

// Indonesian Language Specific
export const INDONESIAN_FEATURES = {
  ABBREVIATIONS_COUNT: 107,
  OSS_TERMS: ['SBU', 'KBLI', 'NPWP', 'SKK', 'NIB', 'SIUP'],
  SAMPLE_CLASSIFICATIONS: ['layanan', 'pengaduan'],
} as const;