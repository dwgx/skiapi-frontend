/*
 * Copyright (C) 2026 dwgx
 * Portions derived from New API (Calcium-Ion/new-api),
 * Copyright (C) 2023-2026 QuantumNous — licensed under AGPL-3.0.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// Reasoning（思维链）双轨处理。
// 轨道一：SSE delta.reasoning_content 字段直接拼接
// 轨道二：内联 <think>...</think> 标签实时拆分（含未闭合 tag，流式中实时归入 reasoning）
// parseThinkTags / processStreamingContent / finalizeMessage / sanitizeMessagesOnLoad
// 的算法来自 New API 的 features/playground/lib/message/*，移植为本仓库的 JS 消息模型。

import {
  getCurrentVersion,
  updateCurrentVersionContent,
  MESSAGE_ROLES,
  MESSAGE_STATUS,
} from '../types';

// ─── <think> 标签解析 ──────────────────────────────────────────────────────

/**
 * 把内容拆成「可见文本 + 推理文本」。
 * 处理完整与未闭合两种 <think> 标签（流式中 tag 可能只到一半）。
 */
export function parseThinkTags(content) {
  if (!content.includes('<think>')) {
    return { visibleContent: content, reasoning: '', hasUnclosedTag: false };
  }

  const visibleParts = [];
  const reasoningParts = [];
  let currentPos = 0;
  let hasUnclosedTag = false;

  while (true) {
    const openPos = content.indexOf('<think>', currentPos);
    if (openPos === -1) {
      if (currentPos < content.length) visibleParts.push(content.slice(currentPos));
      break;
    }
    if (openPos > currentPos) visibleParts.push(content.slice(currentPos, openPos));
    const closePos = content.indexOf('</think>', openPos + 7);
    if (closePos === -1) {
      reasoningParts.push(content.slice(openPos + 7));
      hasUnclosedTag = true;
      break;
    }
    reasoningParts.push(content.slice(openPos + 7, closePos));
    currentPos = closePos + 8;
  }

  return {
    visibleContent: visibleParts.join('').trim(),
    reasoning: reasoningParts.join('\n\n').trim(),
    hasUnclosedTag,
  };
}

// ─── 流式更新 ─────────────────────────────────────────────────────────────

/**
 * 流式处理 content chunk：
 * - 无 <think> 时走快速路径，直接追加
 * - 有 <think> 时实时拆分，reasoning 走独立字段
 * 注意：versions 当前版本内容在流式中保留完整原始内容（含 tag），
 * 最终展示时才净化成纯可见文本。
 */
export function processStreamingContent(message, contentChunk) {
  const currentVersion = getCurrentVersion(message);
  const fullContent = contentChunk
    ? currentVersion.content + contentChunk
    : currentVersion.content;

  // 快速路径：从未出现 <think>，也没有 reasoning
  if (!message.reasoning && !fullContent.includes('<think>')) {
    return {
      ...updateCurrentVersionContent(message, fullContent),
      isReasoningStreaming: false,
    };
  }

  const { reasoning, hasUnclosedTag } = parseThinkTags(fullContent);
  const finalReasoning = reasoning
    ? {
        startedAt: message.reasoning?.startedAt || Date.now(),
        content: reasoning,
      }
    : message.reasoning;

  return {
    ...updateCurrentVersionContent(message, fullContent),
    reasoning: finalReasoning,
    isReasoningStreaming: hasUnclosedTag,
  };
}

// 去重追加：SSE 可能重复发同样的前缀，不能重复拼
function getAppendableChunk(currentContent, chunk) {
  if (!currentContent || !chunk.startsWith(currentContent)) return chunk;
  return chunk.slice(currentContent.length);
}

/**
 * 流式 chunk 应用到消息。
 * type='reasoning'：走 reasoning_content 字段（轨道一）
 * type='content'：走 content + <think> 拆分（轨道二）
 */
export function applyStreamingChunk(message, type, chunk) {
  if (message.status === MESSAGE_STATUS.ERROR) return message;

  if (type === 'reasoning') {
    const reasoning = {
      startedAt: message.reasoning?.startedAt || Date.now(),
      content: (message.reasoning?.content || '') + getAppendableChunk(message.reasoning?.content || '', chunk),
    };
    return {
      ...message,
      reasoning,
      isReasoningStreaming: true,
      status: MESSAGE_STATUS.STREAMING,
    };
  }

  const currentVersion = getCurrentVersion(message);
  const appendableChunk = getAppendableChunk(currentVersion.content, chunk);
  const contentMessage = processStreamingContent(message, appendableChunk);

  return {
    ...(contentMessage.isReasoningStreaming ? contentMessage : { ...contentMessage }),
    status: MESSAGE_STATUS.STREAMING,
  };
}

// ─── 收尾 ─────────────────────────────────────────────────────────────────

/**
 * 流式结束后最终收敛：
 * - 把 versions 当前版本内容净化成纯可见文本（去掉 <think> 段）
 * - reasoning 合并三来源：SSE reasoning_content > 流式已积累 > <think> 解析
 */
export function finalizeMessage(message, apiReasoningContent) {
  const currentVersion = getCurrentVersion(message);
  const parsedThinkTags = currentVersion.content.includes('<think>')
    ? parseThinkTags(currentVersion.content)
    : undefined;
  const visibleContent = parsedThinkTags?.visibleContent ?? currentVersion.content;
  const finalReasoning =
    apiReasoningContent ||
    message.reasoning?.content ||
    parsedThinkTags?.reasoning ||
    '';

  const finalized = {
    ...updateCurrentVersionContent(message, visibleContent),
    reasoning: finalReasoning
      ? {
          startedAt: message.reasoning?.startedAt || Date.now(),
          content: finalReasoning,
        }
      : undefined,
    isReasoningStreaming: false,
    completedAt: Date.now(),
    durationMs: Date.now() - (message.startedAt || Date.now()),
  };
  return finalized;
}

export function completeAssistantMessage(message) {
  return finalizeMessage({
    ...message,
    status: MESSAGE_STATUS.COMPLETE,
  });
}

// 从 /v1/chat/completions 的非流式响应提取
export function applyChatCompletionChoice(message, choice) {
  const content = choice?.message?.content || '';
  const reasoning = choice?.message?.reasoning_content || choice?.message?.reasoning || '';
  return finalizeMessage(
    updateCurrentVersionContent(message, content),
    reasoning
  );
}

export function isAssistantMessagePending(message) {
  return (
    message?.from === MESSAGE_ROLES.ASSISTANT &&
    (message?.status === MESSAGE_STATUS.LOADING ||
      message?.status === MESSAGE_STATUS.STREAMING)
  );
}

/**
 * 加载时收敛：把卡在 loading/streaming 的残留消息收敛成 complete/error。
 * 否则刷新页面会出现"永远转圈"的幽灵消息。
 */
export function sanitizeMessagesOnLoad(messages) {
  let targetIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (isAssistantMessagePending(messages[i])) {
      targetIndex = i;
      break;
    }
  }
  if (targetIndex === -1) return messages;

  const msg = messages[targetIndex];
  const hasContent = Boolean(msg.content?.trim()) || Boolean(msg.reasoning?.content?.trim());
  const sanitized = hasContent
    ? { ...completeAssistantMessage(msg) }
    : {
        ...completeAssistantMessage(msg),
        content: '请求被中断，未收到模型回复',
        status: MESSAGE_STATUS.ERROR,
        errorCode: 'INTERRUPTED',
      };

  const result = [...messages];
  result[targetIndex] = sanitized;
  return result;
}
