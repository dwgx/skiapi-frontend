import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack,
  CircularProgress, Switch, FormControlLabel, Stepper, Step, StepLabel,
  alpha, useTheme, Fade, Alert, Divider,
} from '@mui/material';
import { RocketLaunch, AdminPanelSettings, Settings as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API, updateAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { showError, showSuccess } from '../utils';
import { useTranslation } from 'react-i18next';

export default function Setup() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [setupInfo, setSetupInfo] = useState(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    SelfUseModeEnabled: false,
    DemoSiteEnabled: false,
  });

  useEffect(() => {
    API.get('/api/setup').then(res => {
      if (res.data.success) {
        const data = res.data.data;
        setSetupInfo(data);
        if (data.status) {
          // Already set up, redirect
          navigate('/login');
          return;
        }
        if (data.root_init) {
          // Root user exists, skip to step 2
          setStep(1);
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!setupInfo?.root_init) {
      if (!form.username || form.username.length > 12) {
        return showError(t('用户名不能为空且不超过12个字符'));
      }
      if (form.password.length < 8) {
        return showError(t('密码长度至少为8个字符'));
      }
      if (form.password !== form.confirmPassword) {
        return showError(t('两次输入的密码不一致'));
      }
    }
    setSubmitting(true);
    try {
      const res = await API.post('/api/setup', form);
      if (res.data.success) {
        showSuccess(t('系统初始化成功'));
        // After setup, need to login
        if (!setupInfo?.root_init) {
          // Try auto-login with the credentials we just created
          try {
            const loginRes = await API.post('/api/user/login', {
              username: form.username,
              password: form.password,
            });
            if (loginRes.data.success && loginRes.data.data) {
              login(loginRes.data.data);
              updateAPI();
              navigate('/console');
              return;
            }
          } catch {}
        }
        navigate('/login');
      } else {
        showError(res.data.message);
      }
    } catch (err) { showError(err); }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const steps = setupInfo?.root_init
    ? [t('系统配置')]
    : [t('创建管理员'), t('系统配置')];

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
      p: 2,
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
    }}>
      <Card sx={{ maxWidth: 520, width: '100%', overflow: 'visible' }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '20px', mx: 'auto', mb: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            }}>
              <RocketLaunch sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              SKIAPI
            </Typography>
            <Typography variant="body1" color="text.secondary">{t('系统初始化向导')}</Typography>
          </Box>

          {/* Stepper */}
          {steps.length > 1 && (
            <Stepper activeStep={step} sx={{ mb: 4 }}>
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 0: Create admin (only if root doesn't exist) */}
            {step === 0 && !setupInfo?.root_init && (
              <Fade in>
                <Stack spacing={2.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AdminPanelSettings sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('创建管理员账号')}</Typography>
                  </Box>
                  <Alert severity="info" variant="outlined">{t('请设置管理员账号，该账号将拥有系统最高权限')}</Alert>
                  <TextField
                    fullWidth label={t('管理员用户名')} value={form.username}
                    onChange={set('username')} autoFocus
                    helperText={t('最多12个字符')}
                    inputProps={{ maxLength: 12 }}
                  />
                  <TextField
                    fullWidth label={t('密码')} type="password" value={form.password}
                    onChange={set('password')}
                    helperText={t('至少8个字符')}
                  />
                  <TextField
                    fullWidth label={t('确认密码')} type="password" value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                  />
                  <Button
                    variant="contained" fullWidth size="large"
                    onClick={() => {
                      if (!form.username) return showError(t('请输入用户名'));
                      if (form.password.length < 8) return showError(t('密码至少8个字符'));
                      if (form.password !== form.confirmPassword) return showError(t('两次密码不一致'));
                      setStep(1);
                    }}
                  >{t('下一步')}</Button>
                </Stack>
              </Fade>
            )}

            {/* Step 1 (or 0 if root exists): System config */}
            {(step === 1 || (step === 0 && setupInfo?.root_init)) && (
              <Fade in>
                <Stack spacing={2.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SettingsIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('系统配置')}</Typography>
                  </Box>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.SelfUseModeEnabled}
                          onChange={e => setForm(f => ({ ...f, SelfUseModeEnabled: e.target.checked }))}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>{t('自用模式')}</Typography>
                          <Typography variant="body2" color="text.secondary">{t('仅管理员可使用，关闭注册功能')}</Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%', justifyContent: 'space-between', ml: 0 }}
                      labelPlacement="start"
                    />
                  </Card>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.DemoSiteEnabled}
                          onChange={e => setForm(f => ({ ...f, DemoSiteEnabled: e.target.checked }))}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>{t('演示站点')}</Typography>
                          <Typography variant="body2" color="text.secondary">{t('启用演示模式，限制部分敏感操作')}</Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%', justifyContent: 'space-between', ml: 0 }}
                      labelPlacement="start"
                    />
                  </Card>

                  {setupInfo?.database_type && (
                    <Alert severity="info" variant="outlined">
                      {t('数据库类型')}: {setupInfo.database_type}
                    </Alert>
                  )}

                  <Stack direction="row" spacing={2}>
                    {!setupInfo?.root_init && (
                      <Button variant="outlined" fullWidth size="large" onClick={() => setStep(0)}>{t('上一步')}</Button>
                    )}
                    <Button
                      type="submit" variant="contained" fullWidth size="large"
                      disabled={submitting}
                    >
                      {submitting ? <CircularProgress size={24} /> : t('完成初始化')}
                    </Button>
                  </Stack>
                </Stack>
              </Fade>
            )}
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
