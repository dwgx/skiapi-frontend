import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://43.153.139.136:8080', changeOrigin: true },
      '/v1': { target: 'http://43.153.139.136:8080', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-i18next', 'i18next', 'i18next-browser-languagedetector'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
