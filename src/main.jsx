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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
