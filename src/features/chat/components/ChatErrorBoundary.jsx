// 聊天页专属 ErrorBoundary。
//
// 为什么不复用 components/common/ErrorBoundary：那个是给主控制台设计的，
// 崩溃后倒计时跳 `/legacy/`（控制台的经典 UI）。对聊天页毫无意义 ——
// /legacy/ 跟聊天无关，线上也没有这条路径，用户只会被扔到一个 404。
//
// 这里的恢复动作是按聊天页的实际故障模式设计的：
//   1. 重试 —— 瞬时渲染错误，重挂一次就好
//   2. 重新载入 —— 陈旧 chunk / 状态错乱
//   3. 清空本地会话 —— 聊天页崩溃最常见的来源是 localStorage 里坏掉的消息
//      数据（手改过、跨版本结构变更、写入被打断）。storage.js 的校验能挡住
//      大部分，但挡不住"结构合法、语义不对"的情况。给用户一个自救按钮，
//      比让他去 DevTools 里手删 key 好。

import { Component } from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import { Refresh, BugReport, DeleteSweep } from '@mui/icons-material';

// 自包含配色：这个组件位于 ThemeProvider 之上，不能依赖 theme context
const palette = {
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  text: '#E3E3E3',
  muted: '#A0A0A0',
  brand: '#D97757', // Anthropic 橙，与聊天页的机器人身份一致
};

function formatErrorMessage(error) {
  if (!error) return 'Unknown error';
  const msg = error.message || '';
  if (!msg) {
    try { return JSON.stringify(error); } catch { return String(error); }
  }
  return msg;
}

// 清掉聊天页自己的 localStorage，不碰面板的登录态（auth_token 等）——
// 清掉登录态会把用户踢出去，而登录态并不是崩溃来源。
function clearChatStorage() {
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('chat_messages') || k === 'chat_sessions' || k === 'chat_config')) {
        doomed.push(k);
      }
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch { /* localStorage 不可用，忽略 */ }
}

export default class ChatErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ChatErrorBoundary]', error, info?.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  handleReload = () => window.location.reload();

  handleClearAndReload = () => {
    clearChatStorage();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = formatErrorMessage(this.state.error);
    return (
      <Box
        sx={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2.5, p: 4,
          bgcolor: palette.bg, color: palette.text,
        }}
      >
        <Box
          sx={{
            width: 60, height: 60, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: alpha(palette.brand, 0.12),
            border: `1px solid ${alpha(palette.brand, 0.25)}`,
          }}
        >
          <BugReport sx={{ fontSize: 30, color: palette.brand }} />
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          聊天页出错了
        </Typography>
        <Typography variant="body2" sx={{ color: palette.muted, maxWidth: 460, textAlign: 'center' }}>
          可以先点「重试」。如果反复出错，多半是本机保存的会话数据坏了 ——
          用「清空本地会话」清掉后重载即可，你的账号和 API key 不受影响。
        </Typography>

        <Box
          sx={{
            maxWidth: 520, width: '100%', mt: 0.5, p: 2, borderRadius: 2,
            bgcolor: palette.surface, border: `1px solid ${palette.border}`,
            fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
            fontSize: '0.78rem', color: palette.muted,
            lineHeight: 1.6, wordBreak: 'break-word',
            maxHeight: 140, overflow: 'auto',
          }}
        >
          {msg}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, mt: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={this.handleReset}
            sx={{
              color: palette.muted, borderColor: palette.border,
              '&:hover': { borderColor: palette.brand, color: palette.brand, bgcolor: alpha(palette.brand, 0.08) },
            }}
          >
            重试
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={this.handleReload}
            sx={{
              color: palette.muted, borderColor: palette.border,
              '&:hover': { borderColor: palette.brand, color: palette.brand, bgcolor: alpha(palette.brand, 0.08) },
            }}
          >
            重新载入
          </Button>
          <Button
            variant="contained"
            startIcon={<DeleteSweep />}
            onClick={this.handleClearAndReload}
            sx={{ bgcolor: palette.brand, color: '#fff', '&:hover': { bgcolor: '#C4663F' } }}
          >
            清空本地会话
          </Button>
        </Box>
      </Box>
    );
  }
}
