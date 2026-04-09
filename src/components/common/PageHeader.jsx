import React from 'react';
import { Stack, Typography, Box } from '@mui/material';

/**
 * Consistent page header: icon + title + right-aligned actions.
 */
export default function PageHeader({ icon: Icon, title, actions, subtitle, sx }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}
      sx={{ mb: 2.5, ...sx }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        {Icon && <Icon sx={{ fontSize: 26, color: 'primary.main', opacity: 0.85, flexShrink: 0 }} />}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{title}</Typography>
          {subtitle && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{subtitle}</Typography>}
        </Box>
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
