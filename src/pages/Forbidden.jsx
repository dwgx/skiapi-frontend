import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export default function Forbidden() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h1" sx={{ fontWeight: 800, color: 'error.main', mb: 2 }}>403</Typography>
      <Typography variant="h5" sx={{ mb: 3 }}>{t('无权访问此页面')}</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>{t('返回首页')}</Button>
    </Box>
  );
}
