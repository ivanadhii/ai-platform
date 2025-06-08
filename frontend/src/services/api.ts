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
  // Authentication endpoints
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

  // Project management endpoints (to be implemented in backend)
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

  // File upload endpoints (to be implemented)
  static async uploadFile(file: File, projectId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);

    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Model training endpoints (to be implemented)
  static async startTraining(trainingConfig: {
    project_id: string;
    target_column: string;
    test_size: number;
    algorithm?: string;
  }) {
    const response = await apiClient.post('/train', trainingConfig);
    return response.data;
  }

  static async getTrainingStatus(jobId: string) {
    const response = await apiClient.get(`/training/${jobId}/status`);
    return response.data;
  }

  static async getTrainingResults(jobId: string) {
    const response = await apiClient.get(`/training/${jobId}/results`);
    return response.data;
  }

  // Model deployment endpoints (to be implemented)
  static async deployModel(modelId: string) {
    const response = await apiClient.post(`/models/${modelId}/deploy`);
    return response.data;
  }

  static async getModelEndpoint(modelId: string) {
    const response = await apiClient.get(`/models/${modelId}/endpoint`);
    return response.data;
  }

  static async predictWithModel(modelId: string, inputData: any) {
    const response = await apiClient.post(`/models/${modelId}/predict`, {
      data: inputData,
    });
    return response.data;
  }

  // Dashboard statistics
  static async getDashboardStats() {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  }

  // Health check
  static async healthCheck() {
    const response = await apiClient.get('/health');
    return response.data;
  }
}

export default ApiService;