// 会话数据结构。单独成文件而不是放在 ChatSidebar.jsx 里 ——
// 组件文件只导出组件，否则 Vite 的 fast refresh 失效（react-refresh 规则）。

export function createSession(title = '新对话') {
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export const DEFAULT_SESSION_TITLE = '新对话';
