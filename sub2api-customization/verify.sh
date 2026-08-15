#!/usr/bin/env bash
# ============================================================================
# verify.sh — 部署后验证各定制页面是否生效（只读，安全）
#
# 用法：sudo bash sub2api-customization/verify.sh [域名]
#   [域名] 默认 skiapi.dev，可换成 api.skiapi.dev / gw.skiapi.dev 等
# 也可在目标服务器本地执行：bash verify.sh localhost（需 Host 头或本机直连）
# ============================================================================
set -uo pipefail
HOST="${1:-skiapi.dev}"
BASE="https://$HOST"
PASS=0; FAIL=0

check() { # $1=名称  $2=路径  $3=期望特征
  local body
  body=$(curl -s -m 15 "$BASE$2" 2>/dev/null | head -c 400)
  if echo "$body" | grep -q "$3"; then
    printf '  \033[32m✓\033[0m %s (%s)\n' "$1" "$2"; PASS=$((PASS+1))
  else
    printf '  \033[31m✗\033[0m %s (%s) —— 未命中特征「%s」\n' "$1" "$2" "$3"; FAIL=$((FAIL+1))
  fi
}

echo "== 验证 $BASE =="
check "主页落地页（替换 sub2api SPA）"  "/"               "SkiAPI"
check "home 路径同样落地页"            "/home"            "SkiAPI"
check "控制台横幅（外部 JS 文件）"      "/console-banner.js" "window.__SKIAPI_CONSOLE_BANNER__"
check "登录页换肤 CSS"                 "/auth-theme.css"  ":has("
check "价格广场自建页"                  "/model-plaza.html" "SkiAPI"

echo
echo "结果：$PASS 通过 / $FAIL 失败"
[ "$FAIL" -eq 0 ] || echo "提示：验证走 Caddy 才会看到定制；curl 直连 sub2api:8080 看到的是官方页面，属正常。"
exit $((FAIL > 0))
