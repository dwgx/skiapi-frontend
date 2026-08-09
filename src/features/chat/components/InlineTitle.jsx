// 顶栏会话标题：双击就地编辑。
//
// 为什么不用 window.prompt：原生弹窗会打断流程、样式不可控，而且在部分
// 浏览器/输入法组合下会抢焦点导致候选框行为异常。这里做成「点一下就能改」，
// 和 Claude Code 的标题编辑一致。
//
// 输入法（IME）兼容是这个组件的重点：
//
//   中日韩输入法在拼写阶段（composition）会把候选文字先放进 input，
//   此时按 Enter 是「确认候选词」而不是「提交表单」。如果直接监听 keydown
//   的 Enter 就提交，用户打「你好」按 Enter 选词时标题会被提前提交成拼音。
//
//   两道防线：
//     1. compositionstart/end 维护 composingRef，合成中忽略 Enter；
//     2. 再查 e.nativeEvent.isComposing —— 标准字段，Safari 上更可靠。
//
//   Escape 在合成中也不该取消编辑（那时应该只取消候选），所以同样跳过。

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Tooltip, alpha, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

const MAX_LEN = 80;

export default function InlineTitle({ title, onCommit }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef(null);
  const composingRef = useRef(false);

  // 进入编辑时把光标全选，方便直接覆盖输入
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  const startEdit = useCallback(() => {
    setDraft(title);
    setEditing(true);
  }, [title]);

  const commit = useCallback(() => {
    const next = draft.trim().slice(0, MAX_LEN);
    setEditing(false);
    composingRef.current = false;
    // 空标题当作取消，不要把会话名清成空字符串
    if (next && next !== title) onCommit?.(next);
  }, [draft, title, onCommit]);

  const cancel = useCallback(() => {
    setEditing(false);
    composingRef.current = false;
    setDraft(title);
  }, [title]);

  const onKeyDown = useCallback((e) => {
    // 输入法合成中：Enter/Escape 归输入法，不做提交/取消
    const composing = composingRef.current || e.nativeEvent?.isComposing;
    if (composing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }, [commit, cancel]);

  if (editing) {
    return (
      <Box
        component="input"
        ref={inputRef}
        value={draft}
        maxLength={MAX_LEN}
        aria-label={t('会话名称')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => { composingRef.current = false; }}
        // 失焦即提交（点别处就保存，符合就地编辑的直觉）
        onBlur={commit}
        sx={{
          fontFamily: 'inherit',
          fontSize: '0.84rem',
          fontWeight: 600,
          color: 'text.primary',
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.45),
          borderRadius: 0.75,
          outline: 'none',
          px: 0.75, py: 0.25,
          width: { xs: 130, sm: 230, md: 330 },
          minWidth: 0,
        }}
      />
    );
  }

  return (
    <Tooltip title={t('双击重命名')} arrow>
      <Typography
        onDoubleClick={startEdit}
        sx={{
          fontSize: '0.84rem', fontWeight: 600,
          maxWidth: { xs: 120, sm: 220, md: 320 },
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          cursor: 'text', userSelect: 'none',
          px: 0.75, py: 0.25, borderRadius: 0.75,
          border: '1px solid transparent',
          transition: 'background-color 150ms',
          '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.06) },
        }}
      >
        {title}
      </Typography>
    </Tooltip>
  );
}
