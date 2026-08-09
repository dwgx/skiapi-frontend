// 斜杠命令解析的回归测试。
//
// 修的真 bug：输入 `/mod` 时唯一命中 model，旧实现直接返回 partial:false 且
// 不给 matches，导致菜单不弹（用户以为功能坏了）。
// 现在 matches（该显示什么）和 command（能执行什么）是两个独立的概念。

import { describe, it, expect } from 'vitest';
import { parseSlashCommand, SLASH_COMMANDS } from './slashCommands';

describe('斜杠命令：菜单候选', () => {
  it('只输入 / 时列出全部命令', () => {
    const r = parseSlashCommand('/');
    expect(r.matches).toHaveLength(SLASH_COMMANDS.length);
    expect(r.typedName).toBe(true);
  });

  it('/mod 唯一命中 model 时仍然给候选（菜单要弹出来）', () => {
    const r = parseSlashCommand('/mod');
    expect(r.matches.map((c) => c.name)).toContain('model');
    expect(r.matches.length).toBeGreaterThan(0);
    // 同时也能执行
    expect(r.command?.name).toBe('model');
  });

  it('完整输入 /model 时菜单仍显示它（Enter 直接执行）', () => {
    const r = parseSlashCommand('/model');
    expect(r.matches[0].name).toBe('model');
    expect(r.command?.name).toBe('model');
  });

  it('输了空格进入填参数阶段 → 菜单收起', () => {
    const r = parseSlashCommand('/model claude');
    expect(r.matches).toHaveLength(0);
    expect(r.typedName).toBe(false);
    expect(r.command?.name).toBe('model');
    expect(r.args).toBe('claude');
  });

  it('多个前缀匹配都列出来', () => {
    // 目前没有共同前缀超过一个的命令，用 'c' 验证至少 clear 命中
    const r = parseSlashCommand('/c');
    expect(r.matches.map((c) => c.name)).toContain('clear');
  });

  it('不存在的命令没有候选也没有 command', () => {
    const r = parseSlashCommand('/zzzz');
    expect(r.matches).toHaveLength(0);
    expect(r.command).toBeNull();
  });

  it('非斜杠输入返回 null', () => {
    expect(parseSlashCommand('你好')).toBeNull();
    expect(parseSlashCommand('')).toBeNull();
  });

  it('args 保留空格（/btw 的问题可能很长）', () => {
    const r = parseSlashCommand('/btw 刚才那段代码用了什么库');
    expect(r.args).toBe('刚才那段代码用了什么库');
  });
});

describe('斜杠命令：参数元信息（Tab 补全提示用）', () => {
  it('需要参数的命令声明了 args 提示', () => {
    const byName = Object.fromEntries(SLASH_COMMANDS.map((c) => [c.name, c]));
    expect(byName.model.args).toBeTruthy();
    expect(byName.websearch.args).toBeTruthy();
    expect(byName.btw.args).toBeTruthy();
    // 无参数命令不需要
    expect(byName.clear.args).toBeUndefined();
    expect(byName.help.args).toBeUndefined();
  });

  it('websearch 声明了有限候选值', () => {
    const ws = SLASH_COMMANDS.find((c) => c.name === 'websearch');
    expect(ws.argValues).toEqual(['on', 'off']);
  });
});

describe('斜杠命令：/websearch 布尔解析', () => {
  const run = (args) => {
    let captured;
    const setConfig = (fn) => { captured = fn({ webSearch: false }); };
    const ws = SLASH_COMMANDS.find((c) => c.name === 'websearch');
    ws.run(args, { setConfig });
    return captured.webSearch;
  };

  it('on/1/true/yes 都是开', () => {
    for (const v of ['on', '1', 'true', 'yes']) expect(run(v)).toBe(true);
  });

  it('off/0/false/no 都是关', () => {
    for (const v of ['off', '0', 'false', 'no']) expect(run(v)).toBe(false);
  });

  it('无参数是切换（从 false 切到 true）', () => {
    expect(run('')).toBe(true);
  });
});
