// 流式打字机浮现：算出「上一次渲染时已经显示到哪」，
// 让 ChatMessage 把新到达的那段单独包进淡入+去模糊的 span。
//
// 为什么不能对整个文本节点做 animation：CSS 动画只在节点首次挂载时触发，
// 流式内容每次 setState 都复用同一个节点，新文字不会重新浮现。
// 把新 chunk 切成独立 span，每次都能触发 textReveal —— 这才是打字机
// 「字逐段显影」观感的来源。
//
// 实现要点：**不能用 ref 存已显示长度**。
//   1. React 规范不允许 render 期间读写 ref（StrictMode 下行为不可靠）；
//   2. 更实际的问题是 effect 在 render 之后才跑，ref 里的值会慢一拍，
//      导致新 chunk 的边界算错、动画错位。
// 正确做法是「render 期间从 state 推导」：用 state 记住上一次的 content，
// 发现变化时在 render 里就地更新（React 官方认可的 derive-state-during-render
// 模式，见 react.dev「你可能不需要 effect」）。

import { useState } from 'react';

export function useTypewriterReveal(content, isStreaming) {
  const [prev, setPrev] = useState({ content: '', revealed: 0 });

  // render 期间推导：内容变了就立刻算出新的边界并更新 state。
  // 这是 React 支持的模式 —— setState 在 render 里调用会立刻触发重渲染，
  // 不会进 effect 队列，也不会多画一帧。
  if (prev.content !== content) {
    if (!isStreaming) {
      // 非流式（或流已结束）：整段视为已显示，不做逐段动画
      setPrev({ content, revealed: content.length });
    } else if (content.startsWith(prev.content)) {
      // 追加：上一次的长度就是本次「新内容」的起点
      setPrev({ content, revealed: prev.content.length });
    } else {
      // 内容被替换（重发/编辑）：整段都算新
      setPrev({ content, revealed: 0 });
    }
  }

  return prev.content === content ? prev.revealed : 0;
}
