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

// 含控制字符（含 NUL/TAB/CR/LF）或 HTML 实体的 URL 一律拒绝。
//
// 为什么要单独挡：`java\0script:alert(1)` 和 `jav&#x09;ascript:alert(1)`
// 都不以 `/` 开头，`new URL()` 会把它们当**相对路径**拼到 origin 后面，
// protocol 变成 https: → 旧实现判定为 safe。虽然浏览器最终不会执行，
// 但白名单本身给出了错误结论，不该依赖下游兜底。
function hasSuspiciousChars(s) {
  for (const ch of s) {
    const code = ch.codePointAt(0);
    // C0 控制字符 + DEL + C1
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  // HTML 实体形式的控制字符（&#x09; / &#9; / &Tab; 等）
  return /&#x?[0-9a-f]{1,6};?|&Tab;|&NewLine;/i.test(s);
}

// `/\evil.com`、`/%09/evil.com` 这类「看着像相对路径、实际可能被当协议相对
// URL」的变体。浏览器对 `/\` 的处理和 `//` 等价，会跳到外站 → 开放重定向。
function isDisguisedProtocolRelative(s) {
  if (!s.startsWith('/')) return false;
  // 取第二个字符：反斜杠、或百分号编码的空白/斜杠，都视为可疑
  const rest = s.slice(1);
  if (rest.startsWith('\\') || rest.startsWith('/')) return true;
  // /%09/evil.com、/%2f/evil.com、/%5c evil.com
  return /^%(09|0a|0d|20|2f|5c)/i.test(rest);
}

// 解析相对 URL 时的基准 origin。
// 浏览器用真实 origin；非浏览器环境（vitest 测试）回落到固定值，
// 这样这些纯函数可以脱离 DOM 单测，也不依赖 window 的存在。
function baseOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://skiapi.dev';
}

// Validate a URL is safe for navigation / window.open / href / src / form action.
// Rejects javascript:, data:, vbscript:, file: schemes.
export function isSafeUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (hasSuspiciousChars(trimmed)) return false;
  // Disallow protocol-relative URLs which can be hijacked
  if (trimmed.startsWith('//')) return false;
  if (isDisguisedProtocolRelative(trimmed)) return false;
  // Allow relative URLs
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed, baseOrigin());
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
  if (hasSuspiciousChars(trimmed)) return false;
  if (trimmed.startsWith('//')) return false;
  if (isDisguisedProtocolRelative(trimmed)) return false;
  if (trimmed.startsWith('/')) return true;
  if (trimmed.startsWith('blob:')) return true;

  // data:image/* 白名单。
  //
  // 分号是**可选的**：`data:image/png,<payload>`（无 base64 声明时直接跟逗号）
  // 也是合法语法。旧正则强制要求 `;`，这类输入会漏到下面的 new URL() 兜底
  // ——结果虽然仍是 false，但那是巧合而非白名单判断，不该这么依赖。
  // 这里用 [;,] 明确覆盖两种分隔符。
  if (/^data:image\/(png|jpe?g|gif|webp|bmp)[;,]/i.test(trimmed)) {
    return true;
  }
  // 其余 data: 一律拒绝 —— 包含 svg+xml（SVG 是 HTML 的宿主，是最典型的
  // XSS 载体），也包含 data:text/html 之类伪装成图片的输入。
  if (/^data:/i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed, baseOrigin());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Check if URL points to same origin — for safe redirects within the app.
export function isSameOrigin(url) {
  if (typeof url !== 'string' || !url) return false;
  try {
    const parsed = new URL(url, baseOrigin());
    return parsed.origin === baseOrigin();
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
