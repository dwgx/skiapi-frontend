// 流式文本：把「已显示部分」和「刚到达的部分」拆开渲染。
// 刚到达的部分包在淡入+去模糊的 span 里（打字机观感），
// 流式末尾跟一个脉动光标。
//
// 注意：这个组件用于**纯文本**助手消息与用户消息。markdown 消息走
// ChatMessage 里的 ReactMarkdown 分支 —— markdown 流式解析时逐 token
// 拆 span 会破坏 AST 渲染，代价不值，那里做整块淡入。
//
// 必须用 MUI 的 sx 而不是 style：动画 keyframes 只有 sx（Emotion）能编译，
// 内联 style 不认 '@keyframes'。

import React from 'react';
import { Box, Typography } from '@mui/material';
import { textRevealSx, cursorSx } from '../lib/animations';

export default function StreamingText({ content, isStreaming, revealedLength, sx }) {
  const safeLen = Math.min(Math.max(revealedLength || 0, 0), content.length);
  const revealed = content.slice(0, safeLen);
  const fresh = content.slice(safeLen);

  return (
    <Typography
      component="div"
      variant="body2"
      sx={{
        fontSize: '0.875rem',
        lineHeight: 1.75,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...sx,
      }}
    >
      {revealed}
      {fresh && (
        <Box component="span" sx={textRevealSx}>
          {fresh}
        </Box>
      )}
      {isStreaming && <Box component="span" sx={cursorSx} aria-hidden="true" />}
    </Typography>
  );
}
