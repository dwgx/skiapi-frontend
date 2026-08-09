// 最近使用过的模型。存 localStorage，让模型选择器把常用的排在最前面。
//
// 单独成文件（而不是放 ModelPicker.jsx）是因为 react-refresh 要求
// 组件文件只导出组件 —— 混着导出函数会让热更新失效。

const RECENT_KEY = 'chat_recent_models';
const RECENT_MAX = 5;

export function loadRecentModels() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((x) => typeof x === 'string' && x.trim()).slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

export function pushRecentModel(model) {
  if (!model || typeof model !== 'string') return;
  try {
    const prev = loadRecentModels().filter((m) => m !== model);
    localStorage.setItem(RECENT_KEY, JSON.stringify([model, ...prev].slice(0, RECENT_MAX)));
  } catch { /* 配额满，忽略 */ }
}
