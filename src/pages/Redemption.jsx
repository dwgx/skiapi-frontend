import React, { useState } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Chip, IconButton, Stack, Button, Tooltip,
  CircularProgress, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { Add, Delete, Redeem } from '@mui/icons-material';
import { API } from '../api';
import { showError, showSuccess, timestamp2string, renderQuota } from '../utils';
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
  const { items: data, loading, page, setPage, rowsPerPage, changeRowsPerPage, total, search, setSearch, refresh } =
    usePaginatedList('/api/redemption/', { searchEndpoint: '/api/redemption/search' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const handleDelete = async () => {
    try {
      const res = await API.delete(`/api/redemption/${deleteTarget}`);
      if (res.data.success) { showSuccess(t('删除成功')); refresh(); }
      else showError(res.data.message);
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
      if (res.data.success) { showSuccess(t('创建成功')); setDialogOpen(false); refresh(); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setSaving(false);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <Box>
      <PageHeader icon={Redeem} title={t('兑换码管理')} subtitle={`${t('共')} ${total} ${t('个兑换码')}`}
        actions={
          <>
            <SearchBar value={search} onChange={setSearch} onSearch={refresh} onRefresh={refresh} placeholder={t('搜索兑换码...')} />
            <Button variant="outlined" color="error" onClick={() => setClearConfirmOpen(true)}>{t('清除已用')}</Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ ...defaultForm }); setDialogOpen(true); }}>{t('生成兑换码')}</Button>
          </>
        }
      />
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>{t('名称')}</TableCell>
                <TableCell>{t('状态')}</TableCell>
                <TableCell>{t('额度')}</TableCell>
                <TableCell>{t('创建时间')}</TableCell>
                <TableCell>{t('兑换时间')}</TableCell>
                <TableCell align="right">{t('操作')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? <TableSkeleton rows={5} columns={7} /> :
                data.length === 0 ? (
                  <TableRow><TableCell colSpan={7}>
                    <EmptyState icon={Redeem} title={t('暂无兑换码')} description={t('生成兑换码以供用户兑换额度')}
                      actionLabel={t('生成兑换码')} onAction={() => { setForm({ ...defaultForm }); setDialogOpen(true); }} />
                  </TableCell></TableRow>
                ) : data.map(item => (
                  <TableRow key={item.id} hover sx={{ opacity: item.status === 3 ? 0.45 : 1, '& td': item.status === 3 ? { color: 'text.disabled' } : {} }}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                    <TableCell>
                      <Chip label={item.status === 1 ? t('未使用') : item.status === 2 ? t('已禁用') : t('已使用')} size="small"
                        color={item.status === 1 ? 'success' : item.status === 2 ? 'error' : 'default'} />
                    </TableCell>
                    <TableCell>{renderQuota(item.quota || 0)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{timestamp2string(item.created_time)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{item.redeemed_time ? timestamp2string(item.redeemed_time) : '-'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('删除')}>
                        <IconButton size="small" color="error" onClick={() => { setDeleteTarget(item.id); setConfirmOpen(true); }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage} onRowsPerPageChange={changeRowsPerPage} rowsPerPageOptions={[10, 20, 50]} />
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

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete}
        title={t('删除兑换码')} message={t('确定要删除此兑换码？此操作不可撤销。')} confirmLabel={t('删除')} />

      <ConfirmDialog open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)} onConfirm={handleDeleteInvalid}
        title={t('清除已用兑换码')} message={t('确定删除所有已使用的兑换码？此操作不可撤销。')} confirmLabel={t('清除')} />
    </Box>
  );
}
