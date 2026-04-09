import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { API } from '../api';
import { sanitizeHtml } from '../utils/security';
import { useTranslation } from 'react-i18next';
export default function UserAgreement() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  useEffect(() => {
    API.get('/api/user-agreement').then(r => { if (r.data.success) setContent(r.data.data || ''); }).catch(() => {});
  }, []);
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>{t('用户协议')}</Typography>
      <Card><CardContent><div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} /></CardContent></Card>
    </Box>
  );
}
