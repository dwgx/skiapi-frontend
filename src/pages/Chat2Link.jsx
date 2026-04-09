import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isSafeUrl } from '../utils/security';

// Returns the set of allowed chat host origins configured by admin.
function getAllowedChatOrigins() {
  const out = new Set();
  const push = (u) => {
    if (typeof u !== 'string' || !u) return;
    try { out.add(new URL(u, window.location.origin).origin); } catch { /* ignore */ }
  };
  const single = localStorage.getItem('chats');
  if (single) {
    // May be plain URL or JSON (array/object)
    try {
      const parsed = JSON.parse(single);
      if (Array.isArray(parsed)) parsed.forEach(it => push(typeof it === 'string' ? it : it?.url));
      else if (parsed && typeof parsed === 'object') Object.values(parsed).forEach(v => push(typeof v === 'string' ? v : v?.url));
      else push(single);
    } catch {
      push(single);
    }
  }
  // Always allow same origin
  out.add(window.location.origin);
  return out;
}

export default function Chat2Link() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    const url = params.get('url');
    if (!url || !isSafeUrl(url)) { navigate('/console'); return; }
    // Require the URL's origin to match an admin-configured chat origin
    try {
      const target = new URL(url, window.location.origin);
      const allowed = getAllowedChatOrigins();
      if (allowed.has(target.origin)) {
        window.location.href = url;
        return;
      }
    } catch { /* fall through */ }
    navigate('/console');
  }, []);
  return null;
}
