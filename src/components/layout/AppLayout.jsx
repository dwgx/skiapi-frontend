import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Divider, Typography, IconButton, useMediaQuery, useTheme, Collapse,
  Tooltip, alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon, VpnKey, BarChart, Palette, TaskAlt,
  People, Settings, AccountBalanceWallet, ManageAccounts, Redeem,
  RocketLaunch, Chat as ChatIcon,
  ExpandLess, ExpandMore, Menu as MenuIcon, CardMembership,
  ChevronLeft, Terminal, Layers, Inventory2, OpenInNew,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import TopBar from './TopBar';
import AnimatedPage from '../common/AnimatedPage';
import CommandPalette from '../common/CommandPalette';
import { useAuth } from '../../contexts/AuthContext';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

const chatSection = [
  { key: 'playground', label: '操练场', icon: <Terminal />, path: '/console/playground', auth: 'user' },
  { key: 'chat', label: '聊天', icon: <ChatIcon />, path: '/console/chat', auth: 'user', dynamic: true },
];

const consoleSection = [
  { key: 'detail', label: '数据看板', icon: <DashboardIcon />, path: '/console', auth: 'user', cond: 'enable_data_export' },
  { key: 'token', label: '令牌管理', icon: <VpnKey />, path: '/console/token', auth: 'user' },
  { key: 'log', label: '使用日志', icon: <BarChart />, path: '/console/log', auth: 'user' },
  { key: 'midjourney', label: '绘图日志', icon: <Palette />, path: '/console/midjourney', auth: 'user', cond: 'enable_drawing' },
  { key: 'task', label: '任务日志', icon: <TaskAlt />, path: '/console/task', auth: 'user', cond: 'enable_task' },
];

const personalSection = [
  { key: 'topup', label: '钱包管理', icon: <AccountBalanceWallet />, path: '/console/topup', auth: 'user' },
  { key: 'personal', label: '个人设置', icon: <ManageAccounts />, path: '/console/personal', auth: 'user' },
];

const adminSection = [
  { key: 'channel', label: '渠道管理', icon: <Layers />, path: '/console/channel', auth: 'admin' },
  { key: 'subscription', label: '订阅管理', icon: <CardMembership />, path: '/console/subscription', auth: 'admin' },
  { key: 'models', label: '模型管理', icon: <Inventory2 />, path: '/console/models', auth: 'admin' },
  { key: 'deployment', label: '模型部署', icon: <RocketLaunch />, path: '/console/deployment', auth: 'admin' },
  { key: 'redemption', label: '兑换码管理', icon: <Redeem />, path: '/console/redemption', auth: 'admin' },
  { key: 'user', label: '用户管理', icon: <People />, path: '/console/user', auth: 'admin' },
  { key: 'setting', label: '系统设置', icon: <Settings />, path: '/console/setting', auth: 'root' },
];

function SidebarSection({ title, items, collapsed, selectedKey, onNav, user, t }) {
  const filtered = items.filter(item => {
    if (item.auth === 'admin' && !(user?.role >= 10)) return false;
    if (item.auth === 'root' && !(user?.role >= 100)) return false;
    if (item.cond && localStorage.getItem(item.cond) !== 'true') return false;
    return true;
  });
  if (filtered.length === 0) return null;
  return (
    <Box sx={{ mb: 0.5 }}>
      {!collapsed && (
        <Typography variant="caption" sx={{ px: 3, py: 1, display: 'block', color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {title}
        </Typography>
      )}
      <List dense disablePadding>
        {filtered.map(item => (
          <Tooltip key={item.key} title={collapsed ? t(item.label) : ''} placement="right">
            <ListItemButton
              selected={selectedKey === item.key}
              onClick={() => onNav(item.path)}
              sx={{ minHeight: 40, justifyContent: collapsed ? 'center' : 'initial', px: collapsed ? 2.5 : 2 }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center', color: selectedKey === item.key ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={t(item.label)} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: selectedKey === item.key ? 600 : 400 }} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Box>
  );
}

export default function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const selectedKey = useMemo(() => {
    const path = location.pathname;
    const all = [...chatSection, ...consoleSection, ...personalSection, ...adminSection];
    // Exact match first
    const exact = all.find(i => i.path === path);
    if (exact) return exact.key;
    // Prefix match
    const prefix = all.filter(i => path.startsWith(i.path)).sort((a, b) => b.path.length - a.path.length);
    return prefix[0]?.key || 'detail';
  }, [location.pathname]);

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, minHeight: 56, cursor: 'pointer' }}
        onClick={() => navigate('/')}>
        {!collapsed ? (
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', flexGrow: 1, fontSize: '1.1rem', '&:hover': { opacity: 0.8 } }}>
            SKIAPI
          </Typography>
        ) : (
          <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.9rem', mx: 'auto' }}>S</Typography>
        )}
      </Box>
      <Divider />
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        <SidebarSection title={t('聊天')} items={chatSection} collapsed={collapsed} selectedKey={selectedKey} onNav={handleNav} user={user} t={t} />
        <Divider sx={{ my: 0.5, mx: 2 }} />
        <SidebarSection title={t('控制台')} items={consoleSection} collapsed={collapsed} selectedKey={selectedKey} onNav={handleNav} user={user} t={t} />
        <Divider sx={{ my: 0.5, mx: 2 }} />
        <SidebarSection title={t('个人中心')} items={personalSection} collapsed={collapsed} selectedKey={selectedKey} onNav={handleNav} user={user} t={t} />
        {user?.role >= 10 && <Divider sx={{ my: 0.5, mx: 2 }} />}
        <SidebarSection title={t('管理员')} items={adminSection} collapsed={collapsed} selectedKey={selectedKey} onNav={handleNav} user={user} t={t} />
        {/* Classic UI — always accessible for all users (emergency fallback) */}
        <Divider sx={{ my: 0.5, mx: 2 }} />
        <List dense disablePadding>
          <Tooltip title={collapsed ? t('经典 UI') : ''} placement="right">
            <ListItemButton
              component="a"
              href="/legacy/"
              sx={{ minHeight: 40, justifyContent: collapsed ? 'center' : 'initial', px: collapsed ? 2.5 : 2, opacity: 0.7, '&:hover': { opacity: 1 } }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center', color: 'text.secondary' }}>
                <OpenInNew sx={{ fontSize: 20 }} />
              </ListItemIcon>
              {!collapsed && <ListItemText primary={t('经典 UI')} primaryTypographyProps={{ fontSize: '0.875rem', color: 'text.secondary' }} />}
            </ListItemButton>
          </Tooltip>
        </List>
      </Box>
      <Divider />
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <IconButton size="small" onClick={() => setCollapsed(c => !c)}>
          <ChevronLeft sx={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CommandPalette />
      {/* Desktop drawer */}
      {!isMobile && (
        <Drawer variant="permanent" sx={{
          width: drawerWidth, flexShrink: 0, transition: 'width 0.2s',
          '& .MuiDrawer-paper': { width: drawerWidth, transition: 'width 0.2s', boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' },
        }}>
          {drawerContent}
        </Drawer>
      )}
      {/* Mobile drawer */}
      {isMobile && (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
          {drawerContent}
        </Drawer>
      )}
      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar onMenuClick={() => isMobile ? setMobileOpen(true) : setCollapsed(c => !c)} />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, maxWidth: 1400, width: '100%', mx: 'auto', overflow: 'hidden' }}>
          <AnimatedPage><Outlet /></AnimatedPage>
        </Box>
      </Box>
    </Box>
  );
}

