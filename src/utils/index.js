import { safeJsonParse, stripDangerousKeys } from './security';
export function getUser() {
  return safeJsonParse(localStorage.getItem('user'), null);
}
export function isLoggedIn() { return !!getUser(); }
export function isAdmin() { const u = getUser(); return u && u.role >= 10; }
export function isRoot() { const u = getUser(); return u && u.role >= 100; }
export function getUserRole() { const u = getUser(); return u?.role || 0; }
export function logout() { localStorage.removeItem('user'); }
export function setUser(data) { localStorage.setItem('user', JSON.stringify(stripDangerousKeys(data))); }

export async function copy(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function removeTrailingSlash(s) {
  return s ? s.replace(/\/+$/, '') : '';
}

export function toBoolean(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return !!v;
}

export function renderNumber(num) {
  num = Number(num) || 0;
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 10_000) return (num / 1_000).toFixed(1) + 'k';
  return String(num);
}

function getStatusCache() {
  try { return JSON.parse(localStorage.getItem('status') || '{}') || {}; } catch { return {}; }
}

export function getQuotaDisplayType() {
  return localStorage.getItem('quota_display_type') || 'TOKENS';
}

/**
 * Returns the active currency display info for converting raw USD-base prices.
 * Used by pricing pages that already compute USD-base values (model pricing, plans).
 * For TOKENS mode returns {symbol: '', rate: 1, isTokens: true} so caller can decide.
 */
export function getCurrencyInfo() {
  const displayType = getQuotaDisplayType();
  if (displayType === 'TOKENS') return { symbol: '', rate: 1, isTokens: true, type: 'TOKENS' };
  if (displayType === 'CNY') {
    const s = getStatusCache();
    return { symbol: '¥', rate: Number(s.usd_exchange_rate) || 1, isTokens: false, type: 'CNY' };
  }
  if (displayType === 'CUSTOM') {
    const s = getStatusCache();
    return {
      symbol: s.custom_currency_symbol || '¤',
      rate: Number(s.custom_currency_exchange_rate) || 1,
      isTokens: false,
      type: 'CUSTOM',
    };
  }
  return { symbol: '$', rate: 1, isTokens: false, type: 'USD' };
}

/**
 * Render a raw quota integer as a human-readable amount.
 * Matches NewAPI upstream semantics: USD / CNY / CUSTOM / TOKENS.
 */
export function renderQuota(quota, digits = 2) {
  const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit') || '500000') || 500000;
  const displayType = getQuotaDisplayType();
  const n = Number(quota) || 0;

  if (displayType === 'TOKENS') {
    return renderNumber(n);
  }

  const usdAmount = n / quotaPerUnit;
  let symbol = '$';
  let value = usdAmount;

  if (displayType === 'CNY') {
    const s = getStatusCache();
    const rate = Number(s.usd_exchange_rate) || 1;
    value = usdAmount * rate;
    symbol = '¥';
  } else if (displayType === 'CUSTOM') {
    const s = getStatusCache();
    symbol = s.custom_currency_symbol || '¤';
    const rate = Number(s.custom_currency_exchange_rate) || 1;
    value = usdAmount * rate;
  }

  const fixed = value.toFixed(digits);
  if (parseFloat(fixed) === 0 && n > 0 && value > 0) {
    return symbol + Math.pow(10, -digits).toFixed(digits);
  }
  return symbol + fixed;
}

export function timestamp2string(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}

export function showSuccess(msg) {
  window.__SNACKBAR__?.('success', msg);
}

export function showError(msg) {
  if (msg == null) {
    msg = 'Unknown error';
  } else if (typeof msg === 'object') {
    // Axios error → API error message → Error.message → JSON dump → fallback
    msg = msg?.response?.data?.message
      || msg?.message
      || (typeof msg.toString === 'function' && msg.toString() !== '[object Object]' ? msg.toString() : null)
      || (() => { try { return JSON.stringify(msg); } catch { return null; } })()
      || 'Unknown error';
  } else if (typeof msg !== 'string') {
    msg = String(msg);
  }
  // Guard against empty strings
  if (!msg || !msg.trim()) msg = 'Unknown error';
  window.__SNACKBAR__?.('error', msg);
}

export function showInfo(msg) {
  window.__SNACKBAR__?.('info', msg);
}

/**
 * Safely extract an array from API response data.
 * Handles: null, undefined, {}, "string", number, and actual arrays.
 */
export function safeArray(data) {
  return Array.isArray(data) ? data : [];
}

/**
 * Extract list items and total from API paginated response.
 * Handles both formats:
 *   {success, data: [...], total}         (legacy)
 *   {success, data: {items: [...], total}} (current NewAPI v0.12+)
 */
export function extractList(resData) {
  const d = resData.data;
  const items = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
  const total = d?.total ?? resData.total ?? 0;
  return { items, total };
}
