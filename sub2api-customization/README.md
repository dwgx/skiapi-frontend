# SkiAPI sub2api 页面定制部署包

把 SkiAPI 对 sub2api 做的全部**页面级改造**打包成可移植部署包：别人（或 AI）
clone 这个仓库，按步骤就能把主页落地页、登录换肤、价格广场、控制台横幅、
站点图标装到自己的 sub2api 实例上。

## 原理（为什么需要 Caddy 层）

sub2api 是第三方镜像，改不了代码。所有页面改造都在 **Caddy 代理层**：
`handle` 终结性路由把 `/` `/home` 替换成自建落地页；`replace-response` 给
HTML 注入换肤 CSS 和横幅脚本；`/chat` 由同源 React SPA 提供（账户互通靠
读取 sub2api 存在 localStorage 的 auth_token）。

## 目录

```
sub2api-customization/
├── deploy.sh               # 一键部署：环境检查 + 资产放置（不自动改 Caddyfile）
├── verify.sh               # 部署后验证 5 个页面特征
├── caddy/
│   ├── snippets/           # 5 个 Caddy snippet 定义（粘贴进 Caddyfile）
│   │   ├── 01-landing-headers.conf   # 落地页安全头
│   │   ├── 02-landing.conf           # / /home → 落地页
│   │   ├── 03-chat-app.conf          # /chat 智能对话页
│   │   ├── 04-html-inject.conf       # 登录换肤 + 横幅注入
│   │   └── 05-favicon.conf           # 站点图标
│   └── INTEGRATION.md     # 完整集成步骤（人/AI 可执行，含回滚）
└── README.md               # 本文件
```

页面资产在本仓库根目录：`landing/`、`auth-theme/`、`model-plaza/`、
`console-banner/`、`web-assets/`（由 deploy.sh 引用）。

## 快速开始（5 分钟）

```bash
git clone https://github.com/dwgx/skiapi-frontend
cd skiapi-frontend
sudo bash sub2api-customization/deploy.sh      # 1. 检查 + 放资产
# 2. 把 caddy/snippets/*.conf 粘进 /etc/caddy/Caddyfile
# 3. 在两个主站点块加 import（:80 和 :443 都要，见 INTEGRATION.md 第三步）
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
sudo bash sub2api-customization/verify.sh       # 4. 验证
```

## 依赖

| 依赖 | 必需 | 说明 |
|---|---|---|
| Caddy（xcaddy 自编译） | 是 | 需 `replace-response` 插件（官方 apt 版没有），编译命令见 INTEGRATION.md |
| sub2api | 是 | 反代目标 `127.0.0.1:8080`（可改） |
| Node/pnpm | 仅 /chat 页 | chat 页源码在仓库 `src/`，构建产物不入库 |

## 缺插件时的降级

没有 replace-response：落地页/聊天页/图标正常，仅登录换肤和横幅注入失效
（页面退回官方样式，不会坏）。

## 回滚

见 INTEGRATION.md「回滚」节：删目录 + 删 snippet/import + reload 即可。

## 与线上对应关系

这些文件是 `143.20.230.62:/var/www/` 的镜像（2026-08-15 拉取）。
线上改动页面后请同步回仓库并提交，保持镜像一致。
