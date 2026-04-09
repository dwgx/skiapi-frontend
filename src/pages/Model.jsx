import React, { useState } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Chip, IconButton, Stack, Button, Tooltip,
  CircularProgress, DialogTitle, DialogContent, DialogActions, TextField,
  Grid,
} from '@mui/material';
import { Add, Edit, Delete, Inventory2 } from '@mui/icons-material';
import { API } from '../api';
import { showError, showSuccess } from '../utils';
import usePaginatedList from '../hooks/usePaginatedList';
import PageHeader from '../components/common/PageHeader';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import TableSkeleton from '../components/common/TableSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import AnimatedDialog from '../components/common/AnimatedDialog';
import { useTranslation } from 'react-i18next';

const defaultForm = { model_name: '', display_name: '', description: '', enabled: true };

export default function Model() {
  const { t } = useTranslation();
  const { items: models, loading, page, setPage, rowsPerPage, changeRowsPerPage, total, search, setSearch, refresh } =
    usePaginatedList('/api/models/', { searchEndpoint: '/api/models/search' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editModel, setEditModel] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openEdit = (m) => {
    setEditModel(m);
    setForm(m ? { ...m } : { ...defaultForm });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = editModel ? await API.put('/api/models/', form) : await API.post('/api/models/', form);
      if (res.data.success) { showSuccess(editModel ? t('更新成功') : t('创建成功')); setDialogOpen(false); refresh(); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      const res = await API.delete(`/api/models/${deleteTarget}`);
      if (res.data.success) { showSuccess(t('删除成功')); refresh(); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setConfirmOpen(false);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <Box>
      <PageHeader icon={Inventory2} title={t('模型管理')} subtitle={`${total} ${t('个模型')}`}
        actions={
          <>
            <SearchBar value={search} onChange={setSearch} onSearch={refresh} onRefresh={refresh} placeholder={t('搜索模型...')} />
            <Button variant="contained" startIcon={<Add />} onClick={() => openEdit(null)}>{t('添加模型')}</Button>
          </>
        }
      />
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>ID</TableCell>
              <TableCell>{t('模型名称')}</TableCell>
              <TableCell>{t('显示名称')}</TableCell>
              <TableCell>{t('描述')}</TableCell>
              <TableCell align="right">{t('操作')}</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {loading ? <TableSkeleton rows={5} columns={5} /> :
                models.length === 0 ? (
                  <TableRow><TableCell colSpan={5}>
                    <EmptyState icon={Inventory2} title={t('暂无模型')} description={t('添加模型以配置可用的 AI 模型')}
                      actionLabel={t('添加模型')} onAction={() => openEdit(null)} />
                  </TableCell></TableRow>
                ) : models.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell>{m.id}</TableCell>
                    <TableCell><Chip label={m.model_name} size="small" variant="outlined" /></TableCell>
                    <TableCell>{m.display_name || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>{m.description || '-'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={t('编辑')}><IconButton size="small" onClick={() => openEdit(m)}><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={t('删除')}><IconButton size="small" color="error" onClick={() => { setDeleteTarget(m.id); setConfirmOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
                      </Stack>
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
        <DialogTitle>{editModel ? t('编辑模型') : t('添加模型')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}><TextField fullWidth label={t('模型名称')} value={form.model_name} onChange={set('model_name')} /></Grid>
            <Grid size={12}><TextField fullWidth label={t('显示名称')} value={form.display_name || ''} onChange={set('display_name')} /></Grid>
            <Grid size={12}><TextField fullWidth label={t('描述')} value={form.description || ''} onChange={set('description')} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('取消')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : t('保存')}
          </Button>
        </DialogActions>
      </AnimatedDialog>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete}
        title={t('删除模型')} message={t('确定要删除此模型？此操作不可撤销。')} confirmLabel={t('删除')} />
    </Box>
  );
}
