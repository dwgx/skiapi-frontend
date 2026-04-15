import React, { useState, useEffect } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Chip, IconButton, Stack, Button, Tooltip,
  CircularProgress, DialogTitle, DialogContent, DialogActions, TextField,
  Switch, FormControlLabel, MenuItem, Typography,
} from '@mui/material';
import { Add, Edit, Delete, VpnKey, ContentCopy } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { API } from '../api';
import { showError, showSuccess, timestamp2string, renderQuota, copy } from '../utils';
import usePaginatedList from '../hooks/usePaginatedList';
import PageHeader from '../components/common/PageHeader';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import TableSkeleton from '../components/common/TableSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import AnimatedDialog from '../components/common/AnimatedDialog';

const defaultToken = { name: '', remain_quota: 500000, expired_time: -1, unlimited_quota: false, models: '', subnet: '', group: '' };

export default function Token() {
  const { t } = useTranslation();
  const { items: tokens, loading, page, setPage, rowsPerPage, changeRowsPerPage, total, search, setSearch, refresh } =
    usePaginatedList('/api/token/', { searchEndpoint: '/api/token/search' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editToken, setEditToken] = useState(null);
  const [form, setForm] = useState(defaultToken);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/api/user/self/groups');
        if (res.data.success && res.data.data) {
          const opts = Object.entries(res.data.data).map(([value, info]) => ({
            value,
            label: info?.desc || value,
            ratio: info?.ratio,
          }));
          setGroups(opts);
        }
      } catch {}
    })();
  }, []);

  const handleDelete = async () => {
    try {
      const res = await API.delete(`/api/token/${deleteTarget}`);
      if (res.data.success) { showSuccess(t('删除成功')); refresh(); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setConfirmOpen(false);
  };

  const handleCopyKey = async (token) => {
    try {
      // v0.12.6+ masks token.key in list responses — fetch full key via POST /api/token/:id/key
      let key = '';
      try {
        const res = await API.post(`/api/token/${token.id}/key`);
        if (res.data?.success && res.data?.data?.key) {
          key = res.data.data.key;
        }
      } catch {}
      // Fallback: if the list field still has an unmasked key (older backend), use it
      if (!key && token.key && !token.key.includes('*')) key = token.key;
      if (!key) {
        showError(t('无法获取完整密钥'));
        return;
      }
      await copy(key.startsWith('sk-') ? key : `sk-${key}`);
      showSuccess(t('密钥已复制'));
    } catch (err) { showError(err); }
  };

  const handleStatusToggle = async (token) => {
    const newStatus = token.status === 1 ? 2 : 1;
    try {
      const res = await API.put('/api/token/?status_only=1', { id: token.id, status: newStatus });
      if (res.data.success) { showSuccess(t('状态已更新')); refresh(); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
  };

  const openEdit = (tk) => {
    setEditToken(tk);
    setForm(tk ? { ...tk } : { ...defaultToken });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = editToken ? await API.put('/api/token/', form) : await API.post('/api/token/', form);
      if (res.data.success) {
        showSuccess(editToken ? t('更新成功') : t('创建成功'));
        // v0.12.6+ no longer returns the raw key from POST /api/token/.
        // Legacy (older backends) returned it as res.data.data — keep that path as a fallback.
        if (!editToken) {
          const legacyKey = typeof res.data.data === 'string' ? res.data.data : '';
          if (legacyKey) {
            await copy(`sk-${legacyKey}`);
            showSuccess(t('新令牌密钥已复制到剪贴板'));
          } else {
            showSuccess(t('请在列表中点击复制按钮获取密钥'));
          }
        }
        setDialogOpen(false); refresh();
      } else showError(res.data.message);
    } catch (err) { showError(err); }
    setSaving(false);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <Box>
      <PageHeader icon={VpnKey} title={t('令牌管理')} subtitle={`${t('共')} ${total} ${t('个令牌')}`}
        actions={
          <>
            <SearchBar value={search} onChange={setSearch} onSearch={refresh} onRefresh={refresh} placeholder={t('搜索令牌...')} />
            <Button variant="contained" startIcon={<Add />} onClick={() => openEdit(null)}>{t('添加令牌')}</Button>
          </>
        }
      />
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>{t('名称')}</TableCell><TableCell>{t('状态')}</TableCell><TableCell>{t('已用额度')}</TableCell>
              <TableCell>{t('剩余额度')}</TableCell><TableCell>{t('分组')}</TableCell><TableCell>{t('创建时间')}</TableCell><TableCell>{t('过期时间')}</TableCell>
              <TableCell align="right">{t('操作')}</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {loading ? <TableSkeleton rows={5} columns={8} /> :
                tokens.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>
                    <EmptyState icon={VpnKey} title={t('暂无令牌')} description={t('创建令牌以使用 API 服务')}
                      actionLabel={t('添加令牌')} onAction={() => openEdit(null)} />
                  </TableCell></TableRow>
                ) : tokens.map(tk => (
                  <TableRow key={tk.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{tk.name}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Switch size="small" checked={tk.status === 1} onChange={() => handleStatusToggle(tk)} />
                        <Chip label={tk.status === 1 ? t('启用') : t('禁用')} size="small"
                          color={tk.status === 1 ? 'success' : 'error'} />
                      </Stack>
                    </TableCell>
                    <TableCell>{renderQuota(tk.used_quota || 0)}</TableCell>
                    <TableCell>{tk.unlimited_quota ? <Chip label={t('无限')} size="small" color="info" /> : renderQuota(tk.remain_quota || 0)}</TableCell>
                    <TableCell>{tk.group ? <Chip label={tk.group} size="small" variant="outlined" /> : <Chip label="default" size="small" variant="outlined" sx={{ opacity: 0.5 }} />}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{timestamp2string(tk.created_time)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{tk.expired_time === -1 ? <Chip label={t('永不过期')} size="small" variant="outlined" /> : timestamp2string(tk.expired_time)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={t('复制密钥')}><IconButton size="small" onClick={() => handleCopyKey(tk)}><ContentCopy fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={t('编辑')}><IconButton size="small" onClick={() => openEdit(tk)}><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={t('删除')}><IconButton size="small" color="error" onClick={() => { setDeleteTarget(tk.id); setConfirmOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage} onRowsPerPageChange={changeRowsPerPage} rowsPerPageOptions={[10, 20, 50, 100]} />
      </Card>

      <AnimatedDialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editToken ? t('编辑令牌') : t('添加令牌')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label={t('名称')} value={form.name} onChange={set('name')} />
            <TextField fullWidth label={t('额度')} type="number" value={form.remain_quota} onChange={set('remain_quota')} disabled={form.unlimited_quota} />
            <FormControlLabel control={<Switch checked={form.unlimited_quota} onChange={e => setForm(f => ({ ...f, unlimited_quota: e.target.checked }))} />} label={t('无限额度')} />
            <TextField fullWidth label={t('模型限制')} value={form.models || ''} onChange={set('models')} placeholder={t('留空不限制，逗号分隔')} />
            <TextField fullWidth label={t('IP 限制 (子网)')} value={form.subnet || ''} onChange={set('subnet')} placeholder={t('留空不限制')} />
            <TextField
              select
              fullWidth
              label={t('分组')}
              value={form.group || ''}
              onChange={set('group')}
              helperText={t('留空使用默认分组')}
            >
              <MenuItem value="">
                <em>{t('默认分组')}</em>
              </MenuItem>
              {groups.map(g => (
                <MenuItem key={g.value} value={g.value}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                    <Typography sx={{ flex: 1 }}>{g.label}</Typography>
                    {g.ratio != null && (
                      <Chip label={`x${g.ratio}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.7rem' }} />
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('取消')}</Button>
          <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('保存')}
          </Button>
        </DialogActions>
      </AnimatedDialog>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete}
        title={t('删除令牌')} message={t('确定要删除此令牌？此操作不可撤销。')} confirmLabel={t('删除')} />
    </Box>
  );
}
