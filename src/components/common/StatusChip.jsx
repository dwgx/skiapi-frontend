import React from 'react';
import { Chip } from '@mui/material';
import { CheckCircleOutline, HighlightOff, PauseCircleOutline } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const STATUS_PRESETS = {
  enabled: { labelKey: '启用', color: 'success', icon: <CheckCircleOutline sx={{ fontSize: '16px !important' }} /> },
  disabled: { labelKey: '禁用', color: 'error', icon: <HighlightOff sx={{ fontSize: '16px !important' }} /> },
  pending: { labelKey: '待处理', color: 'warning', icon: <PauseCircleOutline sx={{ fontSize: '16px !important' }} /> },
  active: { labelKey: '正常', color: 'success', icon: <CheckCircleOutline sx={{ fontSize: '16px !important' }} /> },
  banned: { labelKey: '封禁', color: 'error', icon: <HighlightOff sx={{ fontSize: '16px !important' }} /> },
};

/**
 * Consistent status chip with icon across all pages.
 * Usage: <StatusChip status="enabled" /> or <StatusChip label={t('自定义')} color="info" />
 */
export default function StatusChip({ status, label, color, icon, onClick, size = 'small', ...props }) {
  const { t } = useTranslation();
  const preset = STATUS_PRESETS[status];
  return (
    <Chip
      label={label || (preset?.labelKey ? t(preset.labelKey) : status)}
      color={color || preset?.color || 'default'}
      icon={icon || preset?.icon}
      size={size}
      onClick={onClick}
      sx={onClick ? { cursor: 'pointer' } : undefined}
      {...props}
    />
  );
}
