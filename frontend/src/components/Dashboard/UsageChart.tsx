import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface UsageDataPoint {
  date: string;
  api_calls: number;
  training_jobs: number;
  models_created: number;
}

interface UsageChartProps {
  data: UsageDataPoint[];
  title: string;
  type?: 'line' | 'area' | 'bar' | 'pie';
}

const UsageChart: React.FC<UsageChartProps> = ({ 
  data, 
  title, 
  type = 'line' 
}) => {
  const [chartType, setChartType] = React.useState(type);
  const [metric, setMetric] = React.useState<keyof Omit<UsageDataPoint, 'date'>>('api_calls');

  const handleChartTypeChange = (event: SelectChangeEvent) => {
    setChartType(event.target.value as 'line' | 'area' | 'bar' | 'pie');
  };

  const handleMetricChange = (event: SelectChangeEvent) => {
    setMetric(event.target.value as keyof Omit<UsageDataPoint, 'date'>);
  };

  const colors: Record<keyof Omit<UsageDataPoint, 'date'>, string> = {
    api_calls: '#1976d2',
    training_jobs: '#dc004e',
    models_created: '#2e7d32',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTooltipLabel = (label: string) => {
    return new Date(label).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getMetricLabel = (key: keyof Omit<UsageDataPoint, 'date'>) => {
    switch (key) {
      case 'api_calls':
        return 'API Calls';
      case 'training_jobs':
        return 'Training Jobs';
      case 'models_created':
        return 'Models Created';
      default:
        return key;
    }
  };

  // Prepare pie chart data
  const pieData = React.useMemo(() => {
    const totals = data.reduce((acc, item) => {
      acc.api_calls += item.api_calls;
      acc.training_jobs += item.training_jobs;
      acc.models_created += item.models_created;
      return acc;
    }, { api_calls: 0, training_jobs: 0, models_created: 0 });

    return [
      { name: 'API Calls', value: totals.api_calls, color: colors.api_calls },
      { name: 'Training Jobs', value: totals.training_jobs, color: colors.training_jobs },
      { name: 'Models Created', value: totals.models_created, color: colors.models_created },
    ].filter(item => item.value > 0);
  }, [data]);

  const renderChart = () => {
    const commonProps = {
      width: '100%',
      height: 300,
      data: data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={formatTooltipLabel}
                formatter={(value: any, name: string) => [value, getMetricLabel(name as keyof Omit<UsageDataPoint, 'date'>)]}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={colors[metric]}
                fill={colors[metric]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={formatTooltipLabel}
                formatter={(value: any, name: string) => [value, getMetricLabel(name as keyof Omit<UsageDataPoint, 'date'>)]}
              />
              <Bar 
                dataKey={metric} 
                fill={colors[metric]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={formatTooltipLabel}
                formatter={(value: any, name: string) => [value, getMetricLabel(name as keyof Omit<UsageDataPoint, 'date'>)]}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke={colors[metric]}
                strokeWidth={3}
                dot={{ fill: colors[metric], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: colors[metric] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Chart Type Selector */}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={chartType}
                onChange={handleChartTypeChange}
                displayEmpty
              >
                <MenuItem value="line">Line</MenuItem>
                <MenuItem value="area">Area</MenuItem>
                <MenuItem value="bar">Bar</MenuItem>
                <MenuItem value="pie">Pie</MenuItem>
              </Select>
            </FormControl>

            {/* Metric Selector (hidden for pie chart) */}
            {chartType !== 'pie' && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={metric}
                  onChange={handleMetricChange}
                  displayEmpty
                >
                  <MenuItem value="api_calls">API Calls</MenuItem>
                  <MenuItem value="training_jobs">Training Jobs</MenuItem>
                  <MenuItem value="models_created">Models Created</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </Box>

        {/* Chart */}
        {data.length > 0 ? (
          renderChart()
        ) : (
          <Box 
            sx={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'text.secondary'
            }}
          >
            <Typography variant="body1">
              No data available
            </Typography>
          </Box>
        )}

        {/* Summary Stats */}
        {data.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            {Object.entries(colors).map(([key, color]) => {
              const total = data.reduce((sum, item) => sum + (item[key as keyof Omit<UsageDataPoint, 'date'>] as number), 0);
              const avg = total / data.length;
              
              return (
                <Box key={key} sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color={color} fontWeight="bold">
                    {total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total {getMetricLabel(key as keyof Omit<UsageDataPoint, 'date'>)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg: {avg.toFixed(1)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageChart;