// 会话导出与分享。
//
// 安全设计（这是本文件最重要的部分，改动前先读）：
//
// 1. **导出是纯本地的**：读 localStorage 的消息，在浏览器里生成文件并触发下载。
//    不经过任何服务器 —— 会话内容不出用户的机器。
//
// 2. **分享用 URL fragment（# 后面）而不是 query string**：
//    fragment **不会被发送到服务器**，也不进 Caddy/nginx 的 access log。
//    用 ?data= 的话整段对话会被记进服务器日志，那是数据泄露。
//
// 3. **分享链接里的内容做了长度上限**：超过就拒绝生成，避免造出一个几 MB 的
//    URL（浏览器会截断 → 拿到半截 JSON → 解析失败）。
//
// 4. **导入侧一律当不可信输入**：解析后逐条校验结构、限制条数与长度、
//    剥掉 images（base64 图片可能是任意二进制载荷，且体积失控）。
//    渲染仍走 ChatMessage 的 markdown 白名单管线，不会执行脚本。
//
// 5. **不导出任何凭据**：会话对象里本来就没有 key，这里再显式挑字段
//    （白名单而非黑名单），杜绝以后加字段时误带出敏感信息。

const SHARE_MAX_CHARS = 60_000; // 分享链接的编码后上限
const IMPORT_MAX_MESSAGES = 500;
const IMPORT_MAX_CONTENT = 100_000;

// 只挑这些字段导出 —— 白名单，避免以后 message 上加了内部字段被顺带导出
function pickMessage(m) {
  return {
    role: m.from === 'user' ? 'user' : 'assistant',
    content: typeof m.content === 'string' ? m.content : '',
    ...(m.reasoning?.content ? { reasoning: m.reasoning.content } : {}),
    ...(m.model ? { model: m.model } : {}),
    ...(m.createdAt ? { createdAt: m.createdAt } : {}),
  };
}

export function buildExportPayload({ title, messages, model }) {
  return {
    v: 1,
    kind: 'skiapi-chat',
    title: title || '未命名会话',
    model: model || '',
    exportedAt: new Date().toISOString(),
    messages: (Array.isArray(messages) ? messages : [])
      .filter((m) => m?.content?.trim() || m?.reasoning?.content)
      .map(pickMessage),
  };
}

// ---- 导出：Markdown ----

export function toMarkdown(payload) {
  const lines = [`# ${payload.title}`, ''];
  if (payload.model) lines.push(`> 模型：\`${payload.model}\``, '');
  lines.push(`> 导出时间：${payload.exportedAt}`, '');
  for (const m of payload.messages) {
    lines.push(m.role === 'user' ? '## 我' : '## 助手', '');
    if (m.reasoning) {
      lines.push('<details><summary>思考过程</summary>', '', m.reasoning, '', '</details>', '');
    }
    lines.push(m.content, '');
  }
  return lines.join('\n');
}

// ---- 触发下载（纯浏览器，不上传） ----

export function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 立刻回收，避免 blob 一直占内存
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// 文件名净化：挡掉路径穿越（../ 、/ 、\\）、Windows 保留字符和控制字符。
// 用逐字符白名单判断而不是正则字符类 —— 控制字符写进正则会触发
// eslint no-control-regex，而且显式判断更容易看出到底拦了什么。
const FILENAME_FORBIDDEN = new Set(['\\', '/', ':', '*', '?', '"', '<', '>', '|']);

export function safeFilename(title, ext) {
  let out = '';
  for (const ch of String(title || '')) {
    const code = ch.codePointAt(0);
    // 控制字符（C0 + DEL + C1）一律换成下划线
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) { out += '_'; continue; }
    out += FILENAME_FORBIDDEN.has(ch) ? '_' : ch;
  }
  const base = out.replace(/\s+/g, ' ').trim().slice(0, 60) || 'chat';
  return `${base}.${ext}`;
}

// ---- 分享：编码进 URL fragment ----

// UTF-8 安全的 base64（btoa 只吃 latin1，中文会抛 InvalidCharacterError）
function utf8ToBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(b64) {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 ? '='.repeat(4 - (norm.length % 4)) : '';
  const bin = atob(norm + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * 生成分享链接。内容编码进 fragment（#s=...），不会发到服务器。
 * @returns {{url:string}|{error:string}}
 */
export function buildShareUrl(payload, origin = window.location.origin) {
  // 分享时剥掉 reasoning（体积大且多是内部推理），只带正文
  const slim = {
    ...payload,
    messages: payload.messages.map(({ role, content }) => ({ role, content })),
  };
  let encoded;
  try {
    encoded = utf8ToBase64Url(JSON.stringify(slim));
  } catch {
    return { error: '编码失败' };
  }
  if (encoded.length > SHARE_MAX_CHARS) {
    return { error: `会话太长（${Math.round(encoded.length / 1024)}KB），超过分享链接上限。请改用导出文件。` };
  }
  return { url: `${origin}/chat#s=${encoded}` };
}

/**
 * 从 fragment 解析分享内容。**当作完全不可信的输入处理。**
 * @returns {{title:string, model:string, messages:Array}|null}
 */
export function parseSharedFromHash(hash = window.location.hash) {
  const m = /^#s=(.+)$/.exec(hash || '');
  if (!m) return null;

  // 先按**编码长度**拒绝，再解码解析。
  //
  // 顺序很重要：如果先解码 + JSON.parse 再截断，攻击者只要发一个超大 fragment
  // （URL fragment 本身没有长度限制），受害者浏览器会先吃满内存做 base64 解码
  // 和 JSON 解析，然后才丢弃 —— 这是可行的 DoS。
  // 生成端 buildShareUrl 的上限是 SHARE_MAX_CHARS，这里放宽一点余量后硬拒。
  if (m[1].length > SHARE_MAX_CHARS * 1.5) return null;

  let obj;
  try {
    obj = JSON.parse(base64UrlToUtf8(m[1]));
  } catch {
    return null;
  }
  if (!obj || obj.kind !== 'skiapi-chat' || !Array.isArray(obj.messages)) return null;

  // 逐条校验 + 限长 + 丢弃未知字段（含 images：base64 载荷不接受）
  const messages = [];
  for (const raw of obj.messages.slice(0, IMPORT_MAX_MESSAGES)) {
    if (!raw || typeof raw !== 'object') continue;
    const role = raw.role === 'user' ? 'user' : 'assistant';
    const content = typeof raw.content === 'string' ? raw.content.slice(0, IMPORT_MAX_CONTENT) : '';
    if (!content.trim()) continue;
    messages.push({ role, content });
  }
  if (!messages.length) return null;

  return {
    title: typeof obj.title === 'string' ? obj.title.slice(0, 200) : '分享的会话',
    model: typeof obj.model === 'string' ? obj.model.slice(0, 120) : '',
    messages,
  };
}
