import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import { isSafeUrl, safeJsonParse } from '../utils/security';
import { useTranslation } from 'react-i18next';

export default function Chat() {
  const { t } = useTranslation();
  const { id } = useParams();
  const chats = React.useMemo(() => safeJsonParse(localStorage.getItem('chats'), []) || [], []);

  const chatConfig = id !== undefined ? chats[parseInt(id)] : null;
  if (!chatConfig) {
    return <Box sx={{ p: 4 }}><Alert severity="info">{t('请从侧边栏选择一个聊天链接，或在系统设置中配置聊天链接。')}</Alert></Box>;
  }

  const [name, url] = Object.entries(chatConfig)[0] || ['', ''];
  if (!isSafeUrl(url)) {
    return <Box sx={{ p: 4 }}><Alert severity="error">{t('聊天链接不安全，已被阻止加载。')}</Alert></Box>;
  }
  return (
    <Box sx={{ height: 'calc(100vh - 120px)' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>{name}</Typography>
      <iframe src={url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }} title={name}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        referrerPolicy="no-referrer" />
    </Box>
  );
}
