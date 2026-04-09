import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { API, updateAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { showError, showSuccess } from '../utils';
import { useTranslation } from 'react-i18next';

export default function OAuthCallback() {
  const { t } = useTranslation();
  const { provider } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    if (!code) { setError(t('缺少授权码')); return; }
    API.get(`/api/oauth/${provider}?code=${code}&state=${state || ''}`)
      .then(res => {
        if (res.data.success) {
          login(res.data.data);
          updateAPI();
          showSuccess(t('登录成功'));
          navigate('/console');
        } else {
          setError(res.data.message || t('登录失败'));
        }
      })
      .catch(err => setError(err.message || t('登录失败')));
  }, []);

  if (error) return <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">{error}</Alert></Box>;
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>{t('正在登录...')}</Typography>
    </Box>
  );
}
