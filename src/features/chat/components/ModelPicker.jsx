// 模型选择器。居中浮窗（和设置面板同一种形态），顶部搜索框 + 列表铺开。
//
// 交互要点：
//   - 「最近使用」置顶：切过的模型记在 localStorage，下次排在最前面
//   - 搜索框自动聚焦，↑↓ 导航，Enter 确认，Esc 取消
//   - 当前模型打勾
//
// 为什么不用贴输入框的小气泡：模型有十几个，小气泡里滚动很难用，
// 而且和设置面板两种形态不统一。居中铺开更清楚。

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Typography, Dialog, InputBase, List, ListItemButton, ListItemText,
  alpha, useTheme, Divider, Chip,
} from '@mui/material';
import { Search, Check, History } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { loadRecentModels, pushRecentModel } from '../lib/recent-models';

export default function ModelPicker({ open, models, current, initialQuery = '', onPick, onClose }) {
  const theme = useTheme();
  const { t } = useTranslation();
  // initialQuery 作为初值 —— 调用方用 key 强制重挂来重置状态
  const [query, setQuery] = useState(initialQuery);
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  // 选中项引用：键盘上下键移动时把它滚进视野。
  // 之前没有这个，↑↓ 走到列表外面时高亮跟着走了、视口没动，
  // 看起来就像「选中框歪了/偏上」——其实是选中项已经滚出可视区。
  const activeItemRef = useRef(null);

  const recent = useMemo(() => (open ? loadRecentModels() : []), [open]);

  // 排序后的候选：最近使用置顶，其余保持传入顺序
  const ordered = useMemo(() => {
    const all = Array.isArray(models) ? models : [];
    const recentInList = recent.filter((m) => all.includes(m));
    const rest = all.filter((m) => !recentInList.includes(m));
    return { recentInList, rest, flat: [...recentInList, ...rest] };
  }, [models, recent]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered.flat;
    const starts = [];
    const contains = [];
    for (const m of ordered.flat) {
      const lower = m.toLowerCase();
      if (lower.startsWith(q)) starts.push(m);
      else if (lower.includes(q)) contains.push(m);
    }
    return [...starts, ...contains];
  }, [ordered, query]);

  // 打开时聚焦搜索框（纯 DOM 副作用）
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const picked = filtered[index];
        if (picked) {
          pushRecentModel(picked);
          onPick(picked);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, index, onPick]);

  // 选中项滚进视野。block:'nearest' 只在真的看不见时才滚 ——
  // 用 'center' 会让每次按键都把列表居中，跳动很晃眼。
  useEffect(() => {
    if (!open) return;
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [index, open]);

  const handlePick = (m) => {
    pushRecentModel(m);
    onPick(m);
  };

  // 最近使用在过滤后列表里的数量，用来插分隔线
  const recentShown = query.trim()
    ? 0
    : filtered.filter((m) => ordered.recentInList.includes(m)).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      {/* 顶部搜索框 */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Search sx={{ fontSize: 18, opacity: 0.5 }} />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
          placeholder={t('搜索模型…')}
          sx={{ flex: 1, fontSize: '0.9rem' }}
          inputProps={{ 'aria-label': t('搜索模型') }}
        />
        <Typography variant="caption" sx={{ fontSize: '0.68rem', opacity: 0.45, whiteSpace: 'nowrap' }}>
          {filtered.length} / {models?.length || 0}
        </Typography>
      </Box>

      {/* 列表 */}
      <List dense sx={{ maxHeight: 420, overflowY: 'auto', py: 0.5 }}>
        {filtered.length === 0 && (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.6, fontSize: '0.82rem' }}>
              {models?.length
                ? t('没有匹配的模型')
                : t('模型列表为空 —— 请确认已登录，且账号有可用分组')}
            </Typography>
          </Box>
        )}

        {filtered.map((m, i) => {
          const isRecent = !query.trim() && ordered.recentInList.includes(m);
          const showDivider = recentShown > 0 && i === recentShown;
          return (
            <React.Fragment key={m}>
              {showDivider && <Divider sx={{ my: 0.5 }} />}
              <ListItemButton
                // 选中项的 DOM 引用：键盘导航时要把它滚进视野
                ref={i === index ? activeItemRef : null}
                selected={i === index}
                onClick={() => handlePick(m)}
                onMouseEnter={() => setIndex(i)}
                sx={{
                  py: 0.85, px: 1.5, mx: 1, borderRadius: 1,
                  // 选中高亮用 border 而非纯背景色，暗色主题下更清楚
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.14),
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '0.84rem', fontFamily: 'monospace',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {m}
                      </Typography>
                      {isRecent && (
                        <Chip
                          icon={<History sx={{ fontSize: 11 }} />}
                          label={t('最近')}
                          size="small"
                          sx={{
                            height: 17, fontSize: '0.6rem', flexShrink: 0,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            '& .MuiChip-icon': { fontSize: 11, ml: 0.4 },
                          }}
                        />
                      )}
                    </Box>
                  }
                />
                {m === current && <Check sx={{ fontSize: 16, color: 'primary.main', ml: 1 }} />}
              </ListItemButton>
            </React.Fragment>
          );
        })}
      </List>

      {/* 底部提示 */}
      <Box
        sx={{
          px: 2, py: 0.85,
          borderTop: '1px solid', borderColor: 'divider',
          opacity: 0.5,
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.64rem' }}>
          {t('↑↓ 选择 · Enter 确认 · Esc 取消')}
        </Typography>
      </Box>
    </Dialog>
  );
}
