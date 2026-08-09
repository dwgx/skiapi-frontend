// Message model: versions[] + nanoid-style key.
// 参考 New API playground 的消息模型（Calcium-Ion/new-api，AGPL-3.0，
// Copyright (C) 2023-2026 QuantumNous）。本文件为派生作品，随仓库以 AGPL-3.0 分发。
// 用 key（crypto.randomUUID）而非 index 定位消息，是编辑/重发/删除能干净的地基。

export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

export const MESSAGE_STATUS = {
  LOADING: 'loading',
  STREAMING: 'streaming',
  COMPLETE: 'complete',
  ERROR: 'error',
};

// LocalStorage keys（沿用老 Playground 的命名空间，避免历史数据冲突）
export const STORAGE_KEYS = {
  MESSAGES: 'chat_messages',
  CONFIG: 'chat_config',
  KEY: 'chat_key',
};

export const ERROR_MESSAGES = {
  API_REQUEST_ERROR: '请求失败',
  INTERRUPTED: '请求被中断',
  EMPTY_RESPONSE: '模型没有返回内容',
  NO_VALID_KEY: '没有可用的 API key',
};

export const API_ENDPOINTS = {
  // sub2api 兼容层：聊天走 OpenAI 兼容 /v1/chat/completions
  CHAT: '/v1/chat/completions',
  RESPONSES: '/v1/responses',
  // 兼容层元端点（如果部署在 same-origin，可走相对路径）
  USER_SELF: '/api/user/self',
  USER_GROUPS: '/api/user/self/groups',
  USER_MODELS: '/api/user/models',
  TOKENS: '/api/token/',
};

export function createUserMessage(content) {
  return {
    key: crypto.randomUUID(),
    from: MESSAGE_ROLES.USER,
    content,
    createdAt: Date.now(),
    // 用户消息编辑后的历史版本；初始版本即第一条
    versions: [{ id: crypto.randomUUID(), content }],
  };
}

export function createLoadingAssistantMessage() {
  return {
    key: crypto.randomUUID(),
    from: MESSAGE_ROLES.ASSISTANT,
    status: MESSAGE_STATUS.LOADING,
    content: '',
    versions: [{ id: crypto.randomUUID(), content: '' }],
    startedAt: Date.now(),
    completedAt: null,
    durationMs: null,
    reasoning: null,
    isReasoningStreaming: false,
    errorCode: null,
  };
}

// 取当前版本内容（versions[] 末尾）
export function getCurrentVersion(message) {
  const v = message.versions?.[message.versions.length - 1];
  return v || { id: message.key, content: message.content || '' };
}

export function updateCurrentVersionContent(message, content) {
  const versions = message.versions || [];
  if (!versions.length) {
    return { ...message, versions: [{ id: crypto.randomUUID(), content }], content };
  }
  const next = [...versions];
  next[next.length - 1] = { ...next[next.length - 1], content };
  return { ...message, versions: next, content };
}

export function hasMessageContent(message) {
  const c = getCurrentVersion(message).content?.trim();
  return Boolean(c) || Boolean(message?.reasoning?.content?.trim());
}

// 重发 = 切掉该条之后所有消息 + 追加 assistant 占位
export function createRegeneratedMessages(messages, targetKey) {
  const idx = messages.findIndex((m) => m.key === targetKey);
  if (idx === -1) return [...messages, createLoadingAssistantMessage()];
  const base = messages.slice(0, idx + 1);
  return [...base, createLoadingAssistantMessage()];
}

// 编辑消息。shouldSubmit=true 表示"保存并重发"（切片追加占位）
export function applyMessageEdit(messages, targetKey, newContent, shouldSubmit) {
  const idx = messages.findIndex((m) => m.key === targetKey);
  if (idx === -1) return messages;

  const next = [...messages];
  const msg = next[idx];
  if (msg.from === MESSAGE_ROLES.ASSISTANT) {
    // 助手消息编辑：只改当前版本内容，保留其余状态
    next[idx] = updateCurrentVersionContent(msg, newContent);
    return next;
  }

  // 用户消息编辑：版本记录 + 重发
  next[idx] = updateCurrentVersionContent(msg, newContent);
  if (shouldSubmit) {
    next.splice(idx + 1);
    next.push(createLoadingAssistantMessage());
  }
  return next;
}

// 停止生成：把流到一半的助手消息收敛成 complete/error
export function convergeOnStop(messages, targetKey) {
  const idx = messages.findIndex((m) => m.key === targetKey);
  if (idx === -1) return messages;
  const next = [...messages];
  const msg = next[idx];
  const hasContent = hasMessageContent(msg);
  next[idx] = {
    ...msg,
    status: hasContent ? MESSAGE_STATUS.COMPLETE : MESSAGE_STATUS.ERROR,
    completedAt: Date.now(),
    durationMs: Date.now() - (msg.startedAt || Date.now()),
    isReasoningStreaming: false,
    ...(hasContent ? {} : { errorCode: ERROR_MESSAGES.INTERRUPTED }),
  };
  return next;
}
