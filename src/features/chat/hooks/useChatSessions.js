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

// 静默 400ms 后落盘（正常打字场景）
const DEBOUNCE_SAVE_MS = 400;
// 但距上次落盘超过 3s 就强制存一次 —— 流式每 50ms 更新会让纯防抖永不触发
const MAX_SAVE_DELAY_MS = 3000;

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
//
// ⚠️ **必须在卸载时清掉**（见下方 effect）。
// 早期注释写的「useChatSessions 只 mount 一次」是错的假设：ChatApp 除了
// 独立入口 chat-main.jsx，还挂在控制台 SPA 的 /newchat 路由上
// （src/pages/router.jsx），离开路由就卸载。而 ESM 模块缓存不随组件卸载
// 清空，所以再次进入时会读到**第一次挂载时的旧快照**，紧接着
// sessions 的持久化 effect 无条件写回 localStorage → 期间新建的会话
// 全部被抹掉，它们的 chat_messages_<id> 变成永久孤儿。
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

  // 上次真正落盘的时刻。用于「最大延迟」兜底，见下方 effect。
  const lastSavedAtRef = useRef(0);

  // 防抖保存当前会话消息 + 最大延迟兜底。
  //
  // 纯防抖在流式下会**永远不落盘**：useStreamRequest 每 50ms flush 一次
  // （FLUSH_INTERVAL_MS），50ms < 400ms，所以整个流式期间定时器被无限重置，
  // 一次都不 fire。长回复期间标签页被 OOM 杀掉 / 崩溃，整段回复全丢
  // （beforeunload 在这些场景不触发）。
  //
  // 所以除了 400ms 防抖，再加一条：距上次落盘超过 MAX_SAVE_DELAY_MS 就立刻存，
  // 不再等静默期。这样流式中也能持续落盘。
  useEffect(() => {
    if (!activeId) return;

    const doSave = () => {
      const r = saveMessages(messagesRef.current, messageKeyFor(activeIdRef.current));
      lastSavedAtRef.current = Date.now();
      setSaveError(r !== SAVE_OK ? r : null);
    };

    // 距上次落盘太久 → 立刻存，不等防抖
    if (Date.now() - lastSavedAtRef.current >= MAX_SAVE_DELAY_MS) {
      doSave();
      return undefined;
    }

    const timer = setTimeout(doSave, DEBOUNCE_SAVE_MS);
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
    // pagehide 覆盖 beforeunload 不可靠的场景：移动端 Safari、bfcache。
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      flush(); // 卸载兜底
      // 清掉模块级 boot 缓存 —— ChatApp 挂在 /newchat 路由上会被卸载，
      // 不清的话下次进入读到旧快照并写回 localStorage，抹掉期间新建的会话。
      bootCache = null;
    };
  }, []);

  /**
   * 立刻把当前会话落盘。
   *
   * 切会话前必须调 —— 防抖 effect 的 cleanup 只 clearTimeout，
   * 所以在 400ms 窗口内切走时，刚发的消息**从未写进 localStorage**：
   *   在 A 发消息 → 400ms 内切到 B → 切回 A → 那条消息没了。
   * 这是静默数据丢失，用户不会知道发生了什么。
   */
  const flushNow = useCallback(() => {
    const id = activeIdRef.current;
    if (!id) return;
    saveMessages(messagesRef.current, messageKeyFor(id));
  }, []);

  const selectSession = useCallback((id) => {
    flushNow(); // 先保住当前会话，再切走
    setActiveId(id);
    setMessages(loadMessages(messageKeyFor(id)));
    // 清掉上一个会话的保存错误 —— 那是「那个会话太大」，
    // 留着会在新会话上误报。新会话若也有问题，防抖保存会重新置上。
    setSaveError(null);
  }, [flushNow]);

  const newSession = useCallback(() => {
    flushNow(); // 同上：新建前先保住当前会话
    const s = createSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setMessages([]);
    setSaveError(null); // 新会话是空的，不该继承旧会话的保存错误
    return s.id;
  }, [flushNow]);

  const deleteSession = useCallback((id) => {
    // 删的不是当前会话时，当前会话仍需保住（删除会触发 setSessions →
    // 防抖 effect 重跑 → 旧定时器被 clearTimeout 丢掉）
    if (id !== activeIdRef.current) flushNow();
    // 用当前 sessions 先算出结果，再分别 setState —— **决策不能放在
    // setSessions 的 updater 里**。updater 必须是纯函数，而 StrictMode
    // （chat-main.jsx / main.jsx 都开了）在开发模式会双调用它来暴露不纯性：
    // 原来在 updater 里调 createSession() 会生成两个不同 UUID，
    // setActiveId 拿到第二个而列表里留的是第一个 → activeId 指向不在
    // 列表里的会话，侧栏没有高亮，消息写进列表外的 key。
    //
    // 全部 setState 在同一事件回调里，React 19 自动批处理成一次 commit，
    // 不会多渲染一帧。
    //
    // 从 state 而非 localStorage 取列表：localStorage 的持久化是异步 effect，
    // 新建会话后立即删除时它还没写进去，读了会造成状态分叉。
    const next = sessions.filter((s) => s.id !== id);
    if (!next.length) {
      // 删光了 → 造一个新的空会话
      const fresh = createSession();
      setSessions([fresh]);
      setActiveId(fresh.id);
      setMessages([]);
    } else {
      setSessions(next);
      // 删的是当前会话 → 切到列表第一个，并把它的消息载进来
      if (activeId === id) {
        setActiveId(next[0].id);
        setMessages(loadMessages(messageKeyFor(next[0].id)));
      }
    }
    try { localStorage.removeItem(messageKeyFor(id)); } catch { /* 忽略 */ }
  }, [activeId, sessions, flushNow]);

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
