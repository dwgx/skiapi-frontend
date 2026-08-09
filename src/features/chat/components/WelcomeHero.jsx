// 空会话的欢迎区。打字机效果放在这里（而不是输入框占位符）——
// 这里是视觉焦点，动效不抢输入注意力；输入框保持一句固定文案更稳。
//
// 入场动画分层次错开（logo → 标题 → 副标题 → 建议），参考 Claude Code
// 桌面端启动时的节奏：不是整块一起淡入，而是像逐步"醒过来"。
// 尊重 prefers-reduced-motion —— 关掉动画的用户直接看到最终状态。

import React, { useMemo } from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ClaudeIcon, { CLAUDE_BRAND } from './ClaudeIcon';
import { useTypewriterPlaceholder } from '../hooks/useTypewriterPlaceholder';

// 建议提示：点一下填进输入框
const SUGGESTIONS = [
  '解释这段代码做了什么',
  '帮我写一个 Python 脚本',
  '这个报错怎么修',
  '把这段文字润色一下',
];

export default function WelcomeHero({ signedIn, loading, onPickPrompt }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // 轮播的欢迎语。第一句是主文案，其余轮换。
  const phrases = useMemo(() => [
    t('今天我能为你提供什么帮助？'),
    t('有什么可以帮你？'),
    t('想聊点什么？'),
    t('需要我做什么？'),
  ], [t]);

  const typed = useTypewriterPlaceholder(phrases, true);

  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // 错开入场：每层延迟递增
  const rise = (delay) => (reduce ? {} : {
    animation: `skiRise 520ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`,
    '@keyframes skiRise': {
      from: { opacity: 0, transform: 'translateY(10px)' },
      to: { opacity: 1, transform: 'none' },
    },
  });

  return (
    <Box sx={{ textAlign: 'center', mt: { xs: 6, md: 12 }, px: 2 }}>
      {/* logo：轻微放大入场 + 呼吸感 */}
      <Box
        sx={{
          display: 'inline-flex', mb: 2,
          ...(reduce ? {} : {
            animation: 'skiLogoIn 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
            '@keyframes skiLogoIn': {
              from: { opacity: 0, transform: 'scale(0.82)' },
              to: { opacity: 1, transform: 'scale(1)' },
            },
          }),
        }}
      >
        <ClaudeIcon size={44} color={CLAUDE_BRAND} />
      </Box>

      {/* 打字机标题。min-height 固定住，避免文字长短变化把下面的内容顶来顶去 */}
      <Box sx={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', ...rise(120) }}>
        <Typography
          variant="h6"
          component="h1"
          sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}
          // 打字机对读屏是噪音，给一个稳定的可读标题
          aria-label={phrases[0]}
        >
          <Box component="span" aria-hidden="true">
            {typed}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: '2px', height: '1.05em',
                ml: '2px', verticalAlign: 'text-bottom',
                bgcolor: CLAUDE_BRAND,
                borderRadius: '1px',
                animation: 'skiCaretBlink 1.05s step-end infinite',
                '@keyframes skiCaretBlink': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0 },
                },
              }}
            />
          </Box>
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ opacity: 0.55, mt: 0.75, ...rise(240) }}>
        {t('Enter 发送，Shift+Enter 换行，可粘贴或上传图片')}
      </Typography>

      {/* 建议：点一下填进输入框 */}
      <Box
        sx={{
          display: 'flex', flexWrap: 'wrap', gap: 1,
          justifyContent: 'center', mt: 3,
          maxWidth: 560, mx: 'auto',
          ...rise(360),
        }}
      >
        {SUGGESTIONS.map((s, i) => (
          <Chip
            key={s}
            label={t(s)}
            size="small"
            clickable
            onClick={() => onPickPrompt?.(t(s))}
            sx={{
              fontSize: '0.75rem',
              borderRadius: 1,
              border: '1px solid',
              borderColor: alpha(theme.palette.text.primary, 0.12),
              bgcolor: 'transparent',
              transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms, border-color 160ms',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.07),
                borderColor: alpha(theme.palette.primary.main, 0.35),
                transform: reduce ? 'none' : 'translateY(-2px)',
              },
              ...(reduce ? {} : {
                animation: `skiChipIn 420ms cubic-bezier(0.16, 1, 0.3, 1) ${420 + i * 70}ms both`,
                '@keyframes skiChipIn': {
                  from: { opacity: 0, transform: 'translateY(8px) scale(0.96)' },
                  to: { opacity: 1, transform: 'none' },
                },
              }),
            }}
          />
        ))}
      </Box>

      {!signedIn && !loading && (
        <Chip
          label={t('请先在面板登录')}
          color="warning"
          variant="outlined"
          size="small"
          sx={{ mt: 3, ...rise(500) }}
        />
      )}
    </Box>
  );
}
