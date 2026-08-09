// 会话侧栏。多会话管理：新建 / 切换 / 重命名 / 导出 / 分享 / 删除。
// 会话数据存 localStorage（与消息同命名空间）。
// 导出与分享的安全说明见 lib/session-export.js 顶部注释。

import React, { useRef, useState } from 'react';
import {
  Box, List, ListItemButton, ListItemText, IconButton, Tooltip, TextField, Divider,
  Typography, alpha, useTheme, Menu, MenuItem, ListItemIcon,
} from '@mui/material';
import {
  Add, Delete, MoreVert, DriveFileRenameOutline, Download, Share, DataObject,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import SkiLogo from './SkiLogo';

export default function ChatSidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onExportMarkdown,
  onExportJson,
  onShare,
  open,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  // 输入法合成状态：合成中不把 Enter 当提交（见下方 onKeyDown）
  const composingRef = useRef(false);
  // 溢出菜单：记住是哪个会话触发的
  const [menu, setMenu] = useState({ el: null, id: null });

  const commitRename = (id) => {
    const title = editingText.trim();
    setEditingId(null);
    if (title) onRename(id, title);
  };

  const closeMenu = () => setMenu({ el: null, id: null });

  const runAndClose = (fn) => {
    const id = menu.id;
    closeMenu();
    if (id) fn?.(id);
  };

  return (
    <Box
      sx={{
        width: 264,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        borderRight: '1px solid',
        borderColor: 'divider',
        transition: 'margin-left 200ms',
        // 窄屏抽屉式
        ...(open ? {} : { display: 'none' }),
      }}
    >
      {/* 品牌 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.75 }}>
        <SkiLogo size={24} />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            SkiAPI Chat
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.6, lineHeight: 1.2, display: 'block' }}>
            {t('智能对话')}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* 新建按钮 */}
      <Box sx={{ p: 1 }}>
        <Box
          onClick={onNew}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 1.5,
            cursor: 'pointer', color: 'primary.main',
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
          }}
        >
          <Add sx={{ fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {t('新对话')}
          </Typography>
        </Box>
      </Box>

      {/* 会话列表 */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 1 }}>
        <List dense disablePadding>
          {sessions.map((s) => {
            const active = s.id === activeId;
            return (
              <ListItemButton
                key={s.id}
                onClick={() => onSelect(s.id)}
                onDoubleClick={() => {
                  setEditingId(s.id);
                  setEditingText(s.title);
                }}
                sx={{
                  borderRadius: 1.5, mb: 0.25, py: 0.75, px: 1,
                  bgcolor: active ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  '&:hover': { bgcolor: active ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.action.hover, 0.5) },
                }}
              >
                {editingId === s.id ? (
                  <TextField
                    size="small"
                    fullWidth
                    autoFocus
                    value={editingText}
                    inputProps={{ maxLength: 80, 'aria-label': t('会话名称') }}
                    onChange={(e) => setEditingText(e.target.value)}
                    // 输入法合成中（中文选词）按 Enter 是确认候选词，不能当提交，
                    // 否则拼音会被存成会话名。isComposing 是标准字段。
                    onCompositionStart={() => { composingRef.current = true; }}
                    onCompositionEnd={() => { composingRef.current = false; }}
                    onKeyDown={(e) => {
                      if (composingRef.current || e.nativeEvent?.isComposing) return;
                      if (e.key === 'Enter') commitRename(s.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => commitRename(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ '& .MuiInputBase-root': { py: 0.4 } }}
                  />
                ) : (
                  <ListItemText
                    primary={s.title}
                    primaryTypographyProps={{
                      fontSize: '0.82rem',
                      noWrap: true,
                      fontWeight: active ? 600 : 400,
                    }}
                    sx={{ my: 0 }}
                  />
                )}
                {editingId !== s.id && (
                  <Tooltip title={t('更多操作')}>
                    <IconButton
                      size="small"
                      aria-label={t('更多操作')}
                      sx={{ p: 0.3, opacity: active ? 0.6 : 0.35, '&:hover': { opacity: 1 } }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenu({ el: e.currentTarget, id: s.id });
                      }}
                    >
                      <MoreVert sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* 会话操作菜单 */}
      <Menu
        anchorEl={menu.el}
        open={Boolean(menu.el)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 176, borderRadius: 1.5 } } }}
      >
        <MenuItem
          dense
          onClick={() => {
            const id = menu.id;
            const s = sessions.find((x) => x.id === id);
            closeMenu();
            if (s) { setEditingId(s.id); setEditingText(s.title || ''); }
          }}
        >
          <ListItemIcon sx={{ minWidth: 30 }}><DriveFileRenameOutline sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>{t('重命名')}</ListItemText>
        </MenuItem>
        <MenuItem dense onClick={() => runAndClose(onExportMarkdown)}>
          <ListItemIcon sx={{ minWidth: 30 }}><Download sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>{t('导出 Markdown')}</ListItemText>
        </MenuItem>
        <MenuItem dense onClick={() => runAndClose(onExportJson)}>
          <ListItemIcon sx={{ minWidth: 30 }}><DataObject sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>{t('导出 JSON')}</ListItemText>
        </MenuItem>
        <MenuItem dense onClick={() => runAndClose(onShare)}>
          <ListItemIcon sx={{ minWidth: 30 }}><Share sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>{t('复制分享链接')}</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem dense onClick={() => runAndClose(onDelete)} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ minWidth: 30 }}><Delete sx={{ fontSize: 16, color: 'error.main' }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8rem' }}>{t('删除')}</ListItemText>
        </MenuItem>
      </Menu>

      <Divider />
      <Box sx={{ px: 2, py: 1.25, opacity: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '0.68rem' }}>
          {t('会话保存在本机浏览器')}
        </Typography>
      </Box>
    </Box>
  );
}
