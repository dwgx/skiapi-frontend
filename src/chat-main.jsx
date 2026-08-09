// 聊天页独立入口。不引入整个控制台 App，只挂聊天 UI + 主题。
// 产物部署到 skiapi.dev/chat/，与面板同源 → 复用面板登录态（auth_token）。
//
// 主题用仓库的 ThemeProvider（不是直接 MuiThemeProvider + createAppTheme('dark')）：
// ThemeProvider 内部管 localStorage['theme_mode'] 的读写，设置面板里的
// 深/浅色开关就是通过 useThemeMode() 切换的。

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ChatApp from './features/chat/ChatApp';
import ChatErrorBoundary from './features/chat/components/ChatErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';

// 字体（与主控制台一致：Geist 系）
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';

// 直接引入 i18n（不引 App.jsx，那里有路由/布局依赖）
import './i18n';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ChatErrorBoundary>
        <ChatApp />
      </ChatErrorBoundary>
    </ThemeProvider>
  </StrictMode>
);
