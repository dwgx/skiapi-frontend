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

// 注：以下四个函数已删除（2026-08 review）——
//   hasMessageContent / createRegeneratedMessages / applyMessageEdit / convergeOnStop
// 它们没有任何调用方，而 useChatHandler 里有各自的内联实现。
// 更糟的是 createRegeneratedMessages 用 slice(0, idx+1) 而 handler 用
// slice(0, idx)，语义相反且并存，容易让人改错地方。
// 重发/编辑/停止收敛的唯一真源是 hooks/useChatHandler.js。
