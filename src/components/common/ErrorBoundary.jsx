import { Component } from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import { Refresh, BugReport } from '@mui/icons-material';

/**
 * Top-level error boundary — catches React render errors and shows a
 * recovery UI instead of crashing the whole app to a white screen.
 *
 * Because this sits above ThemeProvider / i18n in the tree, it uses
 * a self-contained dark palette that matches the app's "Editorial Terminal"
 * design tokens without depending on the theme context.
 */

const palette = {
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  text: '#E3E3E3',
  muted: '#A0A0A0',
  accent: '#A78BFA',
  accentDim: '#7C3AED',
};

function formatErrorMessage(error) {
  if (!error) return 'Unknown error';
  const msg = error.message || '';
  if (!msg) {
    try { return JSON.stringify(error); } catch { return String(error); }
  }
  return msg;
}

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const msg = formatErrorMessage(this.state.error);
      return (
        <Box sx={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2.5, p: 4,
          bgcolor: palette.bg, color: palette.text,
        }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(palette.accent, 0.15)}, ${alpha(palette.accentDim, 0.08)})`,
            border: `1px solid ${alpha(palette.accent, 0.2)}`,
          }}>
            <BugReport sx={{ fontSize: 32, color: palette.accent }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: palette.text }}>
            页面出错了
          </Typography>
          <Typography variant="body2" sx={{ color: palette.muted, maxWidth: 400, textAlign: 'center' }}>
            发生了意外错误，你可以尝试重试或重新载入页面。
          </Typography>

          <Box sx={{
            maxWidth: 500, width: '100%', mt: 1,
            p: 2, borderRadius: 2,
            bgcolor: palette.surface, border: `1px solid ${palette.border}`,
            fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
            fontSize: '0.8rem', color: palette.muted,
            lineHeight: 1.6, wordBreak: 'break-word',
            maxHeight: 120, overflow: 'auto',
          }}>
            {msg}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={this.handleReset}
              sx={{
                color: palette.muted, borderColor: palette.border,
                '&:hover': { borderColor: palette.accent, color: palette.accent, bgcolor: alpha(palette.accent, 0.08) },
              }}>
              重试
            </Button>
            <Button variant="contained" startIcon={<Refresh />} onClick={this.handleReload}
              sx={{
                bgcolor: palette.accentDim, color: '#fff',
                '&:hover': { bgcolor: palette.accent },
              }}>
              重新载入
            </Button>
          </Box>
        </Box>
      );
    }
    return this.props.children;
  }
}
