import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert,
  PlayArrow,
  Stop,
  Visibility,
  Edit,
  Delete,
  CloudUpload,
  Api,
  Analytics,
  CheckCircle,
  Error,
  Schedule,
  Build,
} from '@mui/icons-material';
import { Project, ProjectStatus, AIType } from '../../services/types';

interface ProjectCardProps {
  project: Project;
  onView?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onDeploy?: (project: Project) => void;
  onTrain?: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onView,
  onEdit,
  onDelete,
  onDeploy,
  onTrain,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'deployed':
        return 'info';
      case 'training':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'deployed':
        return <Api fontSize="small" />;
      case 'training':
        return <Build fontSize="small" />;
      case 'error':
        return <Error fontSize="small" />;
      default:
        return <Schedule fontSize="small" />;
    }
  };

  const getAITypeLabel = (aiType: AIType) => {
    switch (aiType) {
      case 'text_classification':
        return 'Text Classification';
      case 'sentiment_analysis':
        return 'Sentiment Analysis';
      case 'named_entity_recognition':
        return 'Named Entity Recognition';
      case 'document_classification':
        return 'Document Classification';
      case 'regression':
        return 'Regression';
      case 'clustering':
        return 'Clustering';
      default:
        return aiType;
    }
  };

  const getAITypeIcon = (aiType: AIType) => {
    // Simple icon mapping - you can expand this
    return <Analytics />;
  };

  const getProgressSteps = () => {
    const steps = [
      { key: 'dataset_uploaded', label: 'Dataset', completed: project.dataset_uploaded },
      { key: 'model_trained', label: 'Training', completed: project.model_trained },
      { key: 'model_deployed', label: 'Deployment', completed: project.model_deployed },
    ];

    const completedSteps = steps.filter(step => step.completed).length;
    return { steps, completedSteps, totalSteps: steps.length };
  };

  const { steps, completedSteps, totalSteps } = getProgressSteps();
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 40,
                height: 40,
              }}
            >
              {getAITypeIcon(project.ai_type)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" noWrap>
                {project.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getAITypeLabel(project.ai_type)}
              </Typography>
            </Box>
          </Box>
          
          <IconButton
            size="small"
            onClick={handleMenuClick}
            aria-label="more actions"
          >
            <MoreVert />
          </IconButton>
        </Box>

        {/* Status and Accuracy */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Chip
            icon={getStatusIcon(project.status)}
            label={project.status.replace('_', ' ').toUpperCase()}
            size="small"
            color={getStatusColor(project.status) as any}
            variant="outlined"
          />
          {project.accuracy && (
            <Typography variant="body2" fontWeight="medium" color="primary.main">
              {(project.accuracy * 100).toFixed(1)}% accuracy
            </Typography>
          )}
        </Box>

        {/* Description */}
        {project.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.description}
          </Typography>
        )}

        {/* Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {completedSteps}/{totalSteps} steps
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            color="primary"
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.1)',
            }}
          />
          
          {/* Progress Steps */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            {steps.map((step) => (
              <Box key={step.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: step.completed ? 'success.main' : 'grey.300',
                  }}
                />
                <Typography variant="caption" color={step.completed ? 'success.main' : 'text.secondary'}>
                  {step.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Timestamps */}
        <Typography variant="caption" color="text.secondary">
          Created: {new Date(project.created_at).toLocaleDateString()}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={() => onView?.(project)}
        >
          View
        </Button>
        
        {!project.model_trained && (
          <Button
            size="small"
            startIcon={<PlayArrow />}
            color="primary"
            onClick={() => onTrain?.(project)}
            disabled={!project.dataset_uploaded}
          >
            Train
          </Button>
        )}
        
        {project.model_trained && !project.model_deployed && (
          <Button
            size="small"
            startIcon={<CloudUpload />}
            color="secondary"
            onClick={() => onDeploy?.(project)}
          >
            Deploy
          </Button>
        )}
        
        {project.api_endpoint && (
          <Button
            size="small"
            startIcon={<Api />}
            color="info"
            href={project.api_endpoint}
            target="_blank"
          >
            API
          </Button>
        )}
      </CardActions>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { onEdit?.(project); handleMenuClose(); }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onDelete?.(project); handleMenuClose(); }}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default ProjectCard;