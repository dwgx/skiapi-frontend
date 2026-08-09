// SSE 单条消息 → 更新列表。一条 SSE data 可能同时带 reasoning 和 content。
// 同时兼容 chat/completions 与 responses(codex) 两种 delta 格式 —— 老 Playground
// 已支持 responses，这里保留该兼容性。

/**
 * 解析一条 SSE data 载荷，返回 [{type, chunk}] 更新列表。
 * type: 'reasoning' | 'content'
 */
export function parseStreamMessageUpdates(parsed) {
  const updates = [];
  if (!parsed || typeof parsed !== 'object') return updates;

  const delta = parsed.choices?.[0]?.delta;

  // 轨道一：推理字段。不同上游字段名不统一，全部认。
  const reasoningChunk =
    delta?.reasoning_content ??
    delta?.reasoning ??
    parsed.reasoning_content ??
    (parsed.type === 'response.reasoning_summary_text.delta' ? parsed.delta : undefined);
  if (typeof reasoningChunk === 'string' && reasoningChunk) {
    updates.push({ type: 'reasoning', chunk: reasoningChunk });
  }

  // 正文。responses API 的 output_text.delta 事件形如 {type, delta:"text"}
  const contentChunk =
    delta?.content ??
    (parsed.type === 'response.output_text.delta' ? parsed.delta : undefined) ??
    (typeof parsed.delta === 'string' && !parsed.type ? parsed.delta : undefined);
  if (typeof contentChunk === 'string' && contentChunk) {
    updates.push({ type: 'content', chunk: contentChunk });
  }

  return updates;
}

/**
 * 从错误响应体里挖出可读信息。上游错误结构不统一，逐层尝试。
 */
export function parseStreamErrorDetails(rawText, status, statusText) {
  let message = rawText;
  let code = null;
  try {
    const j = JSON.parse(rawText);
    message = j.error?.message || j.message || j.error || rawText;
    code = j.error?.code || j.error?.type || j.code || null;
  } catch {
    // 非 JSON，原文即消息
  }
  const prefix = status ? `${status}${statusText ? ' ' + statusText : ''}` : '';
  return {
    code,
    message: message || prefix || '未知错误',
    display: prefix ? `${prefix}: ${message || '请求失败'}` : String(message || '请求失败'),
  };
}

/**
 * 逐行切 SSE 流。返回 {events, rest} —— rest 是未完成的残行，
 * 必须留到下一个 chunk 再拼，否则会把一条 data 切断导致 JSON.parse 失败。
 * 老 Playground 的实现直接 split('\n') 丢掉残行，长 chunk 下会掉字。
 */
export function splitSseLines(buffer) {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const events = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (!data) continue;
    events.push(data);
  }
  return { events, rest };
}
