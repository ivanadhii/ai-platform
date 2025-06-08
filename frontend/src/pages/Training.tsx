import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const TrainingPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Model Training
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Training interface will be implemented in Phase 2.
        </Typography>
      </Paper>
    </Container>
  );
};

export default TrainingPage;