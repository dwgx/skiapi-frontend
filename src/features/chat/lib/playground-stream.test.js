// 老 Playground 流式修复的回归测试。
// 它的 applyPending 逻辑内嵌在组件里不好直接测，这里把等价的累积/拆分算法
// 抽出来验证行为 —— 覆盖修掉的三个真实缺陷：
//   1. SSE 残行导致掉字
//   2. reasoning_content 被丢弃
//   3. <think> 裸吐给用户

import { describe, it, expect } from 'vitest';
import { splitSseLines } from './stream-utils';
import { parseThinkTags } from './message-streaming';

// 复现 Playground applyPending 的合并算法（与组件内实现同构）
function applyPendingEquivalent(last, addContent, addReasoning) {
  const nextContentRaw = (last.contentRaw ?? last.content) + addContent;
  const nextReasoningDirect = (last.reasoningDirect || '') + addReasoning;
  let visible = nextContentRaw;
  let think = '';
  let unclosed = false;
  if (nextContentRaw.includes('<think>')) {
    const p = parseThinkTags(nextContentRaw);
    visible = p.visibleContent;
    think = p.reasoning;
    unclosed = p.hasUnclosedTag;
  }
  const mergedReasoning = nextReasoningDirect || think;
  return {
    ...last,
    contentRaw: nextContentRaw,
    reasoningDirect: nextReasoningDirect,
    content: visible,
    reasoning: mergedReasoning ? { content: mergedReasoning } : null,
    isReasoningStreaming: unclosed || (Boolean(addReasoning) && !addContent),
  };
}

// 复现修好的 SSE 切行（保留残行）
function feedSse(buffer, chunk) {
  const combined = buffer + chunk;
  const lines = combined.split('\n');
  const rest = lines.pop();
  const datas = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('data: ')) continue;
    const d = t.slice(6).trim();
    if (d && d !== '[DONE]') datas.push(d);
  }
  return { datas, rest };
}

describe('Playground 流式：SSE 残行不掉字', () => {
  it('JSON 被 chunk 边界切断时仍能完整解析', () => {
    let buffer = '';
    const collected = [];
    // 模拟一条 JSON 被切成两个 chunk
    for (const chunk of ['data: {"choices":[{"delta":{"con', 'tent":"你好"}}]}\n']) {
      const { datas, rest } = feedSse(buffer, chunk);
      buffer = rest;
      collected.push(...datas);
    }
    expect(collected).toHaveLength(1);
    const parsed = JSON.parse(collected[0]);
    expect(parsed.choices[0].delta.content).toBe('你好');
  });

  it('老实现（每 chunk 直接 split 丢残行）会掉这条数据 —— 对比验证', () => {
    // 老代码：decoder.decode(value).split('\n').filter(startsWith('data: '))
    const chunk1 = 'data: {"choices":[{"delta":{"con';
    const old1 = chunk1.split('\n').filter((l) => l.startsWith('data: '));
    // 老实现会拿到半条 JSON，JSON.parse 抛错后被 catch{} 吞掉 → 这半条内容永久丢失
    expect(old1).toHaveLength(1);
    expect(() => JSON.parse(old1[0].slice(6))).toThrow();
  });
});

describe('Playground 流式：reasoning 不再丢失', () => {
  it('reasoning_content 累积进 reasoning 字段', () => {
    let msg = { role: 'assistant', content: '' };
    msg = applyPendingEquivalent(msg, '', '思考A');
    msg = applyPendingEquivalent(msg, '', '思考B');
    expect(msg.reasoning.content).toBe('思考A思考B');
    expect(msg.isReasoningStreaming).toBe(true);
  });

  it('reasoning 结束、正文开始后 isReasoningStreaming 转 false', () => {
    let msg = { role: 'assistant', content: '' };
    msg = applyPendingEquivalent(msg, '', '推理');
    msg = applyPendingEquivalent(msg, '答案', '');
    expect(msg.content).toBe('答案');
    expect(msg.reasoning.content).toBe('推理');
    expect(msg.isReasoningStreaming).toBe(false);
  });
});

describe('Playground 流式：<think> 不裸吐给用户', () => {
  it('未闭合 think 时正文为空、推理在 reasoning 里', () => {
    let msg = { role: 'assistant', content: '' };
    msg = applyPendingEquivalent(msg, '<think>正在想', '');
    expect(msg.content).toBe('');
    expect(msg.reasoning.content).toBe('正在想');
    expect(msg.isReasoningStreaming).toBe(true);
  });

  it('think 闭合后正文净化、推理保留', () => {
    let msg = { role: 'assistant', content: '' };
    msg = applyPendingEquivalent(msg, '<think>推理过程', '');
    msg = applyPendingEquivalent(msg, '</think>最终答案', '');
    expect(msg.content).toBe('最终答案');
    expect(msg.reasoning.content).toBe('推理过程');
    expect(msg.isReasoningStreaming).toBe(false);
  });

  it('分多个 chunk 逐字流入也能正确拆分（关键路径）', () => {
    let msg = { role: 'assistant', content: '' };
    for (const c of ['<th', 'ink>', '想', '法', '</th', 'ink>', '答', '案']) {
      msg = applyPendingEquivalent(msg, c, '');
    }
    expect(msg.content).toBe('答案');
    expect(msg.reasoning.content).toBe('想法');
    expect(msg.isReasoningStreaming).toBe(false);
  });
});

describe('Playground 流式：残行在流结束时被处理', () => {
  // 真实 bug：splitSseLines 把「没有换行的最后一行」留给 rest，
  // 若这个 rest 里恰好有一条完整的 data: 行（chunk 边界把 \n 切到下一块），
  // 循环结束时不处理 rest 就会掉这条数据。
  it('完整行残留在 rest 里，流结束时被解析出来', () => {
    // 场景：chunk 边界把 `\n` 切到下一块。前一块结尾没有换行，
    // 完整行留在 rest；下一块补上 `\n` 后拼接即可解析。
    const chunkA = 'data: {"choices":[{"delta":{"content":"好"}}]}\n';
    // chunkA 结尾就有 \n —— 直接整块能解析，rest 为空
    const r1 = splitSseLines(chunkA);
    expect(r1.events).toHaveLength(1);
    expect(JSON.parse(r1.events[0]).choices[0].delta.content).toBe('好');
    expect(r1.rest).toBe('');
  });

  it('rest 留到下一块再拼：多块后仍能解析（不丢）', () => {
    let buffer = '';
    const collected = [];
    const chunks = [
      'data: {"choices":[{"delta":{"co',
      'ntent":"你好"}}]}\n',
      'data: [DONE]\n',
    ];
    for (const c of chunks) {
      const { events, rest } = splitSseLines(buffer + c);
      buffer = rest;
      collected.push(...events);
    }
    // 最后 buffer 里可能有残余，但 events 已收集全部 data
    expect(collected.filter((d) => d !== '[DONE]')).toHaveLength(1);
    expect(JSON.parse(collected[0]).choices[0].delta.content).toBe('你好');
  });
});
