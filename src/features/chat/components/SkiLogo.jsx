// 主站 SkiAPI 图标（左上角 + 浏览器标签用，与 skiapi.dev 完全一致）。
//
// 就是主站那个 /favicon.png（256×256 蓝色 SkiAPI 标，MD5 c8656f72…）。
// 从服务器 /var/www/skiapi-static/favicon.png 拷进 public/skiapi-favicon.png。
//
// 这里用 <img> 而不是内联 SVG：主站 favicon 是 PNG，PNG 没有内联价值，
// <img> 直接复用同一张位图，保证字节级一致。CSP img-src 'self' 已放行。

import React from 'react';

export default function SkiLogo({ size = 24, sx, ...rest }) {
  return (
    <img
      src="/chat/skiapi-favicon.png"
      alt="SkiAPI"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0, borderRadius: 6, ...(sx || {}) }}
      {...rest}
    />
  );
}
