# SKIAPI Frontend

> React admin console for NewAPI / SKIAPI LLM gateway deployments.
>
> 对接 [NewAPI](https://github.com/Calcium-Ion/new-api) 的 SKIAPI 管理控制台前端。

---

## Overview / 概述

SKIAPI Frontend is the web admin console for a self-hosted [NewAPI](https://github.com/Calcium-Ion/new-api)-compatible AI API gateway. Single-page React 19 app built with Vite and Material UI v7 — talks to the backend over `/api` and `/v1`.

Operators use it to manage channels (upstream model providers), users, tokens, logs, billing, redemption codes, model routing, and system settings from a browser. This repo is **frontend only** — it expects a compatible backend for auth, billing, routing, and key storage.

---

SKIAPI Frontend 是一个自托管 [NewAPI](https://github.com/Calcium-Ion/new-api) 兼容 AI API 网关的 Web 管理控制台。基于 React 19 + Vite + Material UI v7 构建的单页应用，通过 `/api` 和 `/v1` 与后端通信。

用于管理渠道（上游模型供应商）、用户、令牌、日志、计费充值、兑换码、模型路由和系统设置。本仓库**仅含前端**——需要配合兼容后端使用。

---

## Features / 功能

- **Dashboard** — usage stats and charts (`@mui/x-charts`)
- **Channel management** — 50+ upstream provider types: OpenAI, Azure OpenAI, Anthropic Claude, AWS Claude, Google Gemini / Vertex AI, DeepSeek, xAI, Ollama, OpenRouter, Mistral, SiliconCloud, 通义千问, 智谱 GLM, Moonshot, Midjourney Proxy, Suno, and more. Includes channel test dialogs.
- **User / Token / Redemption admin** — role-based access (普通用户 / 管理员 / 超级管理员)
- **Log viewer** — filters, detail rows
- **Billing & payments** — top-up, pricing, subscription; Alipay, WeChat Pay, Stripe, Creem, Waffo
- **Model management** — model deployment, Midjourney and async task views
- **Playground & Chat** — in-browser pages for testing models against the gateway
- **Built-in AI assistant panel** — with tool support (`src/components/common/AiAssistant.jsx`)
- **Command palette, error boundary, confirm dialogs** — shared UI primitives
- **Auth flows** — login, register, password reset, OAuth (GitHub, Discord, OIDC, Telegram, LinuxDO, WeChat)
- **i18n** — 7 locales via i18next: 简体中文, 繁體中文, 日本語, English, Francais, Русский, Tieng Viet. Default `zh-CN`, auto-detected from browser.
- **Light/dark theming**
- **Resilience** — DOM-mutation patch for browser-extension interference, chunk-load retry on stale deploys, boot watchdog with `/legacy/` fallback, request de-duplication in API layer

---

- **仪表盘** — 使用量统计和图表
- **渠道管理** — 50+ 上游供应商类型，含渠道测试对话框
- **用户 / 令牌 / 兑换码管理** — 基于角色的访问控制
- **日志查看器** — 筛选与详情
- **计费与支付** — 充值、定价、订阅；支付宝、微信支付、Stripe、Creem、Waffo
- **模型管理** — 模型部署、Midjourney 及异步任务视图
- **Playground & Chat** — 浏览器内直接测试模型
- **内置 AI 助手面板** — 带工具调用能力
- **命令面板、错误边界、确认对话框** — 通用 UI 组件
- **认证流程** — 登录、注册、密码重置、OAuth（GitHub、Discord、OIDC、Telegram、LinuxDO、微信）
- **国际化** — 7 种语言，默认简体中文，自动检测浏览器语言
- **亮色/暗色主题切换**
- **容错机制** — DOM 补丁防浏览器插件干扰、chunk 加载重试、启动看门狗、API 请求去重

---

## Tech Stack / 技术栈

| Layer | Tech |
|-------|------|
| Framework | React 19, React DOM |
| Build | Vite 8 + `@vitejs/plugin-react` |
| UI | MUI v7 (`@mui/material`, `@mui/icons-material`, `@mui/lab`, `@mui/x-charts`) + Emotion |
| Routing | react-router-dom 6 (lazy-loaded) |
| HTTP | axios (withCredentials, interceptors) |
| i18n | i18next / react-i18next / language detector |
| Notifications | notistack / react-toastify |
| Markdown | react-markdown + remark-gfm + DOMPurify |
| Streaming | sse.js (SSE) |
| Misc | dayjs, qrcode.react, lucide-react, use-debounce, Fontsource fonts |
| Lint | ESLint 9 (flat config) |
| Deploy scripts | Python |

---

## Project Structure / 项目结构

```
skiapi-frontend/
├── index.html               # Vite entry (SKIAPI Console)
├── vite.config.js           # Vite config + /api, /v1 dev proxy
├── eslint.config.js         # ESLint flat config
├── package.json
├── public/                  # Static assets (icons, favicons, webmanifest)
├── scripts/                 # Python deploy + JS smoke/security checks
│   ├── deploy.py            # Build + upload dist/ over SSH, reload nginx
│   ├── config.example.py    # Deploy config template
│   ├── smoke-skiapi.mjs     # Post-deploy smoke test
│   └── check-ai-assistant-security.mjs
└── src/
    ├── main.jsx             # Bootstrap, DOM/boot resilience
    ├── App.jsx              # Providers + router
    ├── api/index.js         # axios instance + interceptors
    ├── pages/               # Route pages (Dashboard, Channel, Token, Log, ...)
    │   └── router.jsx       # Route table
    ├── components/          # Auth guards, layout, channel, log, common UI
    ├── contexts/            # Auth, Status, Theme contexts
    ├── constants/           # Channel types, roles, OAuth providers, payments
    ├── hooks/               # usePaginatedList, useModuleVisible
    ├── i18n/                # i18next setup + locales/*.json (7 languages)
    ├── theme/               # MUI theme
    └── utils/               # Helpers + security utils
```

---

## Getting Started / 快速开始

### Prerequisites / 前置要求

- Node.js (current LTS) with npm <!-- TODO: confirm minimum Node version; no engines field declared in package.json -->
- A running NewAPI / SKIAPI-compatible backend

### Install & Run (dev) / 安装与运行（开发）

```bash
git clone https://github.com/dwgx/skiapi-frontend.git
cd skiapi-frontend
npm install
npm run dev
```

Dev server proxies `/api` and `/v1` to `http://127.0.0.1:3001` by default. Override with:

```bash
VITE_PROXY_TARGET=http://your-backend:port npm run dev
```

### Build (production) / 构建（生产）

```bash
npm run build      # -> dist/
npm run preview    # serve production build locally
```

### Other Scripts / 其他命令

```bash
npm run lint                 # ESLint
npm run check:ai-security   # AI assistant security check
npm run smoke:skiapi -- --base-url <url>   # Post-deploy smoke test
```

---

## Configuration / 配置

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_PROXY_TARGET` | `vite.config.js` (dev only) | Backend target for dev proxy. Default `http://127.0.0.1:3001` |
| `VITE_API_URL` | `src/api/index.js` | axios baseURL. Empty = same-origin |

`.env.example` provided. Copy to `.env.local` for local overrides.

Deployment config (SSH host, ports, remote dir, nginx) lives in local-only `scripts/config.py` — see `scripts/config.example.py` and `DEPLOYMENT.md`.

---

## Deployment / 部署

`scripts/deploy.py` builds the app, uploads `dist/` as a tarball over SSH, swaps into the configured static root, and reloads nginx.

```bash
npm ci
npm run build
python scripts/deploy.py --no-build
```

See `DEPLOYMENT.md` for config keys and post-deploy smoke checks.

---

## Related Projects / 相关项目

- [NewAPI](https://github.com/Calcium-Ion/new-api) — the backend gateway this console targets
- [YuKiKo](https://github.com/dwgx/YuKiKo) — companion SKIAPI project

---

## Status / 状态

Active development. Version `0.0.0` (unversioned). Used against real deployments — has operational docs (`DEPLOYMENT.md`, `RELEASE.md`, `SECURITY.md`, security audit, smoke-test notes).

正在积极开发中。版本号 `0.0.0`（未正式发版）。已用于实际部署环境。

---

## License / 许可证

MIT License — see [`LICENSE`](./LICENSE).
