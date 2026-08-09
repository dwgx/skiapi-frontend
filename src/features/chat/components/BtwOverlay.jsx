// BTW 并行侧问浮层。参考 Claude Code /btw：
//   - 主回复生成中可触发，侧问独立运行，不打断主流
//   - 答案不进对话历史，显示在可关闭浮层
//   - 无工具访问，只有当前上下文可见性
//
// 交互：Space/Enter/Esc 关闭；Up/Down 滚动；左侧显示历史侧问。

import React, { useEffect, useRef } from 'react';
import { Box, Typography, IconButton, Tooltip, alpha, useTheme, CircularProgress } from '@mui/material';
import { Close, Psychology } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function BtwOverlay({ open, onClose, question, answer, loading, error }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: 0 });
  }, [open, answer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      // 用户正在输入框/文本域里打字时不劫持按键 —— 否则主输入框按 Enter
      // 想发消息会被这里吞掉变成"关浮层"，空格也会吞掉页面滚动。
      const tag = e.target?.tagName;
      const typing =
        tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
      if (typing) {
        // 只有 Esc 允许在输入态关闭浮层
        if (e.key === 'Escape') onClose();
        return;
      }
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        right: 16, bottom: 90,
        width: 380, maxWidth: 'calc(100vw - 32px)',
        maxHeight: '50vh',
        borderRadius: 2.5,
        bgcolor: alpha(theme.palette.background.paper, 0.92),
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.25),
        boxShadow: theme.shadows[8],
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
      }}
      role="dialog"
      aria-label={t('旁路快速提问')}
    >
      {/* 标题 */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.25, py: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, 0.05),
        }}
      >
        <Psychology sx={{ fontSize: 14, color: 'primary.main' }} />
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', flex: 1 }}>
          {t('旁路快速提问')}
        </Typography>
        <Tooltip title={t('关闭（Esc）')}>
          <IconButton size="small" onClick={onClose} aria-label={t('关闭')}>
            <Close sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 问题 */}
      {question && (
        <Box sx={{ px: 1.25, pt: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.82rem', fontWeight: 600, color: 'text.primary',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          >
            {question}
          </Typography>
        </Box>
      )}

      {/* 答案区 */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 1.25, py: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {t('正在回答…')}
            </Typography>
          </Box>
        ) : error ? (
          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'error.main' }}>
            {error}
          </Typography>
        ) : answer ? (
          <Typography
            variant="body2"
            component="pre"
            sx={{
              fontSize: '0.8rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'text.primary', m: 0,
            }}
          >
            {answer}
          </Typography>
        ) : null}
      </Box>

      {/* 底部提示 */}
      <Box sx={{ px: 1.25, py: 0.5, borderTop: '1px solid', borderColor: 'divider', opacity: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '0.62rem' }}>
          {t('Esc / Enter 关闭 · 该问答不会加入对话历史')}
        </Typography>
      </Box>
    </Box>
  );
}
