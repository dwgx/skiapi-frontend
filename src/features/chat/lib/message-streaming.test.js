// 核心纯函数测试。这几个函数是聊天正确性的地基：
// think 标签拆分错了 → 用户看到裸 <think>；SSE 切行错了 → 掉字。

import { describe, it, expect } from 'vitest';
import { parseThinkTags, processStreamingContent, finalizeMessage, sanitizeMessagesOnLoad, applyStreamingChunk } from './message-streaming';
import { splitSseLines, parseStreamMessageUpdates } from './stream-utils';
import { createLoadingAssistantMessage, getCurrentVersion, MESSAGE_STATUS } from '../types';

describe('parseThinkTags', () => {
  it('无 think 标签时原样返回', () => {
    const r = parseThinkTags('hello world');
    expect(r.visibleContent).toBe('hello world');
    expect(r.reasoning).toBe('');
    expect(r.hasUnclosedTag).toBe(false);
  });

  it('拆分完整 think 标签', () => {
    const r = parseThinkTags('<think>推理过程</think>最终答案');
    expect(r.reasoning).toBe('推理过程');
    expect(r.visibleContent).toBe('最终答案');
    expect(r.hasUnclosedTag).toBe(false);
  });

  it('未闭合 think 标签归入 reasoning 并标记（流式关键路径）', () => {
    const r = parseThinkTags('<think>思考了一半');
    expect(r.reasoning).toBe('思考了一半');
    expect(r.visibleContent).toBe('');
    expect(r.hasUnclosedTag).toBe(true);
  });

  it('处理 think 前后都有正文的情况', () => {
    const r = parseThinkTags('前言<think>推理</think>结论');
    expect(r.visibleContent).toBe('前言结论');
    expect(r.reasoning).toBe('推理');
  });

  it('处理多段 think', () => {
    const r = parseThinkTags('<think>A</think>中间<think>B</think>尾');
    expect(r.reasoning).toBe('A\n\nB');
    expect(r.visibleContent).toBe('中间尾');
  });
});

describe('processStreamingContent', () => {
  it('无 think 走快速路径，isReasoningStreaming 为 false', () => {
    const msg = createLoadingAssistantMessage();
    const out = processStreamingContent(msg, 'hello');
    expect(out.content).toBe('hello');
    expect(out.isReasoningStreaming).toBe(false);
  });

  it('流式中未闭合 think 时标记 isReasoningStreaming', () => {
    const msg = createLoadingAssistantMessage();
    const out = processStreamingContent(msg, '<think>思考中');
    expect(out.isReasoningStreaming).toBe(true);
    expect(out.reasoning?.content).toBe('思考中');
  });

  it('think 闭合后 isReasoningStreaming 转 false', () => {
    let msg = createLoadingAssistantMessage();
    msg = processStreamingContent(msg, '<think>推理');
    expect(msg.isReasoningStreaming).toBe(true);
    msg = processStreamingContent(msg, '</think>答案');
    expect(msg.isReasoningStreaming).toBe(false);
    expect(msg.reasoning?.content).toBe('推理');
  });
});

describe('finalizeMessage', () => {
  it('收尾时把 think 段从可见内容里净化掉', () => {
    let msg = createLoadingAssistantMessage();
    msg = processStreamingContent(msg, '<think>内部推理</think>对外答案');
    const out = finalizeMessage(msg);
    expect(out.content).toBe('对外答案');
    expect(out.reasoning?.content).toBe('内部推理');
  });

  it('API 的 reasoning_content 优先于 think 解析结果', () => {
    let msg = createLoadingAssistantMessage();
    msg = processStreamingContent(msg, '<think>标签里的</think>答案');
    const out = finalizeMessage(msg, 'API 给的推理');
    expect(out.reasoning?.content).toBe('API 给的推理');
  });
});

describe('sanitizeMessagesOnLoad', () => {
  it('把卡住的 streaming 消息收敛成 complete（有内容）', () => {
    const stuck = { ...createLoadingAssistantMessage(), status: MESSAGE_STATUS.STREAMING, content: '半截回复' };
    const out = sanitizeMessagesOnLoad([stuck]);
    expect(out[0].status).toBe(MESSAGE_STATUS.COMPLETE);
  });

  it('无内容的卡住消息收敛成 error（避免永远转圈）', () => {
    const stuck = { ...createLoadingAssistantMessage(), status: MESSAGE_STATUS.LOADING, content: '' };
    const out = sanitizeMessagesOnLoad([stuck]);
    expect(out[0].status).toBe(MESSAGE_STATUS.ERROR);
  });

  it('已完成的消息不动', () => {
    const done = { ...createLoadingAssistantMessage(), status: MESSAGE_STATUS.COMPLETE, content: 'ok' };
    const out = sanitizeMessagesOnLoad([done]);
    expect(out[0].status).toBe(MESSAGE_STATUS.COMPLETE);
  });
});

describe('splitSseLines', () => {
  it('保留未完成的残行到下一轮（防掉字）', () => {
    const { events, rest } = splitSseLines('data: {"a":1}\ndata: {"b"');
    expect(events).toEqual(['{"a":1}']);
    expect(rest).toBe('data: {"b"');
  });

  it('跨 chunk 拼接后能解析完整', () => {
    const first = splitSseLines('data: {"a":1}\ndata: {"b"');
    const second = splitSseLines(first.rest + ':2}\n');
    expect(second.events).toEqual(['{"b":2}']);
  });

  it('忽略非 data 行（注释/心跳）', () => {
    const { events } = splitSseLines(': keepalive\ndata: {"x":1}\n\n');
    expect(events).toEqual(['{"x":1}']);
  });
});

describe('parseStreamMessageUpdates', () => {
  it('解析 content delta', () => {
    const u = parseStreamMessageUpdates({ choices: [{ delta: { content: 'hi' } }] });
    expect(u).toEqual([{ type: 'content', chunk: 'hi' }]);
  });

  it('解析 reasoning_content delta（思维链轨道一）', () => {
    const u = parseStreamMessageUpdates({ choices: [{ delta: { reasoning_content: '想' } }] });
    expect(u).toEqual([{ type: 'reasoning', chunk: '想' }]);
  });

  it('一条消息同时带 reasoning 和 content 时拆成两个更新', () => {
    const u = parseStreamMessageUpdates({ choices: [{ delta: { reasoning_content: 'r', content: 'c' } }] });
    expect(u).toHaveLength(2);
    expect(u[0].type).toBe('reasoning');
    expect(u[1].type).toBe('content');
  });

  it('兼容 responses API 的 output_text.delta', () => {
    const u = parseStreamMessageUpdates({ type: 'response.output_text.delta', delta: 'x' });
    expect(u).toEqual([{ type: 'content', chunk: 'x' }]);
  });

  it('空 delta 不产生更新', () => {
    expect(parseStreamMessageUpdates({ choices: [{ delta: {} }] })).toEqual([]);
    expect(parseStreamMessageUpdates(null)).toEqual([]);
  });
});

// ── review 发现的两个真 bug 的回归测试（2026-08）──────────────────────

describe('去重逻辑不吞掉重复 token（P0 回归）', () => {
  const feed = (deltas) => {
    let m = createLoadingAssistantMessage();
    for (const d of deltas) m = applyStreamingChunk(m, 'content', d);
    return m;
  };

  // 旧实现只判断 chunk.startsWith(已累积内容)，于是增量模式下的重复
  // token 被当成「全量重发」整个吞掉。Markdown 列表 `1. `、加粗 `**`、
  // 连续空行都会踩到 —— 静默掉字。
  it.each([
    [['哈', '哈', '哈'], '哈哈哈'],
    [['1', '1'], '11'],
    [['\n', '\n'], '\n\n'],
    [['**', '**'], '****'],
    [['A', 'A'], 'AA'],
    [['- ', '- '], '- - '],
  ])('%j → %j', (deltas, expected) => {
    expect(feed(deltas).content).toBe(expected);
  });

  it('真正的累积模式仍然正确去重', () => {
    // 少数网关每次发全量：你 → 你好 → 你好啊
    expect(feed(['你', '你好', '你好啊']).content).toBe('你好啊');
  });

  it('reasoning 轨道同样不掉字', () => {
    let m = createLoadingAssistantMessage();
    for (const d of ['嗯', '嗯']) m = applyStreamingChunk(m, 'reasoning', d);
    expect(m.reasoning.content).toBe('嗯嗯');
  });
});

describe('流式期间不把 <think> 裸吐给用户（P1 回归）', () => {
  const feed = (deltas) => {
    let m = createLoadingAssistantMessage();
    for (const d of deltas) m = applyStreamingChunk(m, 'content', d);
    return m;
  };

  it('未闭合时 content 为空，原始内容留在 versions 供累积', () => {
    const m = feed(['<think>', '推理中']);
    // 渲染层读 content —— 不能看到裸标签
    expect(m.content).toBe('');
    expect(m.content).not.toContain('<think>');
    // 累积基于 versions —— 必须保留原始
    expect(getCurrentVersion(m).content).toBe('<think>推理中');
    expect(m.reasoning.content).toBe('推理中');
  });

  it('闭合后 content 只有正文', () => {
    const m = feed(['<think>', '推理', '</think>', '答案']);
    expect(m.content).toBe('答案');
    expect(getCurrentVersion(m).content).toBe('<think>推理</think>答案');
  });

  it('逐字流入也不漏标签', () => {
    const m = feed(['<th', 'ink>', '想', '法', '</th', 'ink>', '答', '案']);
    expect(m.content).toBe('答案');
    expect(m.reasoning.content).toBe('想法');
  });

  it('无 think 的普通内容不受影响', () => {
    expect(feed(['你', '好', '世界']).content).toBe('你好世界');
  });
});
