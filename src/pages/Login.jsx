import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Divider,
  IconButton, InputAdornment, Alert, Link as MuiLink, Stack, CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, GitHub } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, updateAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { showError, showSuccess } from '../utils';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return showError(t('请输入用户名和密码'));
    setLoading(true);
    try {
      const res = await API.post('/api/user/login', { username, password });
      const { success, message, data } = res.data;
      if (!success) { showError(message); return; }
      if (data?.require_2fa) {
        setTwoFA(true);
        setLoginToken(data.login_token);
        return;
      }
      login(data);
      updateAPI();
      showSuccess(t('登录成功'));
      navigate('/console');
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/api/user/login/2fa', { code: twoFACode });
      const { success, message, data } = res.data;
      if (!success) { showError(message); return; }
      login(data);
      updateAPI();
      showSuccess(t('登录成功'));
      navigate('/console');
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1, textAlign: 'center', fontWeight: 700, color: 'primary.main' }}>
            SKIAPI
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
            {t('登录到控制台')}
          </Typography>
          {!twoFA ? (
            <form onSubmit={handleLogin}>
              <Stack spacing={2.5}>
                <TextField fullWidth label={t('用户名 / 邮箱')} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                <TextField fullWidth label={t('密码')} type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  InputProps={{ endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small">
                        {showPwd ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )}} />
                <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : t('登录')}
                </Button>
              </Stack>
            </form>
          ) : (
            <form onSubmit={handle2FA}>
              <Stack spacing={2.5}>
                <Alert severity="info">{t('请输入两步验证码')}</Alert>
                <TextField fullWidth label={t('验证码')} value={twoFACode} onChange={e => setTwoFACode(e.target.value)} autoFocus />
                <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : t('验证')}
                </Button>
              </Stack>
            </form>
          )}
          <Divider sx={{ my: 3 }}>{t('或')}</Divider>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
            <Typography variant="body2">
              {t('还没有账号？')}<MuiLink component={Link} to="/register">{t('注册')}</MuiLink>
            </Typography>
            <Typography variant="body2">|</Typography>
            <Typography variant="body2">
              <MuiLink component={Link} to="/reset">{t('忘记密码')}</MuiLink>
            </Typography>
            <Typography variant="body2">|</Typography>
            <Typography variant="body2">
              <MuiLink href="/legacy/">{t('经典 UI')}</MuiLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
