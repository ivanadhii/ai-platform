import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Service Class
export class ApiService {
  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================
  
  static async register(userData: {
    email: string;
    password: string;
    full_name: string;
  }) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  }

  static async login(credentials: { username: string; password: string }) {
    // FastAPI-Users expects form data for login
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await apiClient.post('/auth/jwt/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  }

  static async logout() {
    try {
      await apiClient.post('/auth/jwt/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  }

  static async getCurrentUser() {
    const response = await apiClient.get('/users/me');
    return response.data;
  }

  static async updateUser(userData: Partial<{
    full_name: string;
    subscription_plan: string;
  }>) {
    const response = await apiClient.patch('/users/me', userData);
    return response.data;
  }

  // ==========================================
  // PROJECT MANAGEMENT ENDPOINTS
  // ==========================================
  
  static async getProjects() {
    const response = await apiClient.get('/projects');
    return response.data;
  }

  static async createProject(projectData: {
    name: string;
    description?: string;
    ai_type: string;
  }) {
    const response = await apiClient.post('/projects', projectData);
    return response.data;
  }

  static async getProject(projectId: string) {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data;
  }

  static async deleteProject(projectId: string) {
    const response = await apiClient.delete(`/projects/${projectId}`);
    return response.data;
  }

  // ==========================================
  // FILE UPLOAD ENDPOINTS
  // ==========================================
  
  static async uploadFile(file: File, projectId: string, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/upload/file/${projectId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  }

  static async getDatasetPreview(
    datasetId: string, 
    rows: number = 10, 
    page: number = 1
  ) {
    const response = await apiClient.get(`/upload/dataset/${datasetId}/preview`, {
      params: { rows, page }
    });
    return response.data;
  }

  static async getDatasetColumns(datasetId: string) {
    const response = await apiClient.get(`/upload/dataset/${datasetId}/columns`);
    return response.data;
  }

  static async deleteDataset(datasetId: string) {
    const response = await apiClient.delete(`/upload/dataset/${datasetId}`);
    return response.data;
  }

  static async validateDatasetForTraining(
    datasetId: string,
    targetColumn: string,
    featureColumns: string[]
  ) {
    const formData = new FormData();
    formData.append('target_column', targetColumn);
    featureColumns.forEach(col => {
      formData.append('feature_columns', col);
    });

    const response = await apiClient.post(`/upload/dataset/${datasetId}/validate`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  }

  // ==========================================
  // 🚀 NEW: ML TRAINING ENDPOINTS (Phase 5)
  // ==========================================
  
  /**
   * Start ML model training with configuration
   */
  static async startTraining(config: {
    project_id: string;
    dataset_id: string;
    target_column: string;
    feature_columns: string[];
    algorithm?: string;
    test_size?: number;
    preprocessing_config?: any;
  }) {
    const response = await apiClient.post('/training/start', config);
    return response.data;
  }

  /**
   * Get real-time training job status
   */
  static async getTrainingStatus(jobId: string) {
    const response = await apiClient.get(`/training/${jobId}/status`);
    return response.data;
  }

  /**
   * Get detailed training results after completion
   */
  static async getTrainingResults(jobId: string) {
    const response = await apiClient.get(`/training/${jobId}/results`);
    return response.data;
  }

  /**
   * Deploy trained model as API endpoint
   */
  static async deployModel(jobId: string, modelName: string) {
    const response = await apiClient.post(`/training/${jobId}/deploy`, {
      model_name: modelName
    });
    return response.data;
  }

  /**
   * Check Celery worker status
   */
  static async getWorkerStatus() {
    const response = await apiClient.get('/training/worker-status');
    return response.data;
  }

  // ==========================================
  // 🎯 NEW: MODEL INFERENCE ENDPOINTS (Phase 5)
  // ==========================================
  
  /**
   * Make prediction using deployed model
   * This calls the endpoint created by app.include_router(inference_router)
   */
  static async predictWithModel(modelId: string, text: string) {
    const response = await apiClient.post(`/models/${modelId}/predict`, {
      text: text
    });
    return response.data;
  }

  /**
   * Batch predictions (multiple texts at once)
   */
  static async batchPredict(modelId: string, texts: string[]) {
    const response = await apiClient.post(`/models/${modelId}/predict/batch`, {
      texts: texts
    });
    return response.data;
  }

  /**
   * Get model information and performance metrics
   */
  static async getModelInfo(modelId: string) {
    const response = await apiClient.get(`/models/${modelId}/info`);
    return response.data;
  }

  /**
   * Get model usage analytics
   */
  static async getModelAnalytics(modelId: string, period: 'day' | 'week' | 'month' = 'week') {
    const response = await apiClient.get(`/models/${modelId}/analytics`, {
      params: { period }
    });
    return response.data;
  }

  // ==========================================
  // MODEL MANAGEMENT ENDPOINTS
  // ==========================================
  
  static async getModels(projectId?: string) {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get('/models', { params });
    return response.data;
  }

  static async getModel(modelId: string) {
    const response = await apiClient.get(`/models/${modelId}`);
    return response.data;
  }

  static async undeployModel(modelId: string) {
    const response = await apiClient.post(`/models/${modelId}/undeploy`);
    return response.data;
  }

  static async deleteModel(modelId: string) {
    const response = await apiClient.delete(`/models/${modelId}`);
    return response.data;
  }

  // ==========================================
  // ANALYTICS & DASHBOARD ENDPOINTS
  // ==========================================
  
  static async getDashboardStats() {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  }

  static async getUsageAnalytics(period: 'week' | 'month' | 'year' = 'month') {
    const response = await apiClient.get('/analytics/usage', {
      params: { period }
    });
    return response.data;
  }

  static async getModelPerformance(modelId: string) {
    const response = await apiClient.get(`/analytics/models/${modelId}/performance`);
    return response.data;
  }

  // ==========================================
  // UTILITY ENDPOINTS
  // ==========================================
  
  static async healthCheck() {
    const response = await apiClient.get('/health');
    return response.data;
  }

  static async getServerInfo() {
    const response = await apiClient.get('/');
    return response.data;
  }

  static async testDatabaseConnection() {
    const response = await apiClient.get('/test-db');
    return response.data;
  }

  // ==========================================
  // 🧪 TESTING & DEBUGGING HELPERS
  // ==========================================
  
  /**
   * Test model prediction with sample data
   */
  static async testModelPrediction(modelId: string) {
    const sampleTexts = [
      "Saya ingin mengurus SBU konstruksi",
      "Kenapa NIB saya belum keluar?",
      "Website OSS error terus"
    ];
    
    const predictions = await Promise.all(
      sampleTexts.map(text => this.predictWithModel(modelId, text))
    );
    
    return {
      sample_texts: sampleTexts,
      predictions: predictions
    };
  }

  /**
   * Check if all services are healthy
   */
  static async checkSystemHealth() {
    try {
      const [health, db, worker] = await Promise.all([
        this.healthCheck(),
        this.testDatabaseConnection(),
        this.getWorkerStatus()
      ]);

      return {
        api: health,
        database: db,
        worker: worker,
        overall_status: "healthy"
      };
    } catch (error) {
      return {
        overall_status: "unhealthy",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default ApiService;

// ===== UTILITY FUNCTIONS =====

export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    if (status === 400) {
      return data.detail || 'Invalid request. Please check your input.';
    } else if (status === 401) {
      return 'Authentication failed. Please log in again.';
    } else if (status === 403) {
      return 'Access denied. You do not have permission for this action.';
    } else if (status === 404) {
      return 'Resource not found.';
    } else if (status === 413) {
      return 'File too large. Please upload a smaller file.';
    } else if (status === 422) {
      return data.detail || 'Invalid data format.';
    } else if (status >= 500) {
      return 'Server error. Please try again later.';
    }
    
    return data.detail || data.message || `Error ${status}: ${error.response.statusText}`;
  } else if (error.request) {
    // Request made but no response received
    return 'Network error. Please check your connection and try again.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred.';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const mimeType = file.type.toLowerCase();
  
  return allowedTypes.some(type => 
    mimeType === type || 
    file.name.toLowerCase().endsWith(type.replace('application/', '.').replace('text/', '.'))
  );
};