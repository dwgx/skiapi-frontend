// 空会话的欢迎区。打字机效果放在这里（而不是输入框占位符）——
// 这里是视觉焦点，动效不抢输入注意力；输入框保持一句固定文案更稳。
//
// 入场动画分层次错开（logo → 标题 → 副标题 → 建议），参考 Claude Code
// 桌面端启动时的节奏：不是整块一起淡入，而是像逐步"醒过来"。
// 尊重 prefers-reduced-motion —— 关掉动画的用户直接看到最终状态。

import React, { useMemo, useState } from 'react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ClaudeIcon, { CLAUDE_BRAND } from './ClaudeIcon';
import { useTypewriterPlaceholder } from '../hooks/useTypewriterPlaceholder';

// 建议提示：点一下填进输入框
// 建议提示词池。分组是按真实使用分布来的，不是凭感觉：
// NBER Working Paper 34255（AI 助手实际用途研究）显示三大类占近 80% ——
// 实用建议(Practical Guidance) / 信息查询(Seeking Information) / 写作(Writing)，
// 且非工作用途已超 70%，**编程占比很小**。
// 早期这里四条全是编程向（解释代码/写脚本/修报错），正好押在占比最小的那类上。
//
// 每次进入随机抽 4 条展示，点「换一批」重抽 —— 固定四条看久了就是死的。
const SUGGESTION_POOL = [
  // 实用建议
  '帮我规划一份三天的旅行行程',
  '冰箱里有鸡蛋、番茄和面条，能做什么',
  '怎么和同事沟通一个我不同意的决定',
  '帮我制定一个可执行的健身计划',
  '房租合同里有哪些条款要特别注意',
  '怎么在两周内准备一场面试',
  // 信息查询 / 解释
  '用大白话解释一下什么是通货膨胀',
  '这两款手机怎么选，帮我列个对比',
  '为什么天空是蓝色的',
  '简单讲讲最近的 AI 进展',
  // 写作
  '帮我写一封得体的请假邮件',
  '把这段话改得更简洁专业',
  '给这篇文章起几个吸引人的标题',
  '帮我写一段朋友生日的祝福语',
  '把这份会议记录整理成要点',
  // 少量技术（占比小但存在）
  '这个报错是什么意思，怎么修',
  '帮我把这段逻辑写成 Python',
];

// 随机抽 n 条不重复
function pickSuggestions(pool, n) {
  const copy = [...pool];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

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

  // 展示的 4 条建议。首次随机抽，点「换一批」重抽。
  const [suggestions, setSuggestions] = useState(() => pickSuggestions(SUGGESTION_POOL, 4));
  const [shuffleSeq, setShuffleSeq] = useState(0); // 变化时重放入场动画
  const reshuffle = () => {
    setSuggestions(pickSuggestions(SUGGESTION_POOL, 4));
    setShuffleSeq((n) => n + 1);
  };

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
        {suggestions.map((s, i) => (
          <Chip
            key={`${shuffleSeq}-${s}`}
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

        {/* 换一批：从池子里重抽 4 条 */}
        <Chip
          icon={<Refresh sx={{ fontSize: 13 }} />}
          label={t('换一批')}
          size="small"
          clickable
          onClick={reshuffle}
          sx={{
            fontSize: '0.75rem',
            borderRadius: 1,
            border: '1px dashed',
            borderColor: alpha(theme.palette.text.primary, 0.18),
            bgcolor: 'transparent',
            color: 'text.secondary',
            transition: 'color 160ms, border-color 160ms',
            '& .MuiChip-icon': { ml: 0.5, color: 'inherit' },
            '&:hover': {
              color: 'primary.main',
              borderColor: alpha(theme.palette.primary.main, 0.4),
              bgcolor: 'transparent',
            },
          }}
        />
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
