// 聊天编排：发送 / 停止 / 重发 / 错误分层。
// 对标 New API 的 use-chat-handler（Calcium-Ion/new-api，AGPL-3.0，
// Copyright (C) 2023-2026 QuantumNous）。派生作品，随仓库以 AGPL-3.0 分发。
// 用本仓库 JS 风格 + useStreamRequest 的
// generation 竞态 + 50ms flush。认证/端点全部走 apiBridge 适配层，
// 这里不写死任何后端，便于同时兼容 New API 与 sub2api。

import { useCallback, useRef } from 'react';
import { useStreamRequest } from './useStreamRequest';
import {
  createUserMessage,
  createLoadingAssistantMessage,
  MESSAGE_ROLES,
  MESSAGE_STATUS,
} from '../types';
import {
  applyStreamingChunk, completeAssistantMessage, applyChatCompletionChoice,
} from '../lib/message-streaming';
import { parseStreamErrorDetails } from '../lib/stream-utils';

// 把内部消息模型转成 OpenAI messages 数组，保持时序
function toApiMessages(messages, systemPrompt) {
  const out = [];
  if (systemPrompt) out.push({ role: 'system', content: systemPrompt });
  for (const m of messages) {
    if (m.from === MESSAGE_ROLES.USER) {
      if (m.images?.length) {
        out.push({
          role: 'user',
          content: [{ type: 'text', text: m.content }, ...m.images],
        });
      } else {
        out.push({ role: 'user', content: m.content });
      }
    } else if (m.from === MESSAGE_ROLES.ASSISTANT) {
      // 只带成功完成的助手回复；报错/中断的不进上下文
      if (m.status === MESSAGE_STATUS.COMPLETE && m.content?.trim()) {
        out.push({ role: 'assistant', content: m.content });
      }
    }
  }
  return out;
}

export function useChatHandler({ config, apiBridge, messages, setMessages, onUsage }) {
  const { start, stop } = useStreamRequest();
  const activeKeyRef = useRef(null);
  // 连点发送锁：send 执行期间再触发直接忽略，避免用户消息重复入列
  const sendingRef = useRef(false);
  // 始终持有最新消息，避免闭包读到旧值
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const convergeActive = useCallback((errorCode) => {
    const key = activeKeyRef.current;
    if (!key) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.key === key);
      if (idx === -1) return prev;
      const next = [...prev];
      const msg = next[idx];
      const hasContent = msg.content?.trim() || msg.reasoning?.content?.trim();
      next[idx] = {
        ...msg,
        status: hasContent ? MESSAGE_STATUS.COMPLETE : MESSAGE_STATUS.ERROR,
        completedAt: Date.now(),
        durationMs: Date.now() - (msg.startedAt || Date.now()),
        isReasoningStreaming: false,
        ...(hasContent ? {} : { errorCode: errorCode || 'INTERRUPTED' }),
      };
      return next;
    });
    activeKeyRef.current = null;
  }, [setMessages]);

  const stopGenerating = useCallback(() => {
    stop();
    convergeActive('INTERRUPTED');
  }, [stop, convergeActive]);

  // 核心：给定完整历史 + assistant 占位 key，发起流式请求
  const runStream = useCallback(async (historyForApi, assistantKey) => {
    let bridge;
    try {
      bridge = await apiBridge.resolve();
    } catch (err) {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.key === assistantKey);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          status: MESSAGE_STATUS.ERROR,
          errorMessage: err?.message || 'API key 获取失败',
          completedAt: Date.now(),
        };
        return next;
      });
      activeKeyRef.current = null;
      return;
    }

    // 若上一条还在流（并发起流的兜底：start() 内部会 stop 掉旧流的回调，
    // 但旧消息不会被收尾，会永久停在 streaming 状态转圈）。
    // 这里先把它收敛掉，再接管 activeKey。
    if (activeKeyRef.current && activeKeyRef.current !== assistantKey) {
      convergeActive('INTERRUPTED');
    }
    activeKeyRef.current = assistantKey;

    const payload = {
      model: config.model,
      messages: historyForApi,
      // 流式开关：跟随设置面板（之前硬编码 true，config.stream 开关失效）
      stream: config.stream !== false,
      // 联网：sub2api 网关识别「只有 web_search 的 tool」并拦截执行搜索
      // （gateway_websearch_emulation.go 的 shouldEmulateWebSearch）。
      // 网关层做联网，前端只需声明工具；结果由网关注入给模型。
      ...(config.webSearch ? { tools: [{ type: 'web_search' }] } : {}),
      ...(config.temperatureEnabled && { temperature: config.temperature }),
      ...(config.topPEnabled && { top_p: config.topP }),
      ...(config.maxTokensEnabled && { max_tokens: config.maxTokens }),
      // 刻意不发 group：sub2api 的 /v1 不读请求体的 group 字段，
      // 分组由 API key 自身决定（backend/internal/server/middleware/api_key_auth.go
      // 从 key 加载 apiKey.Group）。发过去只会被忽略，还会误导读代码的人
      // 以为前端能切分组。要换分组得换 key。
    };

    // 非流式分支：设置面板可以关掉「流式输出」。
    // useStreamRequest 只会解析 SSE，拿普通 JSON 响应去跑 splitSseLines 会
    // 得到空事件 → 空回复。所以这条路径必须单独走 fetch。
    if (config.stream === false) {
      try {
        const res = await fetch(bridge.chatUrl, {
          method: 'POST',
          headers: bridge.getHeaders(),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        if (!res.ok) {
          const err = parseStreamErrorDetails(text, res.status, res.statusText);
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.key === assistantKey);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              status: MESSAGE_STATUS.ERROR,
              errorCode: err.code,
              errorMessage: err.message,
              completedAt: Date.now(),
            };
            return next;
          });
          activeKeyRef.current = null;
          return;
        }
        const data = JSON.parse(text);
        const choice = data?.choices?.[0];
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.key === assistantKey);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...applyChatCompletionChoice(next[idx], choice),
            status: MESSAGE_STATUS.COMPLETE,
          };
          return next;
        });
        const u = data?.usage;
        if (u) {
          onUsage?.({
            inputTokens: Number(u.prompt_tokens ?? u.input_tokens ?? 0) || 0,
            outputTokens: Number(u.completion_tokens ?? u.output_tokens ?? 0) || 0,
            cost: typeof u.cost === 'number' ? u.cost : null,
            model: data?.model || config.model,
          });
        }
      } catch (e) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.key === assistantKey);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            status: MESSAGE_STATUS.ERROR,
            errorMessage: e?.message || '网络错误',
            completedAt: Date.now(),
          };
          return next;
        });
      } finally {
        activeKeyRef.current = null;
      }
      return;
    }

    start({
      url: bridge.chatUrl,
      headers: bridge.getHeaders(),
      payload,
      onFlush: (batch) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.key === assistantKey);
          if (idx === -1) return prev;
          const next = [...prev];
          let msg = next[idx];
          for (const u of batch) msg = applyStreamingChunk(msg, u.type, u.chunk);
          next[idx] = msg;
          return next;
        });
      },
      onRawResponse: (raw) => {
        try { sessionStorage.setItem('chat_last_raw', JSON.stringify(raw)); } catch { /* 配额满，忽略 */ }
        // 最后一个 SSE chunk 常带 usage（token 数）—— 交给上层累加本会话用量。
        // 不同上游字段名不统一，这里做兼容映射。
        const u = raw?.usage;
        if (u && typeof u === 'object') {
          const inTok = u.prompt_tokens ?? u.input_tokens ?? 0;
          const outTok = u.completion_tokens ?? u.output_tokens ?? 0;
          if (inTok || outTok) {
            onUsage?.({
              inputTokens: Number(inTok) || 0,
              outputTokens: Number(outTok) || 0,
              // 有些网关直接回 cost，有就用真值
              cost: typeof u.cost === 'number' ? u.cost : null,
              model: raw?.model || config.model,
            });
          }
        }
      },
      onError: (err) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.key === assistantKey);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            status: MESSAGE_STATUS.ERROR,
            errorCode: err.code,
            errorMessage: err.message,
            completedAt: Date.now(),
            isReasoningStreaming: false,
          };
          return next;
        });
        activeKeyRef.current = null;
      },
      onDone: () => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.key === assistantKey);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = completeAssistantMessage(next[idx]);
          return next;
        });
        activeKeyRef.current = null;
      },
    });
  }, [apiBridge, config, setMessages, start, onUsage, convergeActive]);

  const send = useCallback(async ({ text, images }) => {
    const trimmedText = text?.trim();
    if (!trimmedText && !images?.length) return;
    // 连点/重复 Enter 时直接忽略，否则两次 send 都基于同一份 messagesRef
    // 各自 push 一套 user+loading，UI 上会出现两条重复的用户消息。
    if (sendingRef.current) return;
    sendingRef.current = true;

    const userMessage = images?.length
      ? {
          ...createUserMessage(trimmedText || ''),
          images: images.map((u) => ({ type: 'image_url', image_url: { url: u } })),
        }
      : createUserMessage(trimmedText);
    const loading = createLoadingAssistantMessage();

    const nextMessages = [...messagesRef.current, userMessage, loading];
    setMessages(nextMessages);

    // 历史 = 到用户消息为止（不含 loading 占位）
    const historyForApi = toApiMessages(
      nextMessages.slice(0, -1),
      config.systemPrompt
    );
    try {
      await runStream(historyForApi, loading.key);
    } finally {
      sendingRef.current = false;
    }
  }, [config.systemPrompt, setMessages, runStream]);

  // 重发：切掉目标助手消息及其后，重新请求
  const regenerate = useCallback(async (assistantKey) => {
    const current = messagesRef.current;
    const idx = current.findIndex((m) => m.key === assistantKey);
    if (idx === -1) return;

    const base = current.slice(0, idx); // 去掉该助手消息及之后
    const loading = createLoadingAssistantMessage();
    const nextMessages = [...base, loading];
    setMessages(nextMessages);

    const historyForApi = toApiMessages(base, config.systemPrompt);
    await runStream(historyForApi, loading.key);
  }, [config.systemPrompt, setMessages, runStream]);

  // 编辑用户消息后重发
  const editAndResend = useCallback(async (userKey, newContent) => {
    const current = messagesRef.current;
    const idx = current.findIndex((m) => m.key === userKey);
    if (idx === -1) return;

    const edited = {
      ...current[idx],
      content: newContent,
      versions: [
        ...(current[idx].versions || []),
        { id: crypto.randomUUID(), content: newContent },
      ],
    };
    const base = [...current.slice(0, idx), edited];
    const loading = createLoadingAssistantMessage();
    setMessages([...base, loading]);

    const historyForApi = toApiMessages(base, config.systemPrompt);
    await runStream(historyForApi, loading.key);
  }, [config.systemPrompt, setMessages, runStream]);

  // BTW 并行侧问：不打断主生成，不写进对话历史。
  // 复用当前上下文的摘要（最近 N 条消息），发一个非流式请求，拿到答案就返回。
  // 参考 Claude Code /btw：side question runs independently and doesn't
  // interrupt the main turn；只有上下文可见性，无工具。
  const askBtw = useCallback(async (question) => {
    let bridge;
    try {
      bridge = await apiBridge.resolve();
    } catch (err) {
      return { error: err?.message || 'API key 获取失败' };
    }

    // 侧问上下文：最近 12 条，只取完成的内容，压缩体积
    const ctx = messagesRef.current
      .filter((m) => m.status === MESSAGE_STATUS.COMPLETE && m.content?.trim())
      .slice(-12)
      .map((m) => ({
        role: m.from === MESSAGE_ROLES.USER ? 'user' : 'assistant',
        content: m.content,
      }));

    const payload = {
      model: config.model,
      messages: [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        ...ctx,
        {
          role: 'user',
          content: `[旁路快速提问，仅回答这个问题，不要展开成完整任务]\n${question}`,
        },
      ],
      stream: false,
      max_tokens: 1024,
    };

    try {
      const res = await fetch(bridge.chatUrl, {
        method: 'POST',
        headers: bridge.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { error: `${res.status}: ${txt.slice(0, 200)}` };
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      if (!content) return { error: '模型没有返回内容' };
      return { content };
    } catch (err) {
      return { error: err?.message || '网络错误' };
    }
  }, [apiBridge, config.model, config.systemPrompt]);

  return {
    send,
    stop: stopGenerating,
    regenerate,
    editAndResend,
    askBtw,
    getActiveKey: () => activeKeyRef.current,
  };
}
