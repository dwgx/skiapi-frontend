import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog, DialogContent, TextField, List, ListItemButton, ListItemIcon,
  ListItemText, Typography, Box, Chip, alpha, useTheme, InputAdornment,
  Divider,
} from '@mui/material';
import {
  Search, Dashboard, VpnKey, BarChart, Layers, People, Settings, Inventory2,
  AccountBalanceWallet, ManageAccounts, Terminal, Palette, TaskAlt,
  Redeem, RocketLaunch, CardMembership, StorefrontOutlined, Chat,
  Add, ContentCopy, OpenInNew,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { copy } from '../../utils';

const COMMANDS = [
  { id: 'dashboard', label: '数据看板', desc: '查看统计和图表', icon: Dashboard, path: '/console', section: '导航' },
  { id: 'token', label: '令牌管理', desc: '管理 API 密钥', icon: VpnKey, path: '/console/token', section: '导航' },
  { id: 'log', label: '使用日志', desc: '查看请求记录', icon: BarChart, path: '/console/log', section: '导航' },
  { id: 'channel', label: '渠道管理', desc: '管理模型渠道', icon: Layers, path: '/console/channel', section: '导航', admin: true },
  { id: 'user', label: '用户管理', desc: '管理用户账号', icon: People, path: '/console/user', section: '导航', admin: true },
  { id: 'playground', label: '操练场', desc: 'AI 模型测试', icon: Terminal, path: '/console/playground', section: '导航' },
  { id: 'chat', label: '聊天', desc: 'AI 对话', icon: Chat, path: '/console/chat', section: '导航' },
  { id: 'topup', label: '钱包管理', desc: '充值和余额', icon: AccountBalanceWallet, path: '/console/topup', section: '导航' },
  { id: 'personal', label: '个人设置', desc: '账号和安全', icon: ManageAccounts, path: '/console/personal', section: '导航' },
  { id: 'pricing', label: '模型广场', desc: '查看模型定价', icon: StorefrontOutlined, path: '/pricing', section: '导航' },
  { id: 'model', label: '模型管理', desc: '配置可用模型', icon: Inventory2, path: '/console/models', section: '导航', admin: true },
  { id: 'deployment', label: '模型部署', desc: '管理部署配置', icon: RocketLaunch, path: '/console/deployment', section: '导航', admin: true },
  { id: 'subscription', label: '订阅管理', desc: '管理订阅套餐', icon: CardMembership, path: '/console/subscription', section: '导航', admin: true },
  { id: 'redemption', label: '兑换码管理', desc: '生成和管理兑换码', icon: Redeem, path: '/console/redemption', section: '导航', admin: true },
  { id: 'midjourney', label: '绘图日志', desc: 'Midjourney 记录', icon: Palette, path: '/console/midjourney', section: '导航' },
  { id: 'task', label: '任务日志', desc: '异步任务记录', icon: TaskAlt, path: '/console/task', section: '导航' },
  { id: 'setting', label: '系统设置', desc: '系统参数配置', icon: Settings, path: '/console/setting', section: '导航', admin: true },
  // Quick actions
  { id: 'new-token', label: '创建令牌', desc: '快速创建新 API 密钥', icon: Add, path: '/console/token?action=create', section: '快捷操作' },
  { id: 'copy-api', label: '复制 API 地址', desc: window.location.origin, icon: ContentCopy, action: 'copy-api', section: '快捷操作' },
  { id: 'open-docs', label: '打开文档', desc: '查看 API 使用文档', icon: OpenInNew, action: 'open-docs', section: '快捷操作' },
];

export default function CommandPalette() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
        setSelectedIdx(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q) ||
      t(c.label).toLowerCase().includes(q) ||
      t(c.desc).toLowerCase().includes(q) ||
      c.id.includes(q)
    );
  }, [query, t]);

  const handleSelect = (cmd) => {
    setOpen(false);
    if (cmd.path) {
      navigate(cmd.path);
    } else if (cmd.action === 'copy-api') {
      copy(window.location.origin);
    } else if (cmd.action === 'open-docs') {
      window.open('https://docs.newapi.pro', '_blank');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) { handleSelect(filtered[selectedIdx]); }
  };

  // Group by section
  const sections = useMemo(() => {
    const groups = {};
    filtered.forEach((c, i) => {
      if (!groups[c.section]) groups[c.section] = [];
      groups[c.section].push({ ...c, globalIdx: i });
    });
    return groups;
  }, [filtered]);

  const isDark = theme.palette.mode === 'dark';

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: {
        mt: '-10vh',
        bgcolor: alpha(theme.palette.background.paper, isDark ? 0.92 : 0.97),
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
        boxShadow: `0 20px 60px ${alpha('#000', isDark ? 0.5 : 0.15)}, 0 0 0 1px ${alpha(theme.palette.divider, 0.1)}`,
      } }}
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(12px)', bgcolor: alpha('#000', isDark ? 0.6 : 0.35) } } }}
    >
      <Box sx={{ p: 2, pb: 0 }}>
        <TextField fullWidth autoFocus placeholder={t('搜索页面或操作... (Ctrl+K)')}
          value={query} onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
          onKeyDown={handleKeyDown} ref={inputRef}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
            endAdornment: <Chip label="ESC" size="small" variant="outlined" sx={{
              fontSize: '0.6rem', height: 20, fontWeight: 600, letterSpacing: '0.04em',
              borderColor: alpha(theme.palette.divider, 0.6),
            }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, isDark ? 0.5 : 0.7),
              fontSize: '0.9rem',
              '&.Mui-focused': {
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
              },
            },
          }}
        />
      </Box>
      <Divider sx={{ mt: 1.5, opacity: 0.5 }} />
      <DialogContent sx={{ p: 1, pt: 0.5, maxHeight: 420 }}>
        {filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
            <Search sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2">{t('没有找到匹配的页面或操作')}</Typography>
          </Box>
        )}
        <List dense disablePadding>
          {Object.entries(sections).map(([section, items]) => (
            <React.Fragment key={section}>
              <Typography variant="caption" sx={{
                px: 2, pt: 1.5, pb: 0.5, display: 'block',
                color: 'text.secondary', fontWeight: 700,
                fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {t(section)}
              </Typography>
              {items.map((cmd) => {
                const isSelected = cmd.globalIdx === selectedIdx;
                return (
                  <ListItemButton key={cmd.id} selected={isSelected}
                    onClick={() => handleSelect(cmd)}
                    sx={{
                      borderRadius: 2.5, mx: 1, mb: 0.25, py: 0.75,
                      transition: 'all 0.15s ease',
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.08),
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
                      },
                      '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
                    }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: isSelected
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.text.primary, 0.05),
                        transition: 'all 0.15s ease',
                      }}>
                        <cmd.icon sx={{
                          fontSize: 16,
                          color: isSelected ? 'primary.main' : 'text.secondary',
                        }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={t(cmd.label)}
                      secondary={cmd.action ? cmd.desc : t(cmd.desc)}
                      primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 500 }}
                      secondaryTypographyProps={{ fontSize: '0.68rem', sx: { opacity: 0.7 } }}
                    />
                    {isSelected && (
                      <Typography variant="caption" sx={{
                        fontSize: '0.6rem', color: 'text.disabled', fontWeight: 500,
                      }}>
                        ↵
                      </Typography>
                    )}
                  </ListItemButton>
                );
              })}
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
