import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, CircularProgress, Box,
} from '@mui/material';
import { WarningAmberRounded } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * M3 animated confirmation dialog. Replaces native confirm().
 */
export default function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel, cancelLabel, confirmColor = 'error', loading = false,
  icon: Icon = WarningAmberRounded,
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t('确认操作');
  const resolvedMessage = message || t('确定要执行此操作？');
  const resolvedConfirm = confirmLabel || t('确认');
  const resolvedCancel = cancelLabel || t('取消');

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: `${confirmColor}.main`, opacity: 0.1,
          }}
        >
          <Icon color={confirmColor} />
        </Box>
        {resolvedTitle}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{resolvedMessage}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>{resolvedCancel}</Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : resolvedConfirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
