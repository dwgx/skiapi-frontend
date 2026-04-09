import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h1" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2 }}>404</Typography>
      <Typography variant="h5" sx={{ mb: 3 }}>{t('页面未找到')}</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>{t('返回首页')}</Button>
    </Box>
  );
}
