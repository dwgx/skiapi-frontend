// Anthropic 品牌图标（内联 SVG）。
//
// 聊天页的「机器人」身份标识用它 —— 消息头像、空状态。
// 路径数据与线上 /var/www/skiapi-static/anthropic.svg 一致（该文件也是主站
// 落地页的矢量图标主源）。品牌色 #D97757。
//
// 为什么内联而不是 <img src="/anthropic.svg">：
//   1. 内联能用 currentColor 跟随主题，<img> 不行；
//   2. 少一次 HTTP 请求，也不受 CSP img-src 约束；
//   3. /anthropic.svg 由 Caddy 从 skiapi-static 服务，聊天页在 /chat/* 下，
//      路径耦合会随部署位置变化 —— 内联没有这个问题。

import React from 'react';

export const ANTHROPIC_BRAND = '#D97757';

export default function AnthropicIcon({ size = 18, color = 'currentColor', sx, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      fillRule="evenodd"
      role="img"
      aria-label="Anthropic"
      style={{ display: 'block', flexShrink: 0, ...(sx || {}) }}
      {...rest}
    >
      <title>Anthropic</title>
      <path
        fillRule="evenodd"
        d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z"
      />
    </svg>
  );
}
