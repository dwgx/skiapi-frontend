import React from 'react';
import { Box, Typography, Button, Fade } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * M3 empty state component with icon + title + description + optional action.
 */
export default function EmptyState({
  icon: Icon = InboxOutlined,
  title,
  description,
  actionLabel,
  onAction,
  sx,
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t('暂无数据');
  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          py: 8, px: 3, textAlign: 'center', ...sx,
        }}
      >
        <Box
          sx={{
            width: 80, height: 80, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'action.hover', mb: 2.5,
          }}
        >
          <Icon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.6 }} />
        </Box>
        <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 500, color: 'text.primary' }}>
          {resolvedTitle}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ mb: 2, maxWidth: 320, color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
        {actionLabel && onAction && (
          <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
            {actionLabel}
          </Button>
        )}
      </Box>
    </Fade>
  );
}
