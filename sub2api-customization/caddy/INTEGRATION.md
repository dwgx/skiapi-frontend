# Caddy 集成指南 —— 把 SkiAPI 页面定制装到任意 sub2api 实例

> 这份文档是给人和 AI 看的**可执行步骤**。前提：目标机已装 Caddy（本方案用
> `replace-response` 插件，官方 apt 版没有 —— 需 xcaddy 自编译，见文末）。

## 架构一句话

sub2api 是第三方镜像（不能改代码），所有页面定制都在 **Caddy 代理层**完成：
`handle` 终结性路由替换 `/` `/home` 为自建落地页；`replace` 给 HTML 注入
换肤 CSS 和横幅脚本。**Caddyfile 是全部机制的载体**，`/var/www/` 是资产。

## 第一步：放置资产

```bash
sudo bash sub2api-customization/deploy.sh    # 检查环境 + 拷贝资产到 /var/www/
```

## 第二步：把 5 个 snippet 粘进 Caddyfile

文件在 `caddy/snippets/`，按编号顺序粘贴到 Caddyfile（放主块之前，任意位置，
snippet 定义与使用顺序无关）：

| 文件 | 定义 | 作用 |
|---|---|---|
| `01-landing-headers.conf` | `(landing_headers)` | 落地页安全头（CSP/XFO/HSTS 等，防 iframe 钓鱼） |
| `02-landing.conf` | `(landing)` | `/` `/home` → 自建落地页（终结性 handle） |
| `03-chat-app.conf` | `(chat_app)` | `/chat` 智能对话页（终结性 handle，注意 assets 路径） |
| `04-html-inject.conf` | `(html_inject)` | `replace` 注入 auth-theme.css + console-banner.js |
| `05-favicon.conf` | `(favicon)` | 站点 favicon 静态托管 |

## 第三步：主块 import（关键！两处都要）

在**两个**主站点块里 import（CDN 回源走 `:80` 块，直连走 `:443` 块，
**只加一处会导致经 CDN 的用户看不到定制**）：

```caddyfile
http://skiapi.dev, http://api.skiapi.dev, http://gw.skiapi.dev {   # :80 块（CDN 回源）
    # ...已有内容...
    import landing
    import favicon
    import chat_app
    import html_inject
    # ...reverse_proxy 127.0.0.1:8080...
}

skiapi.dev, api.skiapi.dev, gw.skiapi.dev {                        # :443 块（直连）
    # ...已有内容...
    import landing
    import favicon
    import chat_app
    import html_inject
    # ...import gateway...
}
```

import 顺序注意：
- `import landing` 必须在 `reverse_proxy` **之前**（handle 终结性：命中就不进反代）
- `import html_inject` 在 reverse_proxy 之前即可（replace 与反代顺序无关，由 matcher 控制）
- `import chat_app` 必须在 html_inject 之前没关系，但 `(html_inject)` 内部
  `@html_page` matcher 必须 `not path /chat /chat/*`（否则聊天页被注入换肤 CSS，
  有副作用——见 04 文件内注释）

## 第四步：校验与重载

```bash
caddy validate --config /etc/caddy/Caddyfile     # 必须通过，别直接 reload
systemctl reload caddy
sudo bash sub2api-customization/verify.sh         # 验证 5 个页面特征
```

## 已适配的路径假设（你的 sub2api 装法不同就改这里）

| 项 | 本方案假设 | 改法 |
|---|---|---|
| 应用反代 | `127.0.0.1:8080` | 改主块 `reverse_proxy` 目标 |
| 资产目录 | `/var/www/skiapi-*` | 改 `deploy.sh` 的 `WWW_ROOT` 或 `02/03/04/05` 里 `root *` 路径 |
| 域名 | skiapi.dev 及其子域 | 按你的域名换主块 host |
| 聊天页 | `/chat`（同源 React SPA，读 sub2api 的 localStorage auth_token 做账户互通） | 不要聊天页就删 `import chat_app` |

## 回滚

```bash
rm -rf /var/www/skiapi-landing /var/www/skiapi-static /var/www/skiapi-console
# 从 Caddyfile 删除 5 个 snippet 定义 + 两处 import 行
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

## 依赖：replace-response 插件

`(html_inject)` 依赖 `http.handlers.replace_response`。apt 官方 caddy 没有，
需自编译（与 ratelimit 一起）：

```bash
# 目标机有 Go 时：
PATH=/usr/local/go/bin:$PATH xcaddy build v2.11.4 \
  --with github.com/mholt/caddy-ratelimit \
  --with github.com/caddyserver/replace-response \
  --output /usr/bin/caddy && systemctl restart caddy
```

没有 replace-response 时：落地页/聊天页/图标仍可用（handle 不依赖插件），
只有 auth-theme.css 注入和 console-banner 注入失效（页面退回官方样式，不会坏）。

## 给 AI 的提示

- 所有 snippet 内的注释都是线上实战踩坑记录（handle 终结性、CSP nonce、
  `:has()` 兼容性、CDN 回源双块 import），**改之前先读注释**。
- `02-landing.conf` 的 `(landing_headers)` 里 CSP `connect-src` 列了
  api/cn/as/gw 四个入口，新实例按自己的域名调整。
- `03-chat-app.conf` 的 chat 页资源前缀是 `/chat/assets/`，与 sub2api 面板的
  `/assets/*` 刻意不同名（撞名会 404 或串包）——改名要两处同步（handle matcher
  和 Vite base）。
- 验证时注意：curl 直连 sub2api 容器 8080 看到的是官方页面，定制只在 Caddy 层。
