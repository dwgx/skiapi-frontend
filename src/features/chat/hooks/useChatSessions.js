// 多会话状态：会话列表 + 每个会话的消息分离存储。
// localStorage 键：chat_sessions（列表）、chat_messages_<id>（每个会话的消息）。
// 会话消息独立存储，切换会话不丢上下文。
//
// React hooks 规范：不在 render 期间读写 ref。
// 一次性初始化用「模块级惰性缓存」—— 因为 useChatSessions 只在聊天页 mount 一次，
// 模块级缓存不会造成跨实例污染，却能让三个 state 共享同一个 boot 结果。

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadMessages, saveMessages, SAVE_OK } from '../lib/storage';
import { STORAGE_KEYS } from '../types';
import { createSession, DEFAULT_SESSION_TITLE } from '../lib/session';

const SESSIONS_KEY = 'chat_sessions';

function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) && arr.length ? arr : [createSession()];
  } catch {
    return [createSession()];
  }
}

// 导出给 ChatApp 用：导出/分享非当前会话时要按 id 读它的消息
export function messageKeyFor(id) {
  return `${STORAGE_KEYS.MESSAGES}_${id}`;
}

// 模块级惰性缓存：loadSessions() 在没有存量时会 createSession()（新 UUID），
// 分三个 initializer 各调一次会造出三个不同的会话，列表与 activeId 对不上。
// 缓存整个 boot 结果，三个 useState 共享同一份。
let bootCache = null;
function getBoot() {
  if (bootCache === null) {
    const list = loadSessions();
    bootCache = {
      list,
      activeId: list[0]?.id || null,
      messages: list[0]?.id ? loadMessages(messageKeyFor(list[0].id)) : [],
    };
  }
  return bootCache;
}

export function useChatSessions() {
  const boot = getBoot();
  const [sessions, setSessions] = useState(boot.list);
  const [activeId, setActiveId] = useState(boot.activeId);
  // 当前会话的消息。切换会话时从对应 localStorage 加载。
  const [messages, setMessages] = useState(boot.messages);
  // 持久化失败的原因（null = 正常）。上层据此提示用户，避免无声丢消息。
  const [saveError, setSaveError] = useState(null);

  // 最新值 ref（effect/beforeunload 回调里读，避免闭包陈旧）。
  // 用 useEffect 同步而非 render 期赋值 —— react-hooks/refs 禁止 render 写 ref。
  const activeIdRef = useRef(activeId);
  const messagesRef = useRef(messages);
  useEffect(() => {
    activeIdRef.current = activeId;
    messagesRef.current = messages;
  }, [activeId, messages]);

  // 持久化会话列表
  useEffect(() => {
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* 满，忽略 */ }
  }, [sessions]);

  // 防抖保存当前会话消息。
  // 保存失败必须让用户知道 —— 静默失败的话，用户以为存了，
  // 刷新后发现最近的消息全没了，且不知道原因。
  useEffect(() => {
    if (!activeId) return;
    const timer = setTimeout(() => {
      const r = saveMessages(messagesRef.current, messageKeyFor(activeIdRef.current));
      if (r !== SAVE_OK) setSaveError(r);
      else setSaveError(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [messages, activeId]);

  // 关页/刷新前把防抖窗口内的最后几条落盘，避免丢失
  useEffect(() => {
    const flush = () => {
      if (activeIdRef.current) {
        saveMessages(messagesRef.current, messageKeyFor(activeIdRef.current));
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush(); // 卸载兜底
    };
  }, []);

  const selectSession = useCallback((id) => {
    setActiveId(id);
    setMessages(loadMessages(messageKeyFor(id)));
  }, []);

  const newSession = useCallback(() => {
    const s = createSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setMessages([]);
    return s.id;
  }, []);

  const deleteSession = useCallback((id) => {
    // 从 state（真源）删除，不读 localStorage —— localStorage 的持久化是
    // 异步 effect，新建会话后立即删除时 localStorage 里还没有它，读了会
    // 造成 state 与 localStorage 不一致（幽灵会话在下次加载时复活）。
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (!next.length) {
        // 删光了 → 造一个新的空会话
        const fresh = createSession();
        setActiveId(fresh.id);
        setMessages([]);
        return [fresh];
      }
      // 删的是当前会话 → 切到列表第一个，并把它的消息载进来
      if (activeId === id) {
        setActiveId(next[0].id);
        setMessages(loadMessages(messageKeyFor(next[0].id)));
      }
      return next;
    });
    try { localStorage.removeItem(messageKeyFor(id)); } catch { /* 忽略 */ }
  }, [activeId]);

  const renameSession = useCallback((id, title) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title, updatedAt: Date.now() } : s)));
  }, []);

  const clearActive = useCallback(() => {
    if (!activeId) return;
    setMessages([]);
    try { localStorage.removeItem(messageKeyFor(activeId)); } catch { /* 忽略 */ }
  }, [activeId]);

  // 会话标题自动跟随首条用户消息（仅当仍是默认"新对话"）
  const autoTitle = useCallback((text) => {
    if (!activeId || !text) return;
    setSessions((prev) => prev.map((s) =>
      s.id === activeId && (s.title === DEFAULT_SESSION_TITLE || s.title.startsWith(DEFAULT_SESSION_TITLE))
        ? { ...s, title: text.slice(0, 24) + (text.length > 24 ? '…' : '') }
        : s
    ));
  }, [activeId]);

  return {
    sessions, activeId, messages, setMessages,
    selectSession, newSession, deleteSession, renameSession, clearActive, autoTitle,
    saveError,
  };
}
