// 交互动画：淡入淡出 + 打字机光标。
//
// 参考现代 AI 聊天界面（Claude / ChatGPT）的实际做法：
// **不做逐字 CSS width 动画** —— 那个只适用于已知长度的固定文本，
// 流式内容长度未知，width 动画会抖。正确做法是「按 chunk 淡入」：
// 新到达的文字用 opacity + blur 浮现，视觉上就是打字机的观感。
//
// 全部走 transform/opacity/filter，不驱动重排，流式高频更新下仍顺滑。
// 每条动画都尊重 prefers-reduced-motion。

// 消息进入：从下方 6px 上浮 + 淡入。300ms，M3 emphasized ease。
export const messageEnterSx = {
  animation: 'skiMsgIn 300ms cubic-bezier(0.2, 0, 0, 1)',
  '@keyframes skiMsgIn': {
    from: { opacity: 0, transform: 'translateY(6px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
};

// 流式文字浮现：淡入 + 去模糊。这是"打字机感"的来源。
// 220ms 足够被感知又不拖慢阅读；blur 起始 3px 让字像"显影"出来。
export const textRevealSx = {
  animation: 'skiTextReveal 220ms ease-out',
  '@keyframes skiTextReveal': {
    from: { opacity: 0, filter: 'blur(3px)' },
    to: { opacity: 1, filter: 'blur(0)' },
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
};

// 打字机光标：跟在流式内容末尾的竖线，脉动闪烁。
export const cursorSx = {
  display: 'inline-block',
  width: '2px',
  height: '1.05em',
  marginLeft: '3px',
  verticalAlign: 'text-bottom',
  borderRadius: '1px',
  background: 'currentColor',
  animation: 'skiCursorPulse 1.1s ease-in-out infinite',
  '@keyframes skiCursorPulse': {
    '0%, 100%': { opacity: 0.15 },
    '50%': { opacity: 0.9 },
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    opacity: 0.6,
  },
};

// 「正在思考」时的三点跳动（回复还没吐第一个字时的等待态）
export const thinkingDotsSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  '& span': {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'currentColor',
    opacity: 0.35,
    animation: 'skiDot 1.2s ease-in-out infinite',
  },
  '& span:nth-of-type(2)': { animationDelay: '0.15s' },
  '& span:nth-of-type(3)': { animationDelay: '0.3s' },
  '@keyframes skiDot': {
    '0%, 60%, 100%': { opacity: 0.25, transform: 'translateY(0)' },
    '30%': { opacity: 0.9, transform: 'translateY(-3px)' },
  },
  '@media (prefers-reduced-motion: reduce)': {
    '& span': { animation: 'none', opacity: 0.5 },
  },
};

// hover 轻微上浮（发送键等交互元素）
export const liftHoverSx = {
  transition: 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
  '&:hover': { transform: 'translateY(-1px)' },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' },
  },
};
