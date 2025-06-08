import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Add,
  SmartToy,
  Api,
  DataUsage,
  TrendingUp,
  Speed,
  Cloud,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import StatsCard from './StatsCard';
import ProjectCard from './ProjectCard';
import UsageChart from './UsageChart';
import { Project, AIType, UsageDataPoint } from '../../services/types';

// Mock data - Replace with real API calls later
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'OSS Classification',
    description: 'Indonesian government OSS text classification system',
    ai_type: 'text_classification',
    status: 'deployed',
    dataset_uploaded: true,
    model_trained: true,
    model_deployed: true,
    accuracy: 0.833,
    api_endpoint: 'https://api.example.com/v1/models/oss-classifier/predict',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-07T15:30:00Z',
    user_id: 'user-1',
  },
  {
    id: '2',
    name: 'Sentiment Analysis',
    description: 'Product review sentiment analysis for e-commerce',
    ai_type: 'sentiment_analysis',
    status: 'training',
    dataset_uploaded: true,
    model_trained: false,
    model_deployed: false,
    created_at: '2025-06-05T14:20:00Z',
    updated_at: '2025-06-07T16:45:00Z',
    user_id: 'user-1',
  },
  {
    id: '3',
    name: 'Document Classifier',
    description: 'Legal document classification system',
    ai_type: 'document_classification',
    status: 'completed',
    dataset_uploaded: true,
    model_trained: true,
    model_deployed: false,
    accuracy: 0.789,
    created_at: '2025-06-03T09:15:00Z',
    updated_at: '2025-06-06T11:20:00Z',
    user_id: 'user-1',
  },
];

const mockUsageData: UsageDataPoint[] = [
  { date: '2025-06-01', api_calls: 450, training_jobs: 2, models_created: 1 },
  { date: '2025-06-02', api_calls: 620, training_jobs: 1, models_created: 0 },
  { date: '2025-06-03', api_calls: 890, training_jobs: 3, models_created: 2 },
  { date: '2025-06-04', api_calls: 750, training_jobs: 0, models_created: 0 },
  { date: '2025-06-05', api_calls: 1200, training_jobs: 4, models_created: 1 },
  { date: '2025-06-06', api_calls: 980, training_jobs: 1, models_created: 0 },
  { date: '2025-06-07', api_calls: 1450, training_jobs: 2, models_created: 1 },
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    ai_type: 'text_classification' as AIType,
  });

  // Load data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // TODO: Replace with real API calls
        setProjects(mockProjects);
        setUsageData(mockUsageData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Calculate subscription limits based on plan
  const getSubscriptionLimits = () => {
    switch (user?.subscription_plan) {
      case 'free':
        return { models: 1, apiCalls: 1000 };
      case 'starter':
        return { models: 5, apiCalls: 50000 };
      case 'professional':
        return { models: 25, apiCalls: 500000 };
      case 'enterprise':
        return { models: 999, apiCalls: 9999999 };
      default:
        return { models: 1, apiCalls: 1000 };
    }
  };

  const limits = getSubscriptionLimits();

  // Calculate statistics
  const stats = {
    totalProjects: projects.length,
    activeModels: projects.filter(p => p.model_deployed).length,
    apiCallsThisMonth: usageData.reduce((sum, day) => sum + day.api_calls, 0),
    avgAccuracy: projects.filter(p => p.accuracy).reduce((sum, p) => sum + (p.accuracy || 0), 0) / projects.filter(p => p.accuracy).length || 0,
  };

  // Handle project actions
  const handleCreateProject = async () => {
    try {
      // TODO: Replace with real API call
      const newProjectData: Project = {
        id: Date.now().toString(),
        name: newProject.name,
        description: newProject.description,
        ai_type: newProject.ai_type,
        status: 'created',
        dataset_uploaded: false,
        model_trained: false,
        model_deployed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id || '',
      };

      setProjects(prev => [...prev, newProjectData]);
      setCreateDialogOpen(false);
      setNewProject({ name: '', description: '', ai_type: 'text_classification' });
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleProjectView = (project: Project) => {
    // TODO: Navigate to project detail page
    console.log('View project:', project.id);
  };

  const handleProjectTrain = (project: Project) => {
    // TODO: Navigate to training page
    console.log('Train project:', project.id);
  };

  const handleProjectDeploy = (project: Project) => {
    // TODO: Deploy model
    console.log('Deploy project:', project.id);
  };

  const handleProjectEdit = (project: Project) => {
    // TODO: Open edit dialog
    console.log('Edit project:', project.id);
  };

  const handleProjectDelete = (project: Project) => {
    // TODO: Show confirmation dialog
    setProjects(prev => prev.filter(p => p.id !== project.id));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Welcome back, {user?.full_name?.split(' ')[0]} 👋
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Here's what's happening with your AI projects today.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={160} />
          ) : (
            <StatsCard
              title="Total Projects"
              value={stats.totalProjects}
              subtitle="All time"
              icon={<SmartToy />}
              color="primary"
              progress={{
                current: stats.totalProjects,
                max: limits.models,
                label: "Project Limit"
              }}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={160} />
          ) : (
            <StatsCard
              title="Active Models"
              value={stats.activeModels}
              subtitle="Deployed & running"
              icon={<Api />}
              color="success"
              trend={{
                value: 25,
                label: "vs last month",
                direction: "up"
              }}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={160} />
          ) : (
            <StatsCard
              title="API Calls"
              value={stats.apiCallsThisMonth.toLocaleString()}
              subtitle="This month"
              icon={<DataUsage />}
              color="info"
              progress={{
                current: stats.apiCallsThisMonth,
                max: limits.apiCalls,
                label: "Monthly Limit"
              }}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton variant="rectangular" height={160} />
          ) : (
            <StatsCard
              title="Avg Accuracy"
              value={`${(stats.avgAccuracy * 100).toFixed(1)}%`}
              subtitle="Across all models"
              icon={<TrendingUp />}
              color="warning"
              trend={{
                value: 12,
                label: "vs last deploy",
                direction: "up"
              }}
            />
          )}
        </Grid>
      </Grid>

      {/* Usage Chart */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          {loading ? (
            <Skeleton variant="rectangular" height={400} />
          ) : (
            <UsageChart
              data={usageData}
              title="Usage Analytics"
              type="line"
            />
          )}
        </Grid>
      </Grid>

      {/* Projects Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">
            Recent Projects
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={stats.totalProjects >= limits.models}
          >
            New Project
          </Button>
        </Box>

        {stats.totalProjects >= limits.models && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You've reached your project limit ({limits.models} projects). 
            Upgrade your plan to create more projects.
          </Alert>
        )}

        <Grid container spacing={3}>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Skeleton variant="rectangular" height={280} />
              </Grid>
            ))
          ) : projects.length > 0 ? (
            projects.map((project) => (
              <Grid item xs={12} md={6} lg={4} key={project.id}>
                <ProjectCard
                  project={project}
                  onView={handleProjectView}
                  onEdit={handleProjectEdit}
                  onDelete={handleProjectDelete}
                  onDeploy={handleProjectDeploy}
                  onTrain={handleProjectTrain}
                />
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  color: 'text.secondary',
                }}
              >
                <Cloud sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  No projects yet
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Create your first AI model to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Project
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add project"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
        onClick={() => setCreateDialogOpen(true)}
        disabled={stats.totalProjects >= limits.models}
      >
        <Add />
      </Fab>

      {/* Create Project Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New AI Project</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Project Name"
              value={newProject.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Customer Sentiment Analysis"
            />
            
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newProject.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this AI model will do..."
            />
            
            <FormControl fullWidth>
              <InputLabel>AI Type</InputLabel>
              <Select
                value={newProject.ai_type}
                label="AI Type"
                onChange={(e) => setNewProject(prev => ({ ...prev, ai_type: e.target.value as AIType }))}
              >
                <MenuItem value="text_classification">Text Classification</MenuItem>
                <MenuItem value="sentiment_analysis">Sentiment Analysis</MenuItem>
                <MenuItem value="named_entity_recognition">Named Entity Recognition</MenuItem>
                <MenuItem value="document_classification">Document Classification</MenuItem>
                <MenuItem value="regression">Regression</MenuItem>
                <MenuItem value="clustering">Clustering</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject}
            variant="contained"
            disabled={!newProject.name.trim()}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;