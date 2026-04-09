import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Stack, CircularProgress, Link as MuiLink } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { API, updateAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { showError, showSuccess } from '../utils';
import { useTranslation } from 'react-i18next';

export default function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: '', password: '', password2: '', email: '', verification_code: '' });
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const sendVerification = async () => {
    if (!form.email) return showError(t('请输入邮箱'));
    setSendingCode(true);
    try {
      const res = await API.get(`/api/verification?email=${encodeURIComponent(form.email)}`);
      if (res.data.success) showSuccess(t('验证码已发送'));
      else showError(res.data.message);
    } catch (err) { showError(err); }
    finally { setSendingCode(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) return showError(t('两次密码不一致'));
    if (!form.username || !form.password) return showError(t('请填写完整信息'));
    setLoading(true);
    try {
      const aff = localStorage.getItem('aff') || '';
      const res = await API.post('/api/user/register', { ...form, aff_code: aff });
      const { success, message, data } = res.data;
      if (!success) { showError(message); return; }
      login(data);
      updateAPI();
      showSuccess(t('注册成功'));
      navigate('/console');
    } catch (err) { showError(err); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1, textAlign: 'center', fontWeight: 700, color: 'primary.main' }}>SKIAPI</Typography>
          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>{t('创建新账号')}</Typography>
          <form onSubmit={handleRegister}>
            <Stack spacing={2}>
              <TextField fullWidth label={t('用户名')} value={form.username} onChange={set('username')} autoFocus />
              <TextField fullWidth label={t('邮箱')} type="email" value={form.email} onChange={set('email')} />
              <Stack direction="row" spacing={1}>
                <TextField fullWidth label={t('验证码')} value={form.verification_code} onChange={set('verification_code')} />
                <Button variant="outlined" onClick={sendVerification} disabled={sendingCode} sx={{ whiteSpace: 'nowrap', minWidth: 100 }}>
                  {sendingCode ? <CircularProgress size={20} /> : t('发送')}
                </Button>
              </Stack>
              <TextField fullWidth label={t('密码')} type="password" value={form.password} onChange={set('password')} />
              <TextField fullWidth label={t('确认密码')} type="password" value={form.password2} onChange={set('password2')} />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : t('注册')}
              </Button>
            </Stack>
          </form>
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>{t('已有账号？')}<MuiLink component={Link} to="/login">{t('登录')}</MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
