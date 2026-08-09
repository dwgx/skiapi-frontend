// 消息气泡。用 key 定位（不是 index），支持思维链折叠、编辑重发、错误态。
// markdown 渲染沿用老 Playground 的安全组件（isSafeUrl/isSafeImageUrl，script/iframe 置空）。

import React, { useState } from 'react';
import {
  Box, Typography, IconButton, Tooltip, Avatar, TextField, Button, Stack, alpha, useTheme,
} from '@mui/material';
import {
  Person, ContentCopy, Delete, Edit, Refresh, Check, Close, ErrorOutline,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import ClaudeIcon, { CLAUDE_BRAND } from './ClaudeIcon';
import StreamingText from './StreamingText';
import { useTypewriterReveal } from '../hooks/useTypewriterReveal';
import { messageEnterSx, thinkingDotsSx } from '../lib/animations';
import ReasoningBlock from './ReasoningBlock';
import { MESSAGE_ROLES, MESSAGE_STATUS } from '../types';
import { isSafeImageUrl, isSafeUrl } from '../../../utils/security';
import { copy } from '../../../utils';

// 安全 markdown 组件表（沿用老 Playground 的策略，去掉可执行标签）
const MdComponents = {
  p: ({ children }) => (
    <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.8, mb: 0.8, '&:last-child': { mb: 0 } }}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => {
    const safe = isSafeUrl(href);
    return (
      <a
        href={safe ? href : undefined}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--accent, #0070F3)', textDecoration: 'underline dotted' }}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    if (!isSafeImageUrl(src)) return null;
    return (
      <Box
        component="img"
        src={src}
        alt={alt || ''}
        sx={{ maxWidth: '100%', maxHeight: 320, borderRadius: 2, my: 1, display: 'block', border: '1px solid', borderColor: 'divider' }}
      />
    );
  },
  code: ({ inline, className, children }) => {
    if (inline) {
      return (
        <code style={{ background: 'rgba(127,127,127,0.14)', borderRadius: 4, padding: '2px 6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          {children}
        </code>
      );
    }
    const lang = (className || '').replace('language-', '');
    return (
      <Box sx={{ position: 'relative', my: 1 }}>
        {lang && (
          <Typography variant="caption" sx={{ position: 'absolute', top: 6, right: 8, opacity: 0.6, fontSize: '0.65rem' }}>
            {lang}
          </Typography>
        )}
        <pre style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: 14, overflow: 'auto', fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>
          <code>{children}</code>
        </pre>
      </Box>
    );
  },
  ul: ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ol>,
  li: ({ children }) => <li style={{ fontSize: '0.875rem', lineHeight: 1.7, marginBottom: 2 }}>{children}</li>,
  blockquote: ({ children }) => (
    <Box sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 2, my: 1, opacity: 0.85 }}>{children}</Box>
  ),
  table: ({ children }) => (
    <Box
      component="table"
      sx={{ borderCollapse: 'collapse', width: '100%', my: 1, fontSize: '0.8rem', '& td, & th': { border: '1px solid', borderColor: 'divider', p: 0.8 } }}
    >
      {children}
    </Box>
  ),
  h1: ({ children }) => <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>{children}</Typography>,
  h2: ({ children }) => <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>{children}</Typography>,
  h3: ({ children }) => <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>{children}</Typography>,
  script: () => null,
  iframe: () => null,
  object: () => null,
  embed: () => null,
};

export default function ChatMessage({ message, onDelete, onRegenerate, onEditResend, isBusy }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');

  const isUser = message.from === MESSAGE_ROLES.USER;
  const isError = message.status === MESSAGE_STATUS.ERROR;
  const isPending =
    message.status === MESSAGE_STATUS.LOADING || message.status === MESSAGE_STATUS.STREAMING;

  // 流式打字机：只对「助手 + 非 markdown 的纯文本」启用。
  // markdown 消息走 ReactMarkdown 整块淡入，逐 chunk 拆 span 会破坏解析。
  const isStreamingAssistant = !isUser && isPending;
  const revealedLength = useTypewriterReveal(
    isStreamingAssistant ? message.content : '',
    isStreamingAssistant
  );

  const startEdit = () => {
    setEditText(message.content || '');
    setEditing(true);
  };

  const submitEdit = () => {
    const text = editText.trim();
    setEditing(false);
    if (text && text !== message.content) onEditResend?.(message.key, text);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.25, mb: 2, flexDirection: isUser ? 'row-reverse' : 'row', ...messageEnterSx }}>
      <Avatar
        sx={{
          width: 30, height: 30, flexShrink: 0,
          bgcolor: isUser ? 'primary.main' : alpha(CLAUDE_BRAND, 0.14),
          color: isUser ? 'primary.contrastText' : CLAUDE_BRAND,
        }}
      >
        {isUser ? <Person sx={{ fontSize: 17 }} /> : <ClaudeIcon size={16} color={CLAUDE_BRAND} />}
      </Avatar>

      <Box sx={{ maxWidth: '82%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* 思维链（仅助手） */}
        {!isUser && (message.reasoning?.content || message.isReasoningStreaming) && (
          <Box sx={{ width: '100%' }}>
            <ReasoningBlock
              reasoning={message.reasoning}
              isStreaming={message.isReasoningStreaming}
              durationMs={message.reasoning?.durationMs}
            />
          </Box>
        )}

        <Box
          sx={{
            px: 1.75, py: 1.25, borderRadius: 2.5, minWidth: 44,
            bgcolor: isError
              ? alpha(theme.palette.error.main, 0.09)
              : isUser
                // 用户消息：固定 SkiAPI 主蓝 + 白字。不随主题 accent 变 ——
                // 暗色主题的 accent 是柔紫 #A78BFA，白字在它上面对比度不足，
                // 这是"自己发的消息颜色怪"的根因（亮/暗两态都清晰）。
                ? '#0070F3'
                : alpha(theme.palette.text.primary, 0.055),
            color: isUser && !isError ? '#FFFFFF' : 'text.primary',
            border: isError ? '1px solid' : 'none',
            borderColor: isError ? alpha(theme.palette.error.main, 0.4) : 'transparent',
            wordBreak: 'break-word',
          }}
        >
          {editing ? (
            <Stack spacing={1} sx={{ minWidth: 260 }}>
              <TextField
                multiline
                fullWidth
                size="small"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Button size="small" startIcon={<Close sx={{ fontSize: 14 }} />} onClick={() => setEditing(false)}>
                  {t('取消')}
                </Button>
                <Button size="small" variant="contained" startIcon={<Check sx={{ fontSize: 14 }} />} onClick={submitEdit}>
                  {t('保存并重发')}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <>
              {/* 用户上传的图片 */}
              {message.images?.length > 0 && (
                <Stack direction="row" spacing={0.75} sx={{ mb: 0.75, flexWrap: 'wrap' }}>
                  {message.images.map((img, i) =>
                    isSafeImageUrl(img.image_url?.url) ? (
                      <Box
                        key={i}
                        component="img"
                        src={img.image_url.url}
                        alt=""
                        sx={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 1.5 }}
                      />
                    ) : null
                  )}
                </Stack>
              )}

              {isError ? (
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <ErrorOutline sx={{ fontSize: 16, color: 'error.main', mt: '2px' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'error.main', fontWeight: 500 }}>
                      {message.errorMessage || t('请求失败')}
                    </Typography>
                    {message.errorCode && (
                      <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                        {message.errorCode}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ) : isUser ? (
                <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </Typography>
              ) : isStreamingAssistant && message.content ? (
                // 流式中：走打字机（新 chunk 浮现 + 末尾光标）。
                // 刻意不在流式期间跑 markdown —— 半截的 ``` 或 | 表格会被解析成
                // 残缺 AST，画面会跳。流完之后下面那个分支再渲染 markdown。
                <StreamingText
                  content={message.content}
                  isStreaming
                  revealedLength={revealedLength}
                />
              ) : message.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MdComponents} skipHtml>
                  {message.content}
                </ReactMarkdown>
              ) : isPending ? (
                // 还没吐第一个字：三点跳动等待态
                <Box sx={{ ...thinkingDotsSx, py: 0.5, opacity: 0.7 }}>
                  <span />
                  <span />
                  <span />
                </Box>
              ) : null}
            </>
          )}
        </Box>

        {/* 操作条 */}
        {!editing && !isPending && (
          <Stack direction="row" spacing={0.25} sx={{ mt: 0.4, opacity: 0.55, '&:hover': { opacity: 1 } }}>
            {message.content && (
              <Tooltip title={t('复制')}>
                <IconButton size="small" sx={{ p: 0.35 }} onClick={() => copy(message.content)}>
                  <ContentCopy sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            )}
            {isUser && (
              <Tooltip title={t('编辑并重发')}>
                <IconButton size="small" sx={{ p: 0.35 }} onClick={startEdit} disabled={isBusy}>
                  <Edit sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            )}
            {!isUser && (
              <Tooltip title={t('重新生成')}>
                <IconButton size="small" sx={{ p: 0.35 }} onClick={() => onRegenerate?.(message.key)} disabled={isBusy}>
                  <Refresh sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('删除')}>
              <IconButton size="small" sx={{ p: 0.35 }} onClick={() => onDelete?.(message.key)} disabled={isBusy}>
                <Delete sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
