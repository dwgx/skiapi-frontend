import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, Alert, alpha, useTheme, IconButton, Tooltip,
  Divider,
} from '@mui/material';
import {
  AccountBalanceWallet, Redeem, ContentCopy, Share, History,
  CardGiftcard, TrendingUp, DataUsage, ArrowUpward,
} from '@mui/icons-material';
import { API } from '../api';
import { showError, showSuccess, renderQuota, timestamp2string, safeArray, copy } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import TableSkeleton from '../components/common/TableSkeleton';
import { useTranslation } from 'react-i18next';

function InfoCard({ icon: Icon, title, value, subtitle, gradient }) {
  return (
    <Card sx={{ overflow: 'hidden' }}>
      <Box sx={{ height: 3, background: gradient }} />
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: gradient, opacity: 0.85,
          }}>
            <Icon sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.7rem', letterSpacing: 0.3 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
            {subtitle && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{subtitle}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SectionCard({ icon: Icon, title, children, color, action }) {
  const theme = useTheme();
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(color || theme.palette.primary.main, 0.1) }}>
              <Icon sx={{ fontSize: 20, color: color || theme.palette.primary.main }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
          </Stack>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export default function TopUp() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, updateUser } = useAuth();
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [affiliateLink, setAffiliateLink] = useState('');

  useEffect(() => {
    API.get('/api/user/topup/self').then(res => {
      if (res.data.success) setTopups(safeArray(res.data.data));
    }).catch(() => {});
    // Generate affiliate link
    if (user?.aff_code) {
      setAffiliateLink(`${window.location.origin}/register?aff=${user.aff_code}`);
    }
    setLoading(false);
  }, [user]);

  const handleRedeem = async () => {
    if (!redeemCode) return showError(t('请输入兑换码'));
    setRedeeming(true);
    try {
      const res = await API.post('/api/user/topup', { key: redeemCode });
      if (res.data.success) {
        showSuccess(t('兑换成功'));
        setRedeemCode('');
        const selfRes = await API.get('/api/user/self');
        if (selfRes.data.success) updateUser(selfRes.data.data);
      } else showError(res.data.message);
    } catch (err) { showError(err); }
    setRedeeming(false);
  };

  const copyAffLink = () => {
    if (affiliateLink) {
      copy(affiliateLink);
      showSuccess(t('邀请链接已复制'));
    }
  };

  return (
    <Box>
      <PageHeader icon={AccountBalanceWallet} title={t('钱包管理')} />

      {/* ── Balance Cards ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <InfoCard icon={AccountBalanceWallet} title={t('当前余额')} value={renderQuota(user?.quota || 0)}
            gradient={`linear-gradient(135deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.5)})`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <InfoCard icon={DataUsage} title={t('已用额度')} value={renderQuota(user?.used_quota || 0)}
            gradient="linear-gradient(135deg, #e8710a, #ffb74d)" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <InfoCard icon={TrendingUp} title={t('请求次数')} value={String(user?.request_count || 0)}
            gradient="linear-gradient(135deg, #1e8e3e, #66bb6a)" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <InfoCard icon={CardGiftcard} title={t('邀请额度')} value={renderQuota(user?.aff_quota || 0)}
            subtitle={user?.aff_count ? `${t('已邀请')} ${user.aff_count} ${t('人')}` : undefined}
            gradient="linear-gradient(135deg, #9c27b0, #ba68c8)" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* ── Redeem Code ── */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard icon={Redeem} title={t('兑换码充值')} color={theme.palette.primary.main}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label={t('兑换码')} value={redeemCode} onChange={e => setRedeemCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRedeem()} placeholder={t('输入兑换码')}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              <Button variant="contained" startIcon={redeeming ? <CircularProgress size={18} /> : <Redeem />}
                onClick={handleRedeem} disabled={redeeming} sx={{ minWidth: 120, borderRadius: 3 }}>{t('兑换')}</Button>
            </Stack>
          </SectionCard>
        </Grid>

        {/* ── Affiliate/Referral ── */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard icon={Share} title={t('邀请推广')} color="#9c27b0">
            {affiliateLink ? (
              <Stack spacing={1.5}>
                <TextField fullWidth size="small" value={affiliateLink} InputProps={{ readOnly: true,
                  endAdornment: (
                    <Tooltip title={t('复制链接')}>
                      <IconButton size="small" onClick={copyAffLink}><ContentCopy fontSize="small" /></IconButton>
                    </Tooltip>
                  ),
                }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('分享此链接邀请新用户注册，获得额度奖励')}</Typography>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('暂无邀请链接')}</Typography>
            )}
          </SectionCard>
        </Grid>

        {/* ── Transaction History ── */}
        <Grid size={12}>
          <SectionCard icon={History} title={t('充值记录')} color={theme.palette.info.main}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>{t('时间')}</TableCell>
                  <TableCell>{t('金额')}</TableCell>
                  <TableCell>{t('额度')}</TableCell>
                  <TableCell>{t('状态')}</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {loading ? <TableSkeleton rows={3} columns={4} /> :
                    topups.length === 0 ? (
                      <TableRow><TableCell colSpan={4}>
                        <EmptyState icon={History} title={t('暂无充值记录')} description={t('使用兑换码或在线充值后将在此显示')} sx={{ py: 3 }} />
                      </TableCell></TableRow>
                    ) : topups.map((topup, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{timestamp2string(topup.created_at)}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{topup.amount ? `¥${topup.amount}` : '-'}</TableCell>
                        <TableCell>{renderQuota(topup.quota || 0)}</TableCell>
                        <TableCell>
                          <Chip label={topup.status === 'success' ? t('成功') : topup.status || '-'} size="small"
                            color={topup.status === 'success' ? 'success' : 'default'} />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
