#!/usr/bin/env bash
# ============================================================================
# deploy.sh — 部署 SkiAPI 的 sub2api 页面定制（落地页/登录换肤/横幅/图标）
#
# 用法：在目标服务器上执行（需 root；仓库 clone 到本地后运行）
#   git clone https://github.com/dwgx/skiapi-frontend
#   cd skiapi-frontend && sudo bash sub2api-customization/deploy.sh
#
# 本脚本只做「检查 + 放置静态资产」两件安全的事：
#   1. 检查 Caddy 版本与 replace-response 插件是否可用
#   2. 把页面资产拷贝到 /var/www/ 对应目录（幂等，不覆盖线上已有文件）
#   3. 检查 Caddyfile 是否已集成 snippet，未集成则给出明确指引
# 它【不会】自动修改 Caddyfile —— 集成步骤见 caddy/INTEGRATION.md，
# 由人工或 AI 按文档操作，避免误改线上路由。
#
# 回滚：删除 /var/www/skiapi-* 目录 + 移除 Caddyfile 里对应的 snippet/import 即可。
# ============================================================================
set -euo pipefail

# ── 资产来源（本仓库根目录）───────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WWW_ROOT="${WWW_ROOT:-/var/www}"

say()  { printf '\033[1;32m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy!]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[deploy✗]\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "需要 root（资产目录属主 caddy:root）"
command -v caddy >/dev/null || die "未找到 caddy 命令（本机是 xcaddy 自编译版，见 README）"

# ── 1. 环境检查 ───────────────────────────────────────────────────────────
say "Caddy 版本: $(caddy version 2>/dev/null | head -c 80)"
if caddy list-modules 2>/dev/null | grep -q "http.handlers.replace_response"; then
  say "replace-response 插件: 已编译 ✓（html_inject 依赖它）"
else
  warn "replace-response 插件缺失 —— html_inject（登录页换肤/横幅注入）不会生效。"
  warn "本机是 xcaddy 自编译版，重新编译命令见 README 或 caddy/INTEGRATION.md。"
fi

# ── 2. 放置资产（幂等：不覆盖已存在的文件）──────────────────────────────
mkdir -p "$WWW_ROOT"/skiapi-landing "$WWW_ROOT"/skiapi-static \
         "$WWW_ROOT"/skiapi-console "$WWW_ROOT"/skiapi-chat

copy_asset() { # $1=源  $2=目标  $3=描述
  if [ -e "$2" ] && ! cmp -s "$1" "$2"; then
    warn "跳过 $3：$2 已存在且内容不同（不想覆盖线上文件，手动 diff 后处理）"
  else
    cp -f "$1" "$2" && say "放置 $3 → $2"
  fi
}

copy_asset "$REPO_ROOT/landing/index.html"                 "$WWW_ROOT/skiapi-landing/index.html"    "主页落地页"
copy_asset "$REPO_ROOT/auth-theme/auth-theme.css"          "$WWW_ROOT/skiapi-static/auth-theme.css" "登录页换肤"
copy_asset "$REPO_ROOT/model-plaza/model-plaza.html"        "$WWW_ROOT/skiapi-static/model-plaza.html" "价格广场页"
copy_asset "$REPO_ROOT/console-banner/console-banner.js"   "$WWW_ROOT/skiapi-console/console-banner.js" "控制台横幅"
for f in "$REPO_ROOT"/web-assets/*; do
  copy_asset "$f" "$WWW_ROOT/skiapi-static/$(basename "$f")" "站点图标 $(basename "$f")"
done

# chat 页是构建产物（dist-chat/ 不入库），部署需先构建：
if [ -d "$REPO_ROOT/dist-chat" ]; then
  warn "/chat 智能对话页产物（dist-chat/）需在构建机生成后拷贝到 $WWW_ROOT/skiapi-chat/，本脚本不自动处理。"
else
  warn "/chat 智能对话页：仓库不含构建产物（gitignore），需先 pnpm build 生成 dist-chat/ 再部署。"
fi

# ── 3. Caddyfile 集成检查 ─────────────────────────────────────────────────
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
if [ -f "$CADDYFILE" ]; then
  if grep -q "import landing" "$CADDYFILE" && grep -q "import html_inject" "$CADDYFILE"; then
    say "Caddyfile 已集成 landing/html_inject ✓"
  else
    warn "Caddyfile 尚未集成定制 snippet。请按 caddy/INTEGRATION.md 操作："
    warn "  1. 把 caddy/snippets/*.conf 内容粘贴进 Caddyfile"
    warn "  2. 在 :80 与 :443 主块里加 import landing / chat_app / html_inject / favicon"
    warn "  3. caddy validate --config $CADDYFILE && systemctl reload caddy"
  fi
else
  warn "未找到 Caddyfile（$CADDYFILE），请确认路径或设置 CADDYFILE 环境变量"
fi

say "完成。部署后运行 verify.sh 验证各页面是否生效。"
