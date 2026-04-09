import React from 'react';
import { Fade, Box } from '@mui/material';
import { useLocation } from 'react-router-dom';

export default function AnimatedPage({ children }) {
  const location = useLocation();
  return (
    <Fade in key={location.pathname} timeout={300}>
      <Box sx={{ width: '100%', minHeight: 0 }}>{children}</Box>
    </Fade>
  );
}
