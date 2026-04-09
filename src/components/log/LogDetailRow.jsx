import React from 'react';
import { TableRow, TableCell, Collapse, Box, Typography, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

function DetailItem({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={mono ? { fontFamily: 'monospace', fontSize: '0.8rem' } : undefined}>
        {value}
      </Typography>
    </Box>
  );
}

export default function LogDetailRow({ log, open, colSpan }) {
  const { t } = useTranslation();

  return (
    <TableRow>
      <TableCell sx={{ py: 0, borderBottom: open ? undefined : 'none' }} colSpan={colSpan}>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box sx={{ py: 2, px: 1 }}>
            {log.content && (
              <Box sx={{
                mb: 2, p: 1.5, borderRadius: 1,
                bgcolor: log.type === 5 ? 'error.main' : 'action.hover',
                color: log.type === 5 ? 'error.contrastText' : 'text.primary',
                opacity: log.type === 5 ? 0.9 : 1,
              }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  {log.type === 5 ? t('错误详情') : t('详细内容')}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {log.content}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <DetailItem label={t('请求耗时')} value={log.use_time ? `${log.use_time}ms` : null} mono />
              <DetailItem label={t('渠道')} value={log.channel_name ? `${log.channel_name} (#${log.channel})` : (log.channel || null)} mono />
              <DetailItem label={t('分组')} value={log.group} />
              <DetailItem label="IP" value={log.ip} mono />
              <DetailItem label={t('请求 ID')} value={log.request_id} mono />
              <DetailItem label={t('流式')} value={log.is_stream ? t('是') : t('否')} />
              <DetailItem label={t('令牌 ID')} value={log.token_id || null} mono />
              {log.other && <DetailItem label={t('其他')} value={log.other} />}
            </Stack>
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}
