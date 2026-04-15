import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
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

// ── DOM resilience patch ──
// Browser extensions (translators, ad blockers, Grammarly, etc.) modify the DOM
// behind React's back. When React later tries to remove/replace those nodes,
// it throws "removeChild: not a child of this node". Silently swallow these
// instead of crashing the entire app.
const _removeChild = Node.prototype.removeChild;
Node.prototype.removeChild = function (child) {
  if (child.parentNode !== this) {
    console.warn('[DOM patch] removeChild: node is not a child — skipped (likely browser extension)');
    return child;
  }
  return _removeChild.call(this, child);
};
const _insertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function (newNode, refNode) {
  if (refNode && refNode.parentNode !== this) {
    console.warn('[DOM patch] insertBefore: ref node is not a child — skipped');
    return newNode;
  }
  return _insertBefore.call(this, newNode, refNode);
};

// Clear chunk retry flag on successful load
sessionStorage.removeItem('chunk_retry');

// ── Legacy fallback guard ──
// If the app fails to bootstrap at all (top-level import crash, missing chunk, etc.)
// ErrorBoundary never gets a chance to render. This guard watches for that case
// and redirects to /legacy/ as a safety net so users can always reach an admin UI.
const BOOT_KEY = 'app_boot_attempt';
const bootAttempts = parseInt(sessionStorage.getItem(BOOT_KEY) || '0', 10);
sessionStorage.setItem(BOOT_KEY, String(bootAttempts + 1));

// Watchdog: if React hasn't painted anything in 8 seconds, assume a hard crash
// and offer /legacy/. We only trip this on a second consecutive failed boot so
// that genuinely slow first loads aren't penalised.
let _booted = false;
const watchdog = setTimeout(() => {
  if (_booted) return;
  const root = document.getElementById('root');
  if (root && root.children.length > 0) return; // React rendered something
  if (bootAttempts >= 1) {
    // Second failed attempt — auto-jump to legacy
    window.location.href = '/legacy/';
  } else {
    // First failed attempt — show manual escape hatch
    if (root) {
      root.innerHTML = `
        <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
                    gap:16px;padding:32px;background:#0F0F0F;color:#E3E3E3;font-family:system-ui,-apple-system,sans-serif;">
          <div style="font-size:20px;font-weight:700;">页面加载异常</div>
          <div style="color:#A0A0A0;max-width:440px;text-align:center;font-size:14px;line-height:1.6;">
            新版 UI 无法正常加载。你可以重新载入，或直接进入经典 UI 继续使用。
          </div>
          <div style="display:flex;gap:12px;">
            <button onclick="sessionStorage.removeItem('app_boot_attempt');location.reload()"
              style="padding:10px 20px;background:transparent;border:1px solid #2A2A2A;color:#A0A0A0;
                     border-radius:9px;cursor:pointer;font-size:14px;">重新载入</button>
            <button onclick="location.href='/legacy/'"
              style="padding:10px 20px;background:#7C3AED;border:0;color:#fff;
                     border-radius:9px;cursor:pointer;font-size:14px;font-weight:600;">打开经典 UI</button>
          </div>
        </div>
      `;
    }
  }
}, 8000);

// Catch synchronous crashes from module evaluation / import failures.
// Note: ErrorBoundary handles React render errors — this is for the pre-boot phase.
window.addEventListener('error', (e) => {
  if (_booted) return;
  // Chunk loading failures (typically after a deploy invalidates old asset names)
  const msg = String(e.message || '');
  if (msg.includes('Loading chunk') || msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed')) {
    if (!sessionStorage.getItem('chunk_retry')) {
      sessionStorage.setItem('chunk_retry', '1');
      window.location.reload();
      return;
    }
    // Already retried — fall back to legacy
    window.location.href = '/legacy/';
  }
});

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  _booted = true;
  // Clear attempt counter on successful render pass
  requestAnimationFrame(() => {
    clearTimeout(watchdog);
    sessionStorage.removeItem(BOOT_KEY);
  });
} catch (err) {
  console.error('[main] fatal bootstrap error', err);
  clearTimeout(watchdog);
  // Direct fallback
  window.location.href = '/legacy/';
}
