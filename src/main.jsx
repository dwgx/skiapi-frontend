import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './i18n';

// Gemini-style M3 — font stack
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';

// Clear chunk retry flag on successful load
sessionStorage.removeItem('chunk_retry');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
