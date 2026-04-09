import React, { useState } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Chip, IconButton, Tooltip,
} from '@mui/material';
import { Delete, RocketLaunch } from '@mui/icons-material';
import { API } from '../api';
import { showError, showSuccess, timestamp2string } from '../utils';
import usePaginatedList from '../hooks/usePaginatedList';
import PageHeader from '../components/common/PageHeader';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import TableSkeleton from '../components/common/TableSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useTranslation } from 'react-i18next';

export default function ModelDeployment() {
  const { t } = useTranslation();
  const { items: deployments, loading, page, setPage, rowsPerPage, changeRowsPerPage, total, search, setSearch, refresh } =
    usePaginatedList('/api/deployments/', { searchEndpoint: '/api/deployments/search' });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = async () => {
    try {
      const res = await API.delete(`/api/deployments/${deleteTarget}`);
      if (res.data.success) { showSuccess(t('删除成功')); refresh(); }
      else showError(res.data.message);
    } catch (err) { showError(err); }
    setConfirmOpen(false);
  };

  return (
    <Box>
      <PageHeader icon={RocketLaunch} title={t('模型部署')} subtitle={`共 ${total} 个部署`}
        actions={
          <SearchBar value={search} onChange={setSearch} onSearch={refresh} onRefresh={refresh} placeholder={t('搜索部署...')} />
        }
      />
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>ID</TableCell>
              <TableCell>{t('名称')}</TableCell>
              <TableCell>{t('模型')}</TableCell>
              <TableCell>{t('状态')}</TableCell>
              <TableCell>{t('创建时间')}</TableCell>
              <TableCell align="right">{t('操作')}</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {loading ? <TableSkeleton rows={5} columns={6} /> :
                deployments.length === 0 ? (
                  <TableRow><TableCell colSpan={6}>
                    <EmptyState icon={RocketLaunch} title={t('暂无部署')} description={t('创建模型部署以使用自定义模型服务')} />
                  </TableCell></TableRow>
                ) : deployments.map(d => (
                  <TableRow key={d.id} hover>
                    <TableCell>{d.id}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{d.name || '-'}</TableCell>
                    <TableCell><Chip label={d.model || '-'} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={d.status || '-'} size="small" color={d.status === 'running' ? 'success' : 'default'} /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{timestamp2string(d.created_at)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('删除')}>
                        <IconButton size="small" color="error" onClick={() => { setDeleteTarget(d.id); setConfirmOpen(true); }}>
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

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete}
        title={t('删除部署')} message={t('确定要删除此部署？此操作不可撤销。')} confirmLabel={t('删除')} />
    </Box>
  );
}
