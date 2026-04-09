import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Stack, CircularProgress } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API } from '../api';
import { showError, showSuccess } from '../utils';
import { useTranslation } from 'react-i18next';

export default function PasswordResetConfirm() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== password2) return showError(t('两次密码不一致'));
    setLoading(true);
    try {
      const res = await API.post('/api/user/reset', {
        email: params.get('email'),
        token: params.get('token'),
        password,
      });
      if (res.data.success) { showSuccess(t('密码重置成功')); navigate('/login'); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', fontWeight: 700 }}>{t('设置新密码')}</Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField fullWidth label={t('新密码')} type="password" value={password} onChange={e => setPassword(e.target.value)} />
              <TextField fullWidth label={t('确认密码')} type="password" value={password2} onChange={e => setPassword2(e.target.value)} />
              <Button type="submit" variant="contained" fullWidth disabled={loading}>
                {loading ? <CircularProgress size={24} /> : t('重置密码')}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
