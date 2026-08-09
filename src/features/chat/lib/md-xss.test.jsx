// markdown 渲染管线的 XSS 防线验证。
//
// 核心防线是 react-markdown 的 skipHtml：直接丢弃原始 HTML 不解析。
// 剩下的攻击面只有 markdown 语法能产生的 href / src，两者过白名单。
// 这个测试用真实攻击载荷验证两道防线都在。

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isSafeUrl, isSafeImageUrl } from '../../../utils/security';

// 复刻 ChatMessage 里的安全组件表（只保留与安全相关的部分）
const SafeComponents = {
  a: ({ href, children }) => (
    <a href={isSafeUrl(href) ? href : undefined} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (isSafeImageUrl(src) ? <img src={src} alt={alt || ''} /> : null),
};

const render = (md) => renderToStaticMarkup(
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={SafeComponents} skipHtml>
    {md}
  </ReactMarkdown>
);

const DANGEROUS = /onerror=|onload=|onclick=|javascript:|<script|<iframe|<svg|<object|<embed/i;

describe('markdown XSS：原始 HTML 被 skipHtml 丢弃', () => {
  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<div onclick="alert(1)">x</div>',
    '<object data="x"></object>',
    '<embed src="x">',
    '<a href="javascript:alert(1)">click</a>',
    '<body onload=alert(1)>',
    '<math><mtext><script>alert(1)</script></mtext></math>',
  ])('丢弃 %s', (md) => {
    expect(render(md)).not.toMatch(DANGEROUS);
  });
});

describe('markdown XSS：链接与图片过白名单', () => {
  it.each([
    '[x](javascript:alert(1))',
    '[x](JaVaScRiPt:alert(1))',
    '[x](vbscript:msgbox(1))',
    '[x](data:text/html,<script>alert(1)</script>)',
    '[x](/\\evil.com)',
    '![i](javascript:alert(1))',
    '![i](data:image/svg+xml,<svg onload=alert(1)>)',
    '![i](data:text/html,<script>alert(1)</script>)',
  ])('拦下 %s', (md) => {
    expect(render(md)).not.toMatch(DANGEROUS);
  });

  it('reference link 形式也被拦', () => {
    expect(render('[ref][1]\n\n[1]: javascript:alert(1)')).not.toMatch(DANGEROUS);
  });

  it('正常链接与图片仍然渲染', () => {
    expect(render('[ok](https://example.com)')).toContain('href="https://example.com"');
    expect(render('![ok](https://cdn.example.com/a.png)')).toContain('src="https://cdn.example.com/a.png"');
  });
});

describe('markdown XSS：代码块内容被转义而非执行', () => {
  it('内联代码里的 script 标签被转义', () => {
    const out = render('`<script>alert(1)</script>`');
    // 转义后是 &lt;script&gt;，不是真标签
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('&lt;script&gt;');
  });

  it('围栏代码块里的 script 标签被转义', () => {
    const out = render('```\n<script>alert(1)</script>\n```');
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('&lt;script&gt;');
  });
});
