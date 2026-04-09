import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Stack,
  Divider, CircularProgress, Alert, Chip, Tabs, Tab, Avatar, alpha,
  useTheme, IconButton, Tooltip, RadioGroup, FormControlLabel, Radio,
} from '@mui/material';
import {
  ManageAccounts, Person, Lock, Link as LinkIcon, Warning,
  ContentCopy, CheckCircle, Edit, Save, EventAvailable,
  AccountBalanceWallet, DataUsage, Group, Email, GitHub,
  Shield, Notifications, Webhook,
} from '@mui/icons-material';
import { API } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useStatus } from '../contexts/StatusContext';
import { showError, showSuccess, renderQuota, copy } from '../utils';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useTranslation } from 'react-i18next';

/* ── Shared sub-components ── */

function SectionCard({ icon: Icon, title, children, color }) {
  const theme = useTheme();
  return (
    <Card sx={{ mb: 2.5 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(color || theme.palette.primary.main, 0.1) }}>
            <Icon sx={{ fontSize: 20, color: color || theme.palette.primary.main }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, chip, action }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.2, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 100 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        {chip ? <Chip label={value} size="small" variant="outlined" /> :
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>}
        {action}
      </Stack>
    </Stack>
  );
}

function OAuthCard({ icon, name, bound, boundValue, enabled, onBind, onUnbind, t }) {
  const theme = useTheme();
  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.08),
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
            <Typography variant="caption" sx={{ color: bound ? 'success.main' : 'text.disabled' }} noWrap>
              {!enabled ? t('未启用') : bound ? (boundValue || t('已绑定')) : t('未绑定')}
            </Typography>
          </Box>
        </Stack>
        <Button size="small" variant={bound ? 'outlined' : 'contained'} disabled={!enabled || (bound && !onUnbind)}
          onClick={bound ? onUnbind : onBind}>
          {!enabled ? t('未启用') : bound ? t('已绑定') : t('绑定')}
        </Button>
      </Stack>
    </Card>
  );
}

/* ── Main Component ── */

export default function PersonalSetting() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, updateUser, logout } = useAuth();
  const { status } = useStatus();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ display_name: '' });
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', new_password2: '' });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  // Notification settings state
  const [notify, setNotify] = useState({
    notify_type: 'email', quota_warning_threshold: 500000,
    notification_email: '', webhook_url: '', webhook_secret: '',
    bark_url: '', gotify_url: '', gotify_token: '', gotify_priority: 5,
  });

  useEffect(() => {
    if (!user) return;
    setForm({ display_name: user.display_name || '' });
    // Parse notification settings from user.setting JSON string
    if (user.setting) {
      try {
        const s = typeof user.setting === 'string' ? JSON.parse(user.setting) : user.setting;
        setNotify(prev => ({
          ...prev,
          notify_type: s.notify_type || 'email',
          quota_warning_threshold: s.quota_warning_threshold || 500000,
          notification_email: s.notification_email || '',
          webhook_url: s.webhook_url || '',
          webhook_secret: s.webhook_secret || '',
          bark_url: s.bark_url || '',
          gotify_url: s.gotify_url || '',
          gotify_token: s.gotify_token || '',
          gotify_priority: s.gotify_priority !== undefined ? s.gotify_priority : 5,
        }));
      } catch { /* ignore bad JSON */ }
    }
    API.get('/api/user/checkin').then(res => {
      if (res.data.success) setCheckinStatus(res.data.data);
    }).catch(() => {});
  }, [user]);

  /* ── Handlers ── */

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const res = await API.put('/api/user/self', form);
      if (res.data.success) { showSuccess(t('更新成功')); updateUser(form); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (pwdForm.new_password !== pwdForm.new_password2) return showError(t('两次密码不一致'));
    setSaving(true);
    try {
      const res = await API.put('/api/user/setting', { old_password: pwdForm.old_password, new_password: pwdForm.new_password });
      if (res.data.success) { showSuccess(t('密码修改成功')); setPwdForm({ old_password: '', new_password: '', new_password2: '' }); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setSaving(false);
  };

  const handleCheckin = async () => {
    setCheckinLoading(true);
    try {
      const res = await API.post('/api/user/checkin');
      if (res.data.success) {
        showSuccess(t('签到成功'));
        const selfRes = await API.get('/api/user/self');
        if (selfRes.data.success) updateUser(selfRes.data.data);
        const statusRes = await API.get('/api/user/checkin');
        if (statusRes.data.success) setCheckinStatus(statusRes.data.data);
      } else showError(res.data.message);
    } catch (err) { showError(err); }
    setCheckinLoading(false);
  };

  const handleGenerateToken = async () => {
    try {
      const res = await API.get('/api/user/token');
      if (res.data.success) { setAccessToken(res.data.data); showSuccess(t('Token 已生成')); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await API.delete('/api/user/self');
      if (res.data.success) { showSuccess(t('账号已删除')); await logout(); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setDeleteOpen(false);
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      const res = await API.put('/api/user/setting', {
        notify_type: notify.notify_type,
        quota_warning_threshold: parseFloat(notify.quota_warning_threshold),
        notification_email: notify.notification_email,
        webhook_url: notify.webhook_url,
        webhook_secret: notify.webhook_secret,
        bark_url: notify.bark_url,
        gotify_url: notify.gotify_url,
        gotify_token: notify.gotify_token,
        gotify_priority: parseInt(notify.gotify_priority) || 5,
      });
      if (res.data.success) {
        showSuccess(t('设置保存成功'));
        const selfRes = await API.get('/api/user/self');
        if (selfRes.data.success) updateUser(selfRes.data.data);
      } else showError(res.data.message);
    } catch (err) { showError(err); }
    setSaving(false);
  };

  const oauthRedirect = (path) => {
    window.location.href = `${path}?redirect=${encodeURIComponent(window.location.pathname)}`;
  };

  /* ── OAuth providers list (derived from status) ── */

  const oauthProviders = useMemo(() => [
    { key: 'email', name: t('邮箱'), icon: <Email sx={{ fontSize: 20 }} />,
      enabled: true, bound: !!user?.email, boundValue: user?.email,
      onBind: () => showError(t('邮箱绑定请联系管理员')), onUnbind: null },
    { key: 'github', name: 'GitHub', icon: <GitHub sx={{ fontSize: 20 }} />,
      enabled: !!status?.github_oauth, bound: !!user?.github_id, boundValue: user?.github_id,
      onBind: () => oauthRedirect('/api/oauth/github'), onUnbind: null },
    { key: 'discord', name: 'Discord', icon: <LinkIcon sx={{ fontSize: 20 }} />,
      enabled: !!status?.discord_oauth, bound: !!user?.discord_id, boundValue: user?.discord_id,
      onBind: () => oauthRedirect('/api/oauth/discord'), onUnbind: null },
    { key: 'telegram', name: 'Telegram', icon: <LinkIcon sx={{ fontSize: 20 }} />,
      enabled: !!status?.telegram_oauth, bound: !!user?.telegram_id, boundValue: user?.telegram_id,
      onBind: null, onUnbind: null },
    { key: 'wechat', name: t('微信'), icon: <LinkIcon sx={{ fontSize: 20 }} />,
      enabled: !!status?.wechat_login, bound: !!user?.wechat_id, boundValue: null,
      onBind: null, onUnbind: null },
    { key: 'linuxdo', name: 'LinuxDO', icon: <LinkIcon sx={{ fontSize: 20 }} />,
      enabled: !!status?.linuxdo_oauth, bound: !!user?.linux_do_id, boundValue: user?.linux_do_id,
      onBind: () => oauthRedirect('/api/oauth/linuxdo'), onUnbind: null },
    { key: 'oidc', name: 'OIDC', icon: <Shield sx={{ fontSize: 20 }} />,
      enabled: !!status?.oidc_enabled, bound: !!user?.oidc_id, boundValue: user?.oidc_id,
      onBind: () => {
        if (status?.oidc_authorization_endpoint && status?.oidc_client_id) {
          const redirect = encodeURIComponent(`${window.location.origin}/oauth/oidc`);
          window.location.href = `${status.oidc_authorization_endpoint}?client_id=${status.oidc_client_id}&redirect_uri=${redirect}&response_type=code&scope=openid profile email`;
        }
      }, onUnbind: null },
  ], [status, user, t]);

  const nf = (field) => (e) => setNotify(p => ({ ...p, [field]: e.target ? e.target.value : e }));

  return (
    <Box>
      <PageHeader icon={ManageAccounts} title={t('个人设置')} />

      <Grid container spacing={3}>
        {/* ── Left: Profile Card ── */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Card sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ height: 80, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.5)})` }} />
            <CardContent sx={{ textAlign: 'center', mt: -5, position: 'relative' }}>
              <Avatar sx={{
                width: 72, height: 72, mx: 'auto', mb: 1.5,
                bgcolor: theme.palette.primary.main, border: `3px solid ${theme.palette.background.paper}`,
                fontSize: '1.8rem', fontWeight: 700,
              }}>
                {(user?.username || 'U')[0].toUpperCase()}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{user?.display_name || user?.username}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>@{user?.username}</Typography>
              <Chip label={user?.role >= 100 ? t('超级管理员') : user?.role >= 10 ? t('管理员') : t('用户')}
                size="small" color={user?.role >= 10 ? 'primary' : 'default'} sx={{ mt: 1, display: 'block', mx: 'auto', width: 'fit-content' }} />

              <Divider sx={{ my: 2 }} />

              <Stack spacing={0}>
                <InfoRow label={t('余额')} value={renderQuota(user?.quota || 0)} />
                <InfoRow label={t('已用')} value={renderQuota(user?.used_quota || 0)} />
                <InfoRow label={t('分组')} value={user?.group || 'default'} chip />
                <InfoRow label={t('请求数')} value={String(user?.request_count || 0)} />
              </Stack>

              {checkinStatus && !checkinStatus.checked_in ? (
                <Button variant="contained" fullWidth startIcon={<EventAvailable />} sx={{ mt: 2 }}
                  onClick={handleCheckin} disabled={checkinLoading}>
                  {checkinLoading ? <CircularProgress size={20} /> : t('每日签到')}
                </Button>
              ) : checkinStatus?.checked_in ? (
                <Alert icon={<CheckCircle />} severity="success" sx={{ mt: 2, justifyContent: 'center' }}>{t('今日已签到')}</Alert>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Tabbed Settings ── */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Card sx={{ mb: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tab icon={<LinkIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('账户绑定')} />
              <Tab icon={<Lock sx={{ fontSize: 18 }} />} iconPosition="start" label={t('安全设置')} />
              <Tab icon={<Notifications sx={{ fontSize: 18 }} />} iconPosition="start" label={t('通知设置')} />
              <Tab icon={<Warning sx={{ fontSize: 18 }} />} iconPosition="start" label={t('危险区域')} />
            </Tabs>
          </Card>

          {/* Tab 0: Account Binding */}
          {tab === 0 && (
            <SectionCard icon={LinkIcon} title={t('账户绑定')} color={theme.palette.primary.main}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                {t('绑定第三方账号以启用快捷登录')}
              </Typography>
              <Grid container spacing={2}>
                {oauthProviders.map(p => (
                  <Grid size={{ xs: 12, sm: 6 }} key={p.key}>
                    <OAuthCard icon={p.icon} name={p.name} bound={p.bound} boundValue={p.boundValue}
                      enabled={p.enabled} onBind={p.onBind} onUnbind={p.onUnbind} t={t} />
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          )}

          {/* Tab 1: Security */}
          {tab === 1 && (
            <>
              <SectionCard icon={Person} title={t('基本信息')} color={theme.palette.primary.main}>
                <Stack spacing={2.5}>
                  <TextField fullWidth label={t('用户名')} value={user?.username || ''} disabled helperText={t('用户名不可修改')} />
                  <TextField fullWidth label={t('显示名称')} value={form.display_name}
                    onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" startIcon={<Save />} onClick={handleUpdateProfile} disabled={saving}>
                      {saving ? <CircularProgress size={20} /> : t('保存修改')}
                    </Button>
                  </Box>
                </Stack>
              </SectionCard>

              <SectionCard icon={Lock} title={t('修改密码')} color={theme.palette.warning.main}>
                <Stack spacing={2}>
                  <TextField fullWidth label={t('当前密码')} type="password" value={pwdForm.old_password}
                    onChange={e => setPwdForm(f => ({ ...f, old_password: e.target.value }))} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label={t('新密码')} type="password" value={pwdForm.new_password}
                        onChange={e => setPwdForm(f => ({ ...f, new_password: e.target.value }))} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label={t('确认新密码')} type="password" value={pwdForm.new_password2}
                        onChange={e => setPwdForm(f => ({ ...f, new_password2: e.target.value }))} />
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" color="warning" onClick={handleChangePassword} disabled={saving}>{t('修改密码')}</Button>
                  </Box>
                </Stack>
              </SectionCard>

              <SectionCard icon={ContentCopy} title={t('系统访问令牌')} color={theme.palette.info.main}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{t('生成系统访问令牌用于 API 调用认证（非 sk- 开头的令牌）')}</Typography>
                {accessToken && (
                  <Alert severity="info" sx={{ mb: 2, wordBreak: 'break-all' }}
                    action={
                      <IconButton size="small" onClick={() => { copy(accessToken); showSuccess(t('已复制')); }}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    }>
                    {accessToken}
                  </Alert>
                )}
                <Button variant="outlined" onClick={handleGenerateToken}>{t('生成新令牌')}</Button>
              </SectionCard>
            </>
          )}

          {/* Tab 2: Notifications */}
          {tab === 2 && (
            <SectionCard icon={Notifications} title={t('通知设置')} color={theme.palette.info.main}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('通知方式')}</Typography>
                  <RadioGroup row value={notify.notify_type} onChange={e => setNotify(p => ({ ...p, notify_type: e.target.value }))}>
                    <FormControlLabel value="email" control={<Radio />} label={t('邮件通知')} />
                    <FormControlLabel value="webhook" control={<Radio />} label={t('Webhook通知')} />
                    <FormControlLabel value="bark" control={<Radio />} label={t('Bark通知')} />
                    <FormControlLabel value="gotify" control={<Radio />} label={t('Gotify通知')} />
                  </RadioGroup>
                </Box>

                <TextField fullWidth label={t('额度预警阈值')} type="number"
                  value={notify.quota_warning_threshold} onChange={nf('quota_warning_threshold')}
                  helperText={t('当钱包或订阅剩余额度低于此数值时，系统将通过选择的方式发送通知')} />

                {notify.notify_type === 'email' && (
                  <TextField fullWidth label={t('通知邮箱')} value={notify.notification_email}
                    onChange={nf('notification_email')} helperText={t('留空则使用账号绑定的邮箱')} />
                )}

                {notify.notify_type === 'webhook' && (
                  <>
                    <TextField fullWidth label={t('Webhook地址')} value={notify.webhook_url}
                      onChange={nf('webhook_url')} helperText={t('只支持HTTPS，系统将以POST方式发送通知')} />
                    <TextField fullWidth label={t('接口凭证')} value={notify.webhook_secret}
                      onChange={nf('webhook_secret')} helperText={t('密钥将以Bearer方式添加到请求头中')} />
                  </>
                )}

                {notify.notify_type === 'bark' && (
                  <TextField fullWidth label={t('Bark推送URL')} value={notify.bark_url}
                    onChange={nf('bark_url')} helperText={t('支持HTTP和HTTPS，模板变量: {{title}}, {{content}}')} />
                )}

                {notify.notify_type === 'gotify' && (
                  <>
                    <TextField fullWidth label={t('Gotify服务器地址')} value={notify.gotify_url}
                      onChange={nf('gotify_url')} helperText={t('Gotify服务器的完整URL地址')} />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label={t('Gotify应用令牌')} value={notify.gotify_token}
                          onChange={nf('gotify_token')} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label={t('消息优先级')} type="number" value={notify.gotify_priority}
                          onChange={nf('gotify_priority')} helperText={t('范围0-10，默认为5')} />
                      </Grid>
                    </Grid>
                  </>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" startIcon={<Save />} onClick={handleSaveNotifications} disabled={saving}>
                    {saving ? <CircularProgress size={20} /> : t('保存设置')}
                  </Button>
                </Box>
              </Stack>
            </SectionCard>
          )}

          {/* Tab 3: Danger Zone */}
          {tab === 3 && (
            <SectionCard icon={Warning} title={t('危险区域')} color={theme.palette.error.main}>
              <Alert severity="error" sx={{ mb: 2 }}>{t('以下操作不可逆，请谨慎操作。')}</Alert>
              <Stack direction="row" justifyContent="space-between" alignItems="center"
                sx={{ p: 2, border: 1, borderColor: 'error.main', borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{t('删除账号')}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('永久删除你的账号和所有数据')}</Typography>
                </Box>
                <Button variant="outlined" color="error" onClick={() => setDeleteOpen(true)}>{t('删除账号')}</Button>
              </Stack>
            </SectionCard>
          )}
        </Grid>
      </Grid>

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDeleteAccount}
        title={t('确认删除账号')} message={t('此操作将永久删除你的账号、所有令牌和使用记录。此操作不可撤销。')} confirmLabel={t('确认删除')} />
    </Box>
  );
}
