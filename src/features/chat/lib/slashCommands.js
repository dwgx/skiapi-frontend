// 斜杠命令。参考 Claude Code 的交互：
//   - 输入 `/` 弹出命令菜单
//   - 命令可带参数（如 /model claude）
//   - 生成中 /btw 可并行侧问
//
// 命令列表：
//   /model <name>     切换模型（<name> 可选，缺省弹出模型搜索）
//   /websearch on|off 开关联网
//   /btw <question>   旁路快速提问（不打断主生成）
//   /clear            清空当前会话
//   /help             列出全部命令

export const SLASH_COMMANDS = [
  {
    name: 'model',
    label: '切换模型',
    desc: '切换模型，可带名字参数模糊匹配，如 /model claude',
    icon: 'model',
    // args: Tab 补全后提示要填什么；argValues: 有限候选（供二级补全）
    args: '[模型名]',
    // 不直接把参数当模型名写进 config —— 用户输入的多是模糊词（claude/gpt），
    // 直接写会设成一个不存在的模型 ID，请求必然失败。
    // 这里只返回意图 + 过滤词，由 ChatApp 弹出模型选择菜单让用户从真实列表里选。
    run: (args) => ({ type: 'model', query: args.trim() }),
  },
  {
    name: 'websearch',
    label: '联网搜索',
    desc: '开/关联网搜索：/websearch on 或 /websearch off',
    icon: 'web',
    args: '[on|off]',
    argValues: ['on', 'off'],
    run: (args, { setConfig }) => {
      const v = args.trim().toLowerCase();
      // 无参数 = 切换；on/1/true = 开；off/0/false = 关
      const OFF = ['off', '0', 'false', 'no'];
      const ON = ['on', '1', 'true', 'yes'];
      let next = null; // null 表示切换
      if (ON.includes(v)) next = true;
      else if (OFF.includes(v)) next = false;
      setConfig((c) => ({ ...c, webSearch: next === null ? !c.webSearch : next }));
      return { type: 'websearch', value: next };
    },
  },
  {
    name: 'btw',
    label: '旁路快速提问',
    desc: '不打断当前生成，并行问一个问题，如 /btw 刚才的代码用了什么库',
    icon: 'btw',
    args: '<问题>',
    run: (args) => ({ type: 'btw', question: args.trim() }),
  },
  {
    name: 'clear',
    label: '清空会话',
    desc: '清空当前会话的全部消息',
    icon: 'clear',
    run: (args, { clearActive }) => {
      clearActive();
      return { type: 'cleared' };
    },
  },
  {
    name: 'help',
    label: '命令帮助',
    desc: '列出全部斜杠命令',
    icon: 'help',
    run: () => ({ type: 'help' }),
  },
];

// 解析输入是否是斜杠命令。返回匹配的命令或 null。
// 支持部分匹配：输入 /mod 会匹配 /model（前缀匹配，最短唯一前缀）。
/**
 * 解析斜杠输入。
 *
 * 返回值里 `matches` 是「当前该给菜单显示的候选」，`command` 是「可以执行的命令」。
 * 两者独立 —— 之前把它们绑在一起（唯一匹配就 partial:false 不给 matches），
 * 导致输入 `/mod` 时菜单不弹（唯一命中 model，菜单却拿不到候选）。
 *
 * `typedName` 表示还在打命令名（没输空格）：此时应该显示候选让用户 Tab 补全。
 * 一旦输了空格，说明命令名已定，菜单收起，进入填参数阶段。
 */
export function parseSlashCommand(input) {
  if (!input.startsWith('/')) return null;
  const body = input.slice(1);
  if (!body) return { partial: true, typedName: true, matches: SLASH_COMMANDS, args: '' };

  // 有没有输过空格 —— 决定是「还在打名字」还是「在填参数」
  const hasSpace = /\s/.test(body);
  const [rawName, ...rest] = body.split(/\s+/);
  const args = rest.join(' ');
  const name = rawName.toLowerCase();

  const exact = SLASH_COMMANDS.find((c) => c.name === name);
  const prefixed = SLASH_COMMANDS.filter((c) => c.name.startsWith(name));

  // 命令名已确定（输了空格）→ 收起菜单，进入参数阶段
  if (hasSpace) {
    return { command: exact || (prefixed.length === 1 ? prefixed[0] : null), args, partial: false, typedName: false, matches: [] };
  }

  // 还在打命令名 → 给出候选供菜单展示 / Tab 补全。
  // 即使精确命中也保留候选（`/model` 完整输入时菜单仍显示它，Enter 直接执行）。
  const matches = exact ? [exact, ...prefixed.filter((c) => c !== exact)] : prefixed;
  return {
    command: exact || (prefixed.length === 1 ? prefixed[0] : null),
    args,
    partial: matches.length > 0,
    typedName: true,
    matches,
  };
}
