import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const ProjectsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Projects
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Projects page will be implemented in Phase 2.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ProjectsPage;