// 流式请求控制器：generation 计数器 + 50ms 批量 flush。
// 架构来自 New API 的 use-stream-request / use-chat-handler（Calcium-Ion/new-api，
// AGPL-3.0，Copyright (C) 2023-2026 QuantumNous）。派生作品，随仓库以 AGPL-3.0 分发。
//
// 解决老 Playground 两个真实缺陷：
//   1. 连点发送 / 停止后旧流的回调仍在写 state → 串流。这里用 generation 递增，
//      任何过期回调 isCurrent() 为 false 直接丢弃，天然处理竞态与组件卸载。
//   2. 每个 SSE chunk 一次 setState → 长回复重渲染上千次。这里把 chunk 先进
//      pending buffer，50ms 定时 flush 一次。

import { useCallback, useEffect, useRef } from 'react';
import { splitSseLines, parseStreamMessageUpdates, parseStreamErrorDetails } from '../lib/stream-utils';

const FLUSH_INTERVAL_MS = 50;

export function useStreamRequest() {
  const generationRef = useRef(0);
  const abortRef = useRef(null);
  const flushTimerRef = useRef(null);
  const pendingRef = useRef([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // 卸载即失效所有在途回调
      generationRef.current += 1;
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1; // 让在途回调全部过期
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    pendingRef.current = [];
  }, []);

  /**
   * 发起流式请求。
   * @param {object} opts
   * @param {string} opts.url
   * @param {object} opts.headers
   * @param {object} opts.payload
   * @param {(updates:Array<{type:string,chunk:string}>)=>void} opts.onFlush 批量更新
   * @param {(err:{code,message,display})=>void} opts.onError
   * @param {()=>void} opts.onDone
   * @param {(raw:any)=>void} [opts.onRawResponse] 调试面板用
   */
  const start = useCallback(async ({ url, headers, payload, onFlush, onError, onDone, onRawResponse }) => {
    stop(); // 新请求前先失效旧的
    const myGeneration = generationRef.current;
    const isCurrent = () => mountedRef.current && generationRef.current === myGeneration;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // 批量 flush：定时把 pending buffer 一次性交给调用方
    flushTimerRef.current = setInterval(() => {
      if (!isCurrent()) return;
      if (!pendingRef.current.length) return;
      const batch = pendingRef.current;
      pendingRef.current = [];
      onFlush(batch);
    }, FLUSH_INTERVAL_MS);

    const finish = () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // 收尾把残余 buffer 交出去
      if (isCurrent() && pendingRef.current.length) {
        const batch = pendingRef.current;
        pendingRef.current = [];
        onFlush(batch);
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      if (!isCurrent()) return;

      if (!response.ok) {
        const errText = await response.text();
        if (!isCurrent()) return;
        finish();
        onRawResponse?.(errText);
        onError(parseStreamErrorDetails(errText, response.status, response.statusText));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let lastRaw = null;

      while (true) {
        const { done, value } = await reader.read();
        if (!isCurrent()) return;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = splitSseLines(buffer);
        buffer = rest; // 残行留到下轮，避免切断 JSON

        for (const data of events) {
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            lastRaw = parsed;
            const updates = parseStreamMessageUpdates(parsed);
            if (updates.length) pendingRef.current.push(...updates);
          } catch {
            // 单条解析失败不影响整流
          }
        }
      }

      // 冲刷 TextDecoder 内部残留的多字节 UTF-8 序列。
      // stream:true 会把不完整的多字节字符留在内部 buffer 等下一块，
      // 但如果流在字符中间结束（中文回复的最后几个字恰好被切断），
      // 残留字节会永远卡在解码器里 → 掉字。无参 decode() 强制冲刷。
      if (!isCurrent()) return;
      const flushed = decoder.decode();
      if (flushed) {
        buffer += flushed;
        const { events, rest } = splitSseLines(buffer);
        buffer = rest;
        for (const data of events) {
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            lastRaw = parsed;
            const updates = parseStreamMessageUpdates(parsed);
            if (updates.length) pendingRef.current.push(...updates);
          } catch { /* 忽略 */ }
        }
      }

      if (!isCurrent()) return;
      finish();
      onRawResponse?.(lastRaw);
      onDone();
    } catch (err) {
      if (!isCurrent()) return;
      finish();
      if (err?.name === 'AbortError') return; // 主动停止不报错
      onError({ code: null, message: err?.message || '网络错误', display: err?.message || '网络错误' });
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }, [stop]);

  return { start, stop };
}
