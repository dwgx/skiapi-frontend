import React, { useState, useEffect, useMemo } from 'react';
import {
  DialogTitle, DialogContent, DialogActions, Button, TextField, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
  Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  CircularProgress, Box, Typography, IconButton, Tooltip, Checkbox,
} from '@mui/material';
import { PlayArrow, Search, StopCircle } from '@mui/icons-material';
import AnimatedDialog from '../common/AnimatedDialog';
import { API } from '../../api';
import { showError, showSuccess } from '../../utils';
import { useTranslation } from 'react-i18next';

const ENDPOINT_TYPES = [
  { value: '', label: null, labelKey: '自动检测' },
  { value: 'openai', label: 'OpenAI (/v1/chat/completions)' },
  { value: 'openai-response', label: 'OpenAI Response (/v1/responses)' },
  { value: 'openai-response-compact', label: 'OpenAI Response Compaction (/v1/responses/compact)' },
  { value: 'anthropic', label: 'Anthropic (/v1/messages)' },
  { value: 'gemini', label: 'Gemini (/v1beta/models/{model}:generateContent)' },
  { value: 'jina-rerank', label: 'Jina Rerank (/v1/rerank)' },
  { value: 'image-generation', label: 'Image Generation (/v1/images/generations)' },
  { value: 'embeddings', label: 'Embeddings (/v1/embeddings)' },
];

const NO_STREAM_TYPES = ['embeddings', 'image-generation', 'jina-rerank', 'openai-response-compact'];

export default function ChannelTestDialog({ open, onClose, channel }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [endpointType, setEndpointType] = useState('');
  const [stream, setStream] = useState(false);
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState({});
  const [batchTesting, setBatchTesting] = useState(false);
  const stopRef = React.useRef(false);

  useEffect(() => {
    if (open) {
      setSearch('');
      setEndpointType('');
      setStream(false);
      setSelected([]);
      setResults({});
      setTesting({});
      setBatchTesting(false);
      stopRef.current = false;
    }
  }, [open, channel?.id]);

  useEffect(() => {
    if (NO_STREAM_TYPES.includes(endpointType) && stream) setStream(false);
  }, [endpointType, stream]);

  const models = useMemo(() => {
    if (!channel?.models) return [];
    return channel.models.split(',').map(m => m.trim()).filter(Boolean);
  }, [channel?.models]);

  const filtered = useMemo(() => {
    if (!search) return models;
    const q = search.toLowerCase();
    return models.filter(m => m.toLowerCase().includes(q));
  }, [models, search]);

  const testModel = async (model) => {
    setTesting(p => ({ ...p, [model]: true }));
    try {
      const params = { model };
      if (endpointType) params.endpoint_type = endpointType;
      if (stream) params.stream = 'true';
      const res = await API.get(`/api/channel/test/${channel.id}`, { params });
      const time = res.data.time != null ? (typeof res.data.time === 'number' && res.data.time < 10 ? (res.data.time * 1000).toFixed(0) : res.data.time) : null;
      setResults(p => ({ ...p, [model]: { success: res.data.success, message: res.data.message, time } }));
      if (res.data.success) showSuccess(`${model}: ${time}ms`);
    } catch (err) {
      setResults(p => ({ ...p, [model]: { success: false, message: String(err) } }));
    }
    setTesting(p => ({ ...p, [model]: false }));
  };

  const batchTest = async () => {
    const toTest = selected.length > 0 ? selected : filtered;
    if (toTest.length === 0) return;
    setBatchTesting(true);
    stopRef.current = false;
    setResults({});
    const concurrency = 5;
    let i = 0;
    const run = async () => {
      while (i < toTest.length && !stopRef.current) {
        const model = toTest[i++];
        await testModel(model);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, toTest.length) }, () => run()));
    setBatchTesting(false);
  };

  const stopBatch = () => { stopRef.current = true; };

  const toggleSelect = (m) => setSelected(s => s.includes(m) ? s.filter(x => x !== m) : [...s, m]);
  const toggleAll = () => setSelected(s => s.length === filtered.length ? [] : [...filtered]);

  return (
    <AnimatedDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('测试渠道')}: {channel?.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Controls */}
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>{t('端点类型')}</InputLabel>
              <Select value={endpointType} onChange={e => setEndpointType(e.target.value)} label={t('端点类型')}>
                {ENDPOINT_TYPES.map(ep => <MenuItem key={ep.value} value={ep.value}>{ep.labelKey ? t(ep.labelKey) : ep.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={stream} onChange={e => setStream(e.target.checked)}
                disabled={NO_STREAM_TYPES.includes(endpointType)} />}
              label="Stream"
            />
            <TextField size="small" placeholder={t('搜索模型...')} value={search}
              onChange={e => setSearch(e.target.value)} sx={{ minWidth: 180 }}
              slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 0.5, opacity: 0.5 }} /> } }} />
          </Stack>

          {/* Model table */}
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selected.length === filtered.length && filtered.length > 0}
                      indeterminate={selected.length > 0 && selected.length < filtered.length}
                      onChange={toggleAll} />
                  </TableCell>
                  <TableCell>{t('模型')}</TableCell>
                  <TableCell>{t('状态')}</TableCell>
                  <TableCell>{t('耗时')}</TableCell>
                  <TableCell align="right">{t('操作')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">{t('暂无模型')}</Typography>
                  </TableCell></TableRow>
                ) : filtered.map(m => {
                  const r = results[m];
                  const isTesting = testing[m];
                  return (
                    <TableRow key={m} hover>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={selected.includes(m)} onChange={() => toggleSelect(m)} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{m}</TableCell>
                      <TableCell>
                        {isTesting ? <Chip label={t('测试中')} size="small" color="warning" /> :
                          r ? (r.success ? <Chip label={t('成功')} size="small" color="success" /> :
                            <Tooltip title={r.message || ''}><Chip label={t('失败')} size="small" color="error" /></Tooltip>) :
                            <Chip label={t('未测试')} size="small" variant="outlined" />}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {r?.time != null ? `${r.time}ms` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => testModel(m)} disabled={isTesting || batchTesting}>
                          {isTesting ? <CircularProgress size={16} /> : <PlayArrow fontSize="small" />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary */}
          {Object.keys(results).length > 0 && (
            <Stack direction="row" spacing={1}>
              <Chip label={`${t('成功')}: ${Object.values(results).filter(r => r.success).length}`} size="small" color="success" variant="outlined" />
              <Chip label={`${t('失败')}: ${Object.values(results).filter(r => !r.success).length}`} size="small" color="error" variant="outlined" />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('关闭')}</Button>
        {batchTesting ? (
          <Button variant="outlined" color="error" startIcon={<StopCircle />} onClick={stopBatch}>{t('停止')}</Button>
        ) : (
          <Button variant="contained" startIcon={<PlayArrow />} onClick={batchTest}
            disabled={filtered.length === 0}>
            {selected.length > 0 ? `${t('测试选中')} (${selected.length})` : `${t('测试全部')} (${filtered.length})`}
          </Button>
        )}
      </DialogActions>
    </AnimatedDialog>
  );
}
