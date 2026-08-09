// 持久化失败必须可被感知的回归测试。
//
// 修的问题：saveMessages 原来在两种失败下都静默返回 —— 超过体积上限时
// 直接 return，配额满时被 catch 吞掉。用户以为存了，刷新后最近的消息全没，
// 且没有任何提示。现在返回结果码，上层据此显示警告横幅。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveMessages, loadMessages, SAVE_OK, SAVE_TOO_LARGE, SAVE_QUOTA_FULL } from './storage';

// 极简 localStorage 桩
function makeStorage(opts = {}) {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (opts.throwOnSet) throw new DOMException('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => map.delete(k),
    get length() { return map.size; },
    key: (i) => [...map.keys()][i],
    _map: map,
  };
}

const msg = (content) => ({
  key: crypto.randomUUID(),
  from: 'user',
  content,
});

let original;
beforeEach(() => { original = globalThis.localStorage; });
afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true });
  vi.restoreAllMocks();
});

function useStorage(st) {
  Object.defineProperty(globalThis, 'localStorage', { value: st, configurable: true, writable: true });
}

describe('saveMessages 返回结果码', () => {
  it('正常保存返回 ok，且能读回', () => {
    const st = makeStorage();
    useStorage(st);
    expect(saveMessages([msg('你好')], 'k')).toBe(SAVE_OK);
    expect(loadMessages('k')).toHaveLength(1);
  });

  it('空数组视为清空，返回 ok', () => {
    const st = makeStorage();
    useStorage(st);
    saveMessages([msg('x')], 'k');
    expect(saveMessages([], 'k')).toBe(SAVE_OK);
    expect(loadMessages('k')).toHaveLength(0);
  });

  it('超过体积上限返回 too_large，且不覆盖旧数据（回归：旧实现静默 return）', () => {
    const st = makeStorage();
    useStorage(st);
    // 先存一份正常数据
    saveMessages([msg('旧数据')], 'k');
    // 再存一份超大的：120 条 × 12 万字，必然超过 500KB 上限
    const huge = Array.from({ length: 120 }, () => msg('z'.repeat(120_000)));
    expect(saveMessages(huge, 'k')).toBe(SAVE_TOO_LARGE);
    // 旧数据仍在（保留而不是写爆）
    expect(loadMessages('k')[0].content).toBe('旧数据');
  });

  it('配额满（setItem 抛异常）返回 quota_full（回归：旧实现被 catch 吞掉）', () => {
    useStorage(makeStorage({ throwOnSet: true }));
    expect(saveMessages([msg('你好')], 'k')).toBe(SAVE_QUOTA_FULL);
  });

  it('非数组输入不算失败', () => {
    useStorage(makeStorage());
    expect(saveMessages(null, 'k')).toBe(SAVE_OK);
    expect(saveMessages(undefined, 'k')).toBe(SAVE_OK);
  });
});

describe('loadMessages 容错', () => {
  it('坏 JSON 返回空数组而不是抛异常', () => {
    const st = makeStorage();
    useStorage(st);
    st.setItem('k', '{broken');
    expect(loadMessages('k')).toEqual([]);
  });

  it('非数组内容返回空数组', () => {
    const st = makeStorage();
    useStorage(st);
    st.setItem('k', '{"a":1}');
    expect(loadMessages('k')).toEqual([]);
  });

  it('过滤掉结构非法的消息', () => {
    const st = makeStorage();
    useStorage(st);
    st.setItem('k', JSON.stringify([
      { key: 'a', from: 'user', content: '合法' },
      { nope: 1 },
      { key: 'b', from: 'weird', content: 'x' },
      null,
    ]));
    const out = loadMessages('k');
    expect(out).toHaveLength(1);
    expect(out[0].content).toBe('合法');
  });
});
