import React from 'react';
import { Dialog, useMediaQuery, useTheme } from '@mui/material';

/**
 * Dialog wrapper with M3 slide-up animation (from theme defaults)
 * and auto fullScreen on mobile.
 */
export default function AnimatedDialog({ children, maxWidth = 'sm', fullWidth = true, ...props }) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={mobile}
      {...props}
    >
      {children}
    </Dialog>
  );
}
