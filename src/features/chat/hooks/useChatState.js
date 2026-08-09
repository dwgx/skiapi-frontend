// 会话状态 + 防抖持久化 + 加载时收敛残留。
// 对标 New API 的 use-playground-state（Calcium-Ion/new-api，AGPL-3.0，
// Copyright (C) 2023-2026 QuantumNous）。派生作品，随仓库以 AGPL-3.0 分发。

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadMessages, saveMessages } from '../lib/storage';
import { STORAGE_KEYS } from '../types';
import { safeJsonParse } from '../../../utils/security';

const SAVE_DEBOUNCE_MS = 500;

export const defaultChatConfig = {
  model: '',
  group: '',
  systemPrompt: '',
  stream: true,
  temperature: 1,
  temperatureEnabled: false,
  topP: 1,
  topPEnabled: false,
  maxTokens: 4096,
  maxTokensEnabled: false,
};

export function useChatState() {
  // 加载即收敛：卡在 loading 的幽灵消息被转成 complete/error
  const [messages, setMessages] = useState(() => loadMessages());
  const [config, setConfig] = useState(() => {
    const stored = safeJsonParse(localStorage.getItem(STORAGE_KEYS.CONFIG), {}) || {};
    return { ...defaultChatConfig, ...stored };
  });

  const saveTimerRef = useRef(null);
  const latestRef = useRef(messages);

  // 防抖保存（老代码每次 setMessages 都同步写，流式下等于每 chunk 写一次磁盘）。
  // latestRef 在 effect 里同步（render 期间写 ref 是反模式）。
  useEffect(() => {
    latestRef.current = messages;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMessages(latestRef.current);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages]);

  // 关页前把最后一次状态落盘（防抖窗口内刷新会丢最后几条）
  useEffect(() => {
    const flush = () => saveMessages(latestRef.current);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch { /* 存储满，忽略 */ }
  }, [config]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEYS.MESSAGES); } catch { /* noop */ }
  }, []);

  return { messages, setMessages, config, setConfig, clearMessages };
}
