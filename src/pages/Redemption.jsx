import React, { useState, useMemo } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Chip, IconButton, Stack, Button, Tooltip,
  CircularProgress, DialogTitle, DialogContent, DialogActions, TextField,
  Checkbox, Typography, alpha, useTheme, Menu, MenuItem,
  TableSortLabel,
} from '@mui/material';
import {
  Add, Delete, Redeem, ContentCopy, MoreVert, Layers, FileDownload,
  CheckCircleOutline, Block,
} from '@mui/icons-material';
import { API } from '../api';
import { showError, showSuccess, timestamp2string, renderQuota, copy } from '../utils';
import usePaginatedList from '../hooks/usePaginatedList';
import PageHeader from '../components/common/PageHeader';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import TableSkeleton from '../components/common/TableSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import AnimatedDialog from '../components/common/AnimatedDialog';
import { useTranslation } from 'react-i18next';

const defaultForm = { name: '', quota: 100000, count: 1 };

export default function Redemption() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { items: data, loading, page, setPage, rowsPerPage, changeRowsPerPage, total, search, setSearch, refresh } =
    usePaginatedList('/api/redemption/', { searchEndpoint: '/api/redemption/search' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // id | 'batch'
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [keysDialog, setKeysDialog] = useState(null); // {keys: [], name: ''}
  const [orderBy, setOrderBy] = useState('id');
  const [order, setOrder] = useState('desc');

  const handleDelete = async () => {
    try {
      if (deleteTarget === 'batch') {
        const ids = Array.from(selected);
        const results = await Promise.allSettled(ids.map(id => API.delete(`/api/redemption/${id}`)));
        const failed = results.filter(r => r.status === 'rejected' || !r.value?.data?.success).length;
        if (failed === 0) showSuccess(`${t('已删除')} ${ids.length}`);
        else showError(`${ids.length - failed}/${ids.length} ${t('成功')}`);
        setSelected(new Set());
      } else {
        const res = await API.delete(`/api/redemption/${deleteTarget}`);
        if (res.data.success) showSuccess(t('删除成功'));
        else showError(res.data.message);
      }
      refresh();
    } catch (err) { showError(err); }
    setConfirmOpen(false);
  };

  const handleDeleteInvalid = async () => {
    try {
      const res = await API.delete('/api/redemption/invalid');
      if (res.data.success) { showSuccess(t('清除成功')); refresh(); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setClearConfirmOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await API.post('/api/redemption/', form);
      if (res.data.success) {
        showSuccess(t('创建成功'));
        // Backend returns generated keys in res.data.data — show them so user can copy
        const keys = Array.isArray(res.data.data) ? res.data.data : [];
        if (keys.length > 0) setKeysDialog({ keys, name: form.name });
        setDialogOpen(false);
        refresh();
      } else showError(res.data.message);
    } catch (err) { showError(err); }
    setSaving(false);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  // ── Sort ───────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const c = [...data];
    c.sort((a, b) => {
      const av = a[orderBy] ?? 0;
      const bv = b[orderBy] ?? 0;
      if (av < bv) return order === 'asc' ? -1 : 1;
      if (av > bv) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return c;
  }, [data, orderBy, order]);

  const handleSort = (key) => {
    if (orderBy === key) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setOrderBy(key); setOrder('desc'); }
  };

  // ── Selection ──────────────────────────────────────────────────────────
  const allOnPageSelected = sorted.length > 0 && sorted.every(it => selected.has(it.id));
  const someOnPageSelected = sorted.some(it => selected.has(it.id)) && !allOnPageSelected;

  const togglePage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) sorted.forEach(it => next.delete(it.id));
    else sorted.forEach(it => next.add(it.id));
    setSelected(next);
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedItems = data.filter(it => selected.has(it.id));

  const batchCopyKeys = () => {
    const keys = selectedItems.map(it => it.key).filter(Boolean);
    if (keys.length === 0) { showError(t('选中项无可复制的兑换码')); return; }
    copy(keys.join('\n'));
    showSuccess(`${t('已复制')} ${keys.length} ${t('个兑换码')}`);
  };
  const batchCopyNames = () => {
    copy(selectedItems.map(it => it.name).join('\n'));
    showSuccess(`${t('已复制')} ${selectedItems.length} ${t('个名称')}`);
  };
  const askBatchDelete = () => { setDeleteTarget('batch'); setConfirmOpen(true); };

  const exportCSV = () => {
    const rows = [['id', 'name', 'status', 'quota', 'created_time', 'redeemed_time', 'key']];
    data.forEach(it => rows.push([
      it.id, it.name, it.status, it.quota,
      it.created_time ? timestamp2string(it.created_time) : '',
      it.redeemed_time ? timestamp2string(it.redeemed_time) : '',
      it.key || '',
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `redemption-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setMoreAnchor(null);
  };

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let unused = 0, used = 0, disabled = 0, totalQuota = 0;
    data.forEach(it => {
      if (it.status === 1) unused++;
      else if (it.status === 2) disabled++;
      else used++;
      if (it.status === 1) totalQuota += (it.quota || 0);
    });
    return { unused, used, disabled, totalQuota };
  }, [data]);

  return (
    <Box>
      <PageHeader icon={Redeem} title={t('兑换码管理')}
        subtitle={`${total} ${t('个')} · ${stats.unused} ${t('未使用')} · ${stats.used} ${t('已使用')} · ${t('未使用总额度')} ${renderQuota(stats.totalQuota)}`}
        actions={
          <>
            <SearchBar value={search} onChange={setSearch} onSearch={refresh} onRefresh={refresh} placeholder={t('搜索兑换码...')} />
            <Tooltip title={t('更多')}>
              <IconButton onClick={(e) => setMoreAnchor(e.currentTarget)}><MoreVert /></IconButton>
            </Tooltip>
            <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
              <MenuItem onClick={exportCSV}><FileDownload fontSize="small" sx={{ mr: 1 }} />{t('导出 CSV')}</MenuItem>
              <MenuItem onClick={() => { setClearConfirmOpen(true); setMoreAnchor(null); }} sx={{ color: 'error.main' }}>
                <Delete fontSize="small" sx={{ mr: 1 }} />{t('清除已用')}
              </MenuItem>
            </Menu>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ ...defaultForm }); setDialogOpen(true); }}>{t('生成兑换码')}</Button>
          </>
        }
      />

      {selected.size > 0 && (
        <Card sx={{ mb: 1.5, p: 1.25, bgcolor: alpha(theme.palette.primary.main, 0.08), borderLeft: `3px solid ${theme.palette.primary.main}` }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Layers fontSize="small" color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
              {t('已选择')} {selected.size} {t('项')}
            </Typography>
            <Button size="small" startIcon={<ContentCopy />} onClick={batchCopyKeys}>{t('复制兑换码')}</Button>
            <Button size="small" startIcon={<ContentCopy />} onClick={batchCopyNames}>{t('复制名称')}</Button>
            <Button size="small" color="error" startIcon={<Delete />} onClick={askBatchDelete}>{t('批量删除')}</Button>
            <Button size="small" onClick={() => setSelected(new Set())}>{t('取消选择')}</Button>
          </Stack>
        </Card>
      )}

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={allOnPageSelected} indeterminate={someOnPageSelected} onChange={togglePage} />
                </TableCell>
                <TableCell>
                  <TableSortLabel active={orderBy === 'id'} direction={orderBy === 'id' ? order : 'desc'} onClick={() => handleSort('id')}>ID</TableSortLabel>
                </TableCell>
                <TableCell>{t('名称')}</TableCell>
                <TableCell>{t('状态')}</TableCell>
                <TableCell>
                  <TableSortLabel active={orderBy === 'quota'} direction={orderBy === 'quota' ? order : 'desc'} onClick={() => handleSort('quota')}>{t('额度')}</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel active={orderBy === 'created_time'} direction={orderBy === 'created_time' ? order : 'desc'} onClick={() => handleSort('created_time')}>{t('创建时间')}</TableSortLabel>
                </TableCell>
                <TableCell>{t('兑换时间')}</TableCell>
                <TableCell align="right">{t('操作')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableSkeleton rows={5} columns={8} /> :
                sorted.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>
                    <EmptyState icon={Redeem} title={t('暂无兑换码')} description={t('生成兑换码以供用户兑换额度')}
                      actionLabel={t('生成兑换码')} onAction={() => { setForm({ ...defaultForm }); setDialogOpen(true); }} />
                  </TableCell></TableRow>
                ) : sorted.map(item => {
                  const isSel = selected.has(item.id);
                  return (
                    <TableRow key={item.id} hover selected={isSel} sx={{ opacity: item.status === 3 ? 0.55 : 1, '& td': item.status === 3 ? { color: 'text.disabled' } : {} }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={isSel} onChange={() => toggleOne(item.id)} />
                      </TableCell>
                      <TableCell>{item.id}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                          icon={item.status === 1 ? <CheckCircleOutline sx={{ fontSize: 14 }} /> : item.status === 2 ? <Block sx={{ fontSize: 14 }} /> : undefined}
                          label={item.status === 1 ? t('未使用') : item.status === 2 ? t('已禁用') : t('已使用')}
                          size="small"
                          color={item.status === 1 ? 'success' : item.status === 2 ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{renderQuota(item.quota || 0)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{timestamp2string(item.created_time)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{item.redeemed_time ? timestamp2string(item.redeemed_time) : '-'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {item.key && (
                            <Tooltip title={t('复制兑换码')}>
                              <IconButton size="small" onClick={() => { copy(item.key); showSuccess(t('已复制')); }}>
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title={t('删除')}>
                            <IconButton size="small" color="error" onClick={() => { setDeleteTarget(item.id); setConfirmOpen(true); }}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage} onRowsPerPageChange={changeRowsPerPage} rowsPerPageOptions={[10, 20, 50, 100]} />
      </Card>

      <AnimatedDialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{t('生成兑换码')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label={t('名称')} value={form.name} onChange={set('name')} />
            <TextField fullWidth label={t('额度')} type="number" value={form.quota} onChange={set('quota')} />
            <TextField fullWidth label={t('生成数量')} type="number" value={form.count} onChange={set('count')} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('取消')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('生成')}
          </Button>
        </DialogActions>
      </AnimatedDialog>

      {/* Newly-generated keys dialog — copy them right after creation */}
      <AnimatedDialog open={!!keysDialog} onClose={() => setKeysDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('已生成兑换码')} · {keysDialog?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {t('请立即复制并保存，关闭后将无法再次显示完整列表。')}
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.78rem', maxHeight: 320, overflow: 'auto', whiteSpace: 'pre' }}>
            {(keysDialog?.keys || []).join('\n')}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { copy((keysDialog?.keys || []).join('\n')); showSuccess(t('已复制全部')); }} startIcon={<ContentCopy />}>
            {t('复制全部')}
          </Button>
          <Button variant="contained" onClick={() => setKeysDialog(null)}>{t('关闭')}</Button>
        </DialogActions>
      </AnimatedDialog>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete}
        title={deleteTarget === 'batch' ? `${t('批量删除兑换码')} (${selected.size})` : t('删除兑换码')}
        message={deleteTarget === 'batch'
          ? `${t('确定要删除选中的')} ${selected.size} ${t('个兑换码？此操作不可撤销。')}`
          : t('确定要删除此兑换码？此操作不可撤销。')}
        confirmLabel={t('删除')} />

      <ConfirmDialog open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)} onConfirm={handleDeleteInvalid}
        title={t('清除已用兑换码')} message={t('确定删除所有已使用的兑换码？此操作不可撤销。')} confirmLabel={t('清除')} />
    </Box>
  );
}
