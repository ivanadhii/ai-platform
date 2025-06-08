import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'flat';
  };
  progress?: {
    current: number;
    max: number;
    label: string;
  };
  action?: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  trend,
  progress,
  action,
}) => {
  const getTrendIcon = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up':
        return <TrendingUp fontSize="small" />;
      case 'down':
        return <TrendingDown fontSize="small" />;
      default:
        return <TrendingFlat fontSize="small" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warning';
    return 'error';
  };

  const progressPercentage = progress ? (progress.current / progress.max) * 100 : 0;

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        }
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon && (
              <Avatar
                sx={{
                  bgcolor: `${color}.main`,
                  color: `${color}.contrastText`,
                  width: 40,
                  height: 40,
                }}
              >
                {icon}
              </Avatar>
            )}
            <Typography variant="h6" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
          </Box>
          {action}
        </Box>

        {/* Main Value */}
        <Typography 
          variant="h3" 
          fontWeight="bold" 
          color={`${color}.main`}
          sx={{ mb: 1 }}
        >
          {value}
        </Typography>

        {/* Subtitle */}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        )}

        {/* Trend */}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip
              icon={getTrendIcon(trend.direction)}
              label={`${trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}${trend.value}%`}
              size="small"
              color={getTrendColor(trend.direction) as any}
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              {trend.label}
            </Typography>
          </Box>
        )}

        {/* Progress */}
        {progress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {progress.label}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {progress.current} / {progress.max}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              color={getProgressColor(progressPercentage) as any}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(0,0,0,0.1)',
              }}
            />
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ mt: 0.5, display: 'block' }}
            >
              {progressPercentage.toFixed(1)}% used
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;