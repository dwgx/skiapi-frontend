import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Stack, CircularProgress } from '@mui/material';
import { API } from '../api';
import { showError, showSuccess } from '../utils';
import { useTranslation } from 'react-i18next';

export default function PasswordReset() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return showError(t('请输入邮箱'));
    setLoading(true);
    try {
      const res = await API.get(`/api/reset_password?email=${encodeURIComponent(email)}`);
      if (res.data.success) { showSuccess(t('重置邮件已发送')); setSent(true); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', fontWeight: 700 }}>{t('重置密码')}</Typography>
          {sent ? (
            <Typography color="success.main" textAlign="center">{t('重置邮件已发送，请查收邮箱。')}</Typography>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField fullWidth label={t('邮箱')} type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <Button type="submit" variant="contained" fullWidth disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : t('发送重置邮件')}
                </Button>
              </Stack>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
