// 聊天页独立构建。产物挂在 skiapi.dev/chat/，与 sub2api 面板同源
// （才能复用面板登录态 auth_token），但资源路径前缀是 /chat/assets/，
// 因此不会和面板自己的 /assets/* 撞车。
//
// 与主控制台构建完全分离：不打包路由、布局、渠道管理等控制台代码。

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { env } from 'node:process';

const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:3001';

export default defineConfig({
  plugins: [react()],
  // 关键：资源前缀。部署到 /var/www/skiapi-chat/ 并由 Caddy 在 /chat/* 服务。
  base: '/chat/',
  server: {
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
      '/v1': { target: proxyTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist-chat',
    sourcemap: false,
    rollupOptions: {
      input: 'chat.html',
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
