import DOMPurify from 'dompurify';

// Sanitize HTML received from API before rendering via dangerouslySetInnerHTML.
// Blocks <script>, event handlers, javascript: URIs, and other XSS vectors.
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || !html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'formaction', 'srcdoc'],
  });
}

// Validate a URL is safe for navigation / window.open / href / src.
// Rejects javascript:, data:, vbscript:, file: schemes.
export function isSafeUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Allow relative URLs
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  // Disallow protocol-relative URLs which can be hijacked
  if (trimmed.startsWith('//')) return false;
  try {
    const parsed = new URL(trimmed, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Safe src for <img> tags — allows http(s), blob:, data:image/* only.
export function isSafeImageUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  if (trimmed.startsWith('//')) return false;
  if (trimmed.startsWith('blob:')) return true;
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|bmp);/i.test(trimmed)) {
    // Reject data:image/svg+xml if it could contain scripts — safer to block SVG data URIs
    if (/^data:image\/svg\+xml/i.test(trimmed)) return false;
    return true;
  }
  try {
    const parsed = new URL(trimmed, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Check if URL points to same origin — for safe redirects within the app.
export function isSameOrigin(url) {
  if (typeof url !== 'string' || !url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

// Strip __proto__, constructor, prototype keys to prevent prototype pollution
// when merging untrusted JSON (localStorage, URL params) into objects.
export function safeJsonParse(raw, fallback = null) {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return stripDangerousKeys(parsed);
  } catch {
    return fallback;
  }
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function stripDangerousKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripDangerousKeys);
  const out = {};
  for (const k of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(k)) continue;
    out[k] = stripDangerousKeys(obj[k]);
  }
  return out;
}
