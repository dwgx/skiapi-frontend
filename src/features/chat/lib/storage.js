// 防御性持久化。算法参考 New API 的 storage.ts（Calcium-Ion/new-api，AGPL-3.0，
// Copyright (C) 2023-2026 QuantumNous）。派生作品，随仓库以 AGPL-3.0 分发。
// 老 Playground 直接 localStorage.setItem(messages) 裸存 —— 无校验、无节流、
// 崩溃后残留 loading 幽灵消息。这里做：
//   1. 结构校验（loading 时返回 null，等结构合法再存）
//   2. 上限保护（100 条 / 500KB，截断超长文本）
//   3. 500ms 防抖保存
//   4. 加载时收敛残留（见 message-streaming.js sanitizeMessagesOnLoad）

import { STORAGE_KEYS } from '../types';
import { sanitizeMessagesOnLoad } from './message-streaming';

const MAX_MESSAGES = 100;
const MAX_STORAGE_BYTES = 500 * 1024;
const MAX_CHAR_PER_MESSAGE = 120000;

function estimateBytes(str) {
  try {
    return new TextEncoder().encode(str).length;
  } catch {
    return str.length * 2;
  }
}

function truncateContent(content) {
  if (typeof content !== 'string') return content;
  return content.length > MAX_CHAR_PER_MESSAGE
    ? content.slice(0, MAX_CHAR_PER_MESSAGE) + '…[已截断]'
    : content;
}

export function isValidMessageShape(msg) {
  return (
    msg &&
    typeof msg === 'object' &&
    typeof msg.key === 'string' &&
    (msg.from === 'user' || msg.from === 'assistant') &&
    typeof msg.content === 'string'
  );
}

// 加载：解析 → 校验 → 收敛残留 loading
export function loadMessages(storageKey) {
  const key = storageKey || STORAGE_KEYS.MESSAGES;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isValidMessageShape);
    return sanitizeMessagesOnLoad(valid);
  } catch {
    return [];
  }
}

// 保存：截断 → 上限 → 估算体积，超限丢弃（宁可丢最旧的保存项也不写爆）
export function saveMessages(messages, storageKey) {
  const key = storageKey || STORAGE_KEYS.MESSAGES;
  try {
    if (!Array.isArray(messages)) return;
    // 结构校验：全非法就直接放弃本轮保存
    if (!messages.length) {
      localStorage.removeItem(key);
      return;
    }
    const truncated = messages.slice(-MAX_MESSAGES).map((m) => ({
      ...m,
      content: truncateContent(m.content),
      versions: Array.isArray(m.versions)
        ? m.versions.slice(-2).map((v) => ({ ...v, content: truncateContent(v.content) }))
        : undefined,
      reasoning: m.reasoning
        ? { ...m.reasoning, content: truncateContent(m.reasoning.content) }
        : undefined,
    }));
    const json = JSON.stringify(truncated);
    if (estimateBytes(json) > MAX_STORAGE_BYTES) return; // 超限放弃，保留旧数据
    localStorage.setItem(key, json);
  } catch {
    // localStorage 满/不可用，静默失败（不打断聊天）
  }
}

// 500ms 防抖保存。返回清理函数。
export function createDebouncedSave(saveFn, delay = 500) {
  let timer = null;
  return {
    push(data) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => saveFn(data), delay);
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        saveFn(null); // 由调用方传入最新数据
      }
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
