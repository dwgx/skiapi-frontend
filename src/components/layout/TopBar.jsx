import React from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem,
  Divider, ListItemIcon, Chip, useTheme, Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon, DarkMode, LightMode, Logout, Person,
  Settings, AccountCircle, Search, Translate, Check,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { LANGUAGES } from '../../i18n';

export default function TopBar({ onMenuClick }) {
  const { user, logout, isAdmin } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [langEl, setLangEl] = React.useState(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <AppBar position="sticky" elevation={0} sx={{
      bgcolor: 'background.paper', color: 'text.primary',
      borderBottom: '1px solid', borderColor: 'divider',
    }}>
      <Toolbar sx={{ minHeight: 56 }}>
        <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 1 }}>
          <MenuIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <Chip icon={<Search sx={{ fontSize: 16 }} />} label={t('搜索') + ' Ctrl+K'} size="small" variant="outlined"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          sx={{ mr: 1.5, cursor: 'pointer', opacity: 0.6, '&:hover': { opacity: 1 }, fontSize: '0.75rem', height: 28 }} />
        <Tooltip title={t('语言')}>
          <IconButton onClick={e => setLangEl(e.currentTarget)} sx={{ mr: 0.5 }}>
            <Translate />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={langEl} open={!!langEl} onClose={() => setLangEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { minWidth: 160, mt: 1 } }}>
          {LANGUAGES.map(l => (
            <MenuItem key={l.code} selected={l.code === currentLang.code}
              onClick={() => { i18n.changeLanguage(l.code); setLangEl(null); }}>
              <ListItemIcon>{l.code === currentLang.code ? <Check fontSize="small" /> : <Box sx={{ width: 20 }} />}</ListItemIcon>
              {l.label}
            </MenuItem>
          ))}
        </Menu>
        <Tooltip title={mode === 'dark' ? t('浅色模式') : t('深色模式')}>
          <IconButton onClick={toggleTheme} sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>
        {user ? (
          <>
            <Chip
              avatar={<Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.8rem' }}>{(user.username || user.display_name || 'U')[0].toUpperCase()}</Avatar>}
              label={user.username || user.display_name || 'User'}
              variant="outlined"
              onClick={e => setAnchorEl(e.currentTarget)}
              sx={{ cursor: 'pointer' }}
            />
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{ sx: { minWidth: 200, mt: 1 } }}>
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/console/personal'); }}>
                <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                {t('个人设置')}
              </MenuItem>
              {isAdmin && (
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/console/setting'); }}>
                  <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                  {t('系统设置')}
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                {t('退出登录')}
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Chip icon={<AccountCircle />} label={t('登录')} onClick={() => navigate('/login')} variant="outlined" />
        )}
      </Toolbar>
    </AppBar>
  );
}
