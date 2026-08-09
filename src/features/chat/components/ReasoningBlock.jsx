// 思维链折叠块。对标 New API 的 reasoning.tsx，用 MUI 重写。
// 流式中显示 shimmer 动画 + 自动展开；结束后折叠并显示耗时。

import React, { useState } from 'react';
import { Box, Collapse, Typography, IconButton, alpha, useTheme } from '@mui/material';
import { ExpandMore, Psychology } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function ReasoningBlock({ reasoning, isStreaming, durationMs }) {
  const theme = useTheme();
  const { t } = useTranslation();
  // 折叠态是派生值：用户没手动点过就跟随流式状态（流式展开、结束收起）。
  // 用 null 表示"未手动干预"，避免在 effect 里 setState 造成级联渲染。
  const [manualOpen, setManualOpen] = useState(null);
  const open = manualOpen ?? Boolean(isStreaming);

  const toggle = () => setManualOpen(!open);

  const content = reasoning?.content?.trim();
  if (!content) return null;

  const seconds =
    typeof durationMs === 'number' && durationMs > 0
      ? (durationMs / 1000).toFixed(1)
      : null;

  return (
    <Box
      sx={{
        mb: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.25),
        background: alpha(theme.palette.primary.main, 0.04),
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={t('思考过程')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          px: 1.25, py: 0.75, cursor: 'pointer',
          '&:hover': { background: alpha(theme.palette.primary.main, 0.07) },
        }}
      >
        <Psychology sx={{ fontSize: 15, color: 'primary.main' }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600, color: 'primary.main', fontSize: '0.72rem',
            ...(isStreaming && {
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 25%, ${alpha(theme.palette.primary.main, 0.35)} 50%, ${theme.palette.primary.main} 75%)`,
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'reasoningShimmer 1.6s linear infinite',
              '@keyframes reasoningShimmer': {
                '0%': { backgroundPosition: '200% 0' },
                '100%': { backgroundPosition: '-200% 0' },
              },
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
                WebkitTextFillColor: theme.palette.primary.main,
              },
            }),
          }}
        >
          {isStreaming ? t('正在思考…') : t('思考过程')}
          {!isStreaming && seconds ? ` · ${seconds}s` : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" sx={{ p: 0.25 }} tabIndex={-1} aria-hidden>
          <ExpandMore
            sx={{
              fontSize: 16,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: `transform ${theme.transitions.duration.shorter}ms`,
            }}
          />
        </IconButton>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          sx={{
            px: 1.5, pb: 1.25, pt: 0.25,
            borderTop: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.15),
          }}
        >
          <Typography
            variant="body2"
            component="pre"
            sx={{
              m: 0, fontSize: '0.78rem', lineHeight: 1.75,
              color: 'text.secondary',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'inherit',
            }}
          >
            {content}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
