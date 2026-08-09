// 聊天页主组件。三栏布局：左侧会话侧栏 + 主聊天区 + 底部输入条。
// 复用：useChatSessions（多会话）+ useChatHandler（流式/竞态）+ SettingsPanel + ChatMessage。
// 视觉：跟随仓库 M3 暗色主题（accent #0070F3），助手头像用 Anthropic 品牌标。

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, IconButton, Stack, Typography, Chip, Tooltip, alpha, useTheme, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemIcon, ListItemText,
  Snackbar,
} from '@mui/material';
import {
  Tune, Menu as MenuIcon, ErrorOutline, ModelTraining, Public, Psychology, DeleteSweep, HelpOutline, Close,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ChatSidebar from './components/ChatSidebar';
import SettingsPanel from './components/SettingsPanel';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import BtwOverlay from './components/BtwOverlay';
import ModelPicker from './components/ModelPicker';
import InlineTitle from './components/InlineTitle';
import WelcomeHero from './components/WelcomeHero';
import ClaudeIcon, { CLAUDE_BRAND } from './components/ClaudeIcon';
import { useChatSessions } from './hooks/useChatSessions';
import { useChatHandler } from './hooks/useChatHandler';
import { createApiBridge } from './apiBridge';
import { MESSAGE_STATUS, MESSAGE_ROLES } from './types';
import { parseSlashCommand } from './lib/slashCommands';
import {
  buildExportPayload, toMarkdown, downloadFile, safeFilename, buildShareUrl,
  parseSharedFromHash,
} from './lib/session-export';
import { loadMessages } from './lib/storage';
import { messageKeyFor } from './hooks/useChatSessions';

function fmtNum(n) {
  if (n == null) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function fmtCost(n) {
  if (n == null) return '$0';
  return '$' + Number(n).toFixed(4);
}

// 帮助对话框的条目列表。独立成模块级组件，避免在 render 里
// destructure 图标变量触发 no-unused-vars 误报（本项目没开 jsx-uses-vars）。
function HelpItems() {
  const { t } = useTranslation();
  const items = [
    { name: '/model', icon: ModelTraining, desc: t('切换模型，可带名字 /model claude') },
    { name: '/websearch', icon: Public, desc: t('开/关联网搜索 /websearch on|off') },
    { name: '/btw', icon: Psychology, desc: t('旁路快速提问，不打断当前生成') },
    { name: '/clear', icon: DeleteSweep, desc: t('清空当前会话') },
    { name: '/help', icon: HelpOutline, desc: t('显示本帮助') },
  ];
  return (
    <List dense>
      {items.map((item) => {
        const ItemIcon = item.icon;
        return (
          <ListItem key={item.name} sx={{ px: 0.5, gap: 1 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <ItemIcon sx={{ fontSize: 17 }} />
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{item.name}</Typography>}
              secondary={<Typography variant="caption" sx={{ fontSize: '0.68rem', opacity: 0.7 }}>{item.desc}</Typography>}
            />
          </ListItem>
        );
      })}
    </List>
  );
}

export default function ChatApp() {
  const theme = useTheme();
  const { t } = useTranslation();

  const {
    sessions, activeId, messages, setMessages,
    selectSession, newSession, deleteSession, renameSession, autoTitle, clearActive,
    saveError,
  } = useChatSessions();
  const [config, setConfig] = useState(() => ({
    model: '', group: '', systemPrompt: '', stream: true,
    temperature: 1, temperatureEnabled: false,
    topP: 1, topPEnabled: false,
    maxTokens: 4096, maxTokensEnabled: false,
    webSearch: false,
  }));
  const [input, setInput] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [models, setModels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [bridgeInfo, setBridgeInfo] = useState(null);
  const [usage, setUsage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [keyError, setKeyError] = useState(null);
  const [bridgeLoading, setBridgeLoading] = useState(true);

  const bottomRef = useRef(null);

  // BTW 侧问状态（生成中并行提问，不进对话历史）
  const [btw, setBtw] = useState({ open: false, question: '', answer: '', loading: false, error: null });
  const [helpOpen, setHelpOpen] = useState(false);
  // 模型选择菜单（/model 命令或点模型 chip 触发）
  const [modelPicker, setModelPicker] = useState({ open: false, query: '' });
  // 轻提示（导出/分享的结果反馈）
  const [toast, setToast] = useState('');
  // 当前会话对象（顶栏标题用）
  const activeSession = sessions.find((s) => s.id === activeId);

  // 分享内容（URL 带 #s= 时）。只在首帧解析一次 —— 内容在 fragment 里，
  // 不会随导航变化；解析结果当**只读预览**，不写进本地会话列表。
  const [shared] = useState(() => {
    try {
      return parseSharedFromHash();
    } catch {
      return null;
    }
  });
  const [sharedDismissed, setSharedDismissed] = useState(false);
  const viewingShared = Boolean(shared) && !sharedDismissed;

  // 把分享内容转成可渲染的消息（复用 ChatMessage 的管线，含 markdown 白名单）
  const sharedMessages = useMemo(() => {
    if (!shared?.messages) return [];
    return shared.messages.map((m, i) => ({
      key: `shared-${i}`,
      from: m.role === 'user' ? MESSAGE_ROLES.USER : MESSAGE_ROLES.ASSISTANT,
      content: m.content,
      status: MESSAGE_STATUS.COMPLETE,
      versions: [{ id: `shared-${i}`, content: m.content }],
    }));
  }, [shared]);


  // 当前可选模型：选了分组就只列该分组的模型（每个分组可用模型不同，
  // 拿别的分组的模型去请求必然失败）。没选分组或该分组没配模型时列全部。
  const visibleModels = useMemo(() => {
    if (!config.group) return models;
    const g = groups.find((x) => x.value === config.group);
    return g?.models?.length ? g.models : models;
  }, [config.group, groups, models]);
  // 本会话累计用量。发消息前显示占位符，收到第一次 usage 后显示实际花费。
  const [sessionUsage, setSessionUsage] = useState({ inputTokens: 0, outputTokens: 0, cost: 0, counted: false });

  const handleUsage = useCallback((u) => {
    setSessionUsage((prev) => ({
      inputTokens: prev.inputTokens + (u.inputTokens || 0),
      outputTokens: prev.outputTokens + (u.outputTokens || 0),
      // 网关给了真实 cost 就累加真值；没给就先记 0（只展示 token）
      cost: prev.cost + (typeof u.cost === 'number' ? u.cost : 0),
      counted: true,
    }));
  }, []);

  // ── 适配层：登录态解析 key / 模型 / 用量 ──
  const refreshBridge = useCallback(async () => {
    setBridgeLoading(true);
    try {
      const bridge = await createApiBridge();
      setBridgeInfo(bridge);
      setKeyError(null);

      const [list, gs] = await Promise.all([
        bridge.listModels?.().catch(() => []),
        bridge.listGroups?.().catch(() => []),
      ]);
      const modelList = Array.isArray(list) ? list : [];
      const groupList = Array.isArray(gs) ? gs : [];
      setModels(modelList);
      setGroups(groupList);

      // 默认选中：分组优先记住的，模型取列表第一个
      setConfig((c) => ({
        ...c,
        model: c.model || (modelList.length ? modelList[0] : ''),
        group: c.group || (groupList.length ? groupList[0] : ''),
      }));

      const u = await bridge.getUsage?.().catch(() => null);
      if (u) setUsage(u);
    } catch (err) {
      setBridgeInfo(null);
      setKeyError(err?.message || '无法连接后端');
    } finally {
      setBridgeLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => { if (!cancelled) refreshBridge(); };
    const timer = setTimeout(run, 0);
    const onStorage = (e) => {
      if (e.key === 'auth_token' || e.key === 'user' || e.key === 'refresh_token') run();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshBridge]);

  const handler = useChatHandler({
    config,
    apiBridge: { resolve: createApiBridge },
    messages,
    setMessages,
    onUsage: handleUsage,
  });

  // 「存到我的会话」：把只读的分享内容落成一个本地新会话。
  // 放在 handler 之后 —— 依赖数组里要用 handler.stop()。
  const importShared = useCallback(() => {
    if (!shared?.messages?.length) return;
    handler.stop();
    const id = newSession();
    renameSession(id, shared.title || t('导入的分享会话'));
    setMessages(sharedMessages);
    setSharedDismissed(true);
    // 清掉 fragment，避免刷新又回到只读预览
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch { /* 忽略 */ }
    setToast(t('已存为新会话'));
  }, [shared, sharedMessages, handler, newSession, renameSession, setMessages, t]);

  const streamingMessage = messages.find(
    (m) => m.status === MESSAGE_STATUS.LOADING || m.status === MESSAGE_STATUS.STREAMING
  );
  const isStreaming = Boolean(streamingMessage);
  const activeKey = streamingMessage?.key ?? null;

  // 自动滚到底：只在用户本来就贴着底部时才滚。
  // 之前无条件 smooth 滚动，流式每 50ms 一次，用户往上翻历史会被反复拽回底部。
  const scrollAreaRef = useRef(null);
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (!nearBottom) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    // 流式期间用 auto：50ms 一次的 smooth 会互相打断且掉帧
    bottomRef.current?.scrollIntoView({
      behavior: reduce || isStreaming ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages, isStreaming]);

  const handleDelete = useCallback(
    (key) => setMessages((prev) => prev.filter((m) => m.key !== key)),
    [setMessages]
  );

  // 切换/新建/删除会话前先中止在途流式。
  // 否则旧会话的 50ms flush 仍活着，onFlush 会把旧会话的 chunk 写进
  // 刚载入的新会话消息数组（串会话/丢消息）。
  // 切走时把本会话用量计数归零 —— 它统计的是「当前会话」，不是账户累计
  const resetSessionUsage = useCallback(() => {
    setSessionUsage({ inputTokens: 0, outputTokens: 0, cost: 0, counted: false });
  }, []);

  const selectSessionSafe = useCallback((id) => {
    handler.stop();
    resetSessionUsage();
    selectSession(id);
  }, [handler, selectSession, resetSessionUsage]);

  const newSessionSafe = useCallback(() => {
    handler.stop();
    resetSessionUsage();
    return newSession();
  }, [handler, newSession, resetSessionUsage]);

  const deleteSessionSafe = useCallback((id) => {
    handler.stop();
    resetSessionUsage();
    deleteSession(id);
  }, [handler, deleteSession, resetSessionUsage]);

  // 取某个会话的消息：当前会话用内存里的，其他会话从 localStorage 读
  const messagesOf = useCallback((id) => (
    id === activeId ? messages : loadMessages(messageKeyFor(id))
  ), [activeId, messages]);

  const payloadOf = useCallback((id) => {
    const s = sessions.find((x) => x.id === id);
    return buildExportPayload({
      title: s?.title,
      messages: messagesOf(id),
      model: config.model,
    });
  }, [sessions, messagesOf, config.model]);

  const handleExportMarkdown = useCallback((id) => {
    const p = payloadOf(id);
    if (!p.messages.length) { setToast(t('这个会话还没有内容')); return; }
    downloadFile(safeFilename(p.title, 'md'), toMarkdown(p), 'text/markdown;charset=utf-8');
  }, [payloadOf, t]);

  const handleExportJson = useCallback((id) => {
    const p = payloadOf(id);
    if (!p.messages.length) { setToast(t('这个会话还没有内容')); return; }
    downloadFile(safeFilename(p.title, 'json'), JSON.stringify(p, null, 2), 'application/json;charset=utf-8');
  }, [payloadOf, t]);

  const handleShare = useCallback(async (id) => {
    const p = payloadOf(id);
    if (!p.messages.length) { setToast(t('这个会话还没有内容')); return; }
    const r = buildShareUrl(p);
    if (r.error) { setToast(r.error); return; }
    try {
      await navigator.clipboard.writeText(r.url);
      setToast(t('分享链接已复制（内容在 # 后，不会经过服务器）'));
    } catch {
      setToast(t('复制失败，请检查浏览器剪贴板权限'));
    }
  }, [payloadOf, t]);

  // 斜杠命令分发
  const handleCommand = useCallback(async (result) => {
    if (!result) return;
    switch (result.type) {
      case 'model':
        // 弹出模型选择菜单，带上输入的词做初始过滤
        setModelPicker({ open: true, query: result.query || '' });
        break;
      case 'websearch':
        // 已在 slashCommands 里 setConfig
        break;
      case 'websearch-toggle':
        // 输入框的联网 pill 点击
        setConfig((c) => ({ ...c, webSearch: !c.webSearch }));
        break;
      case 'btw': {
        const q = result.question;
        if (!q) return;
        setBtw({ open: true, question: q, answer: '', loading: true, error: null });
        const res = await handler.askBtw(q);
        if (res?.error) {
          setBtw((b) => ({ ...b, loading: false, error: res.error }));
        } else {
          setBtw((b) => ({ ...b, loading: false, answer: res.content }));
        }
        break;
      }
      case 'cleared':
        clearActive();
        break;
      case 'help':
        setHelpOpen(true);
        break;
      default:
        break;
    }
  }, [handler, setConfig, clearActive]);

  // 发送前先解析斜杠命令；是命令则执行不当作普通消息
  const handleSend = useCallback(async () => {
    const text = input.trim();
    const imgs = imageUrls;
    if (!text && !imgs.length) return;

    const parsed = parseSlashCommand(text);
    if (parsed?.command && !parsed.partial) {
      const result = parsed.command.run(parsed.args, {
        setConfig,
        config,
        clearActive,
      });
      setInput('');
      if (result) await handleCommand(result);
      return;
    }

    autoTitle(text || (imgs.length ? t('图片消息') : ''));
    setInput('');
    setImageUrls([]);
    await handler.send({ text, images: imgs });
  }, [input, imageUrls, handler, autoTitle, t, setConfig, config, clearActive, handleCommand]);

  const userEmail = bridgeInfo?.userInfo?.email || bridgeInfo?.userInfo?.username;

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={selectSessionSafe}
        onNew={newSessionSafe}
        onDelete={deleteSessionSafe}
        onExportMarkdown={handleExportMarkdown}
        onExportJson={handleExportJson}
        onShare={handleShare}
        onRename={renameSession}
        open={sidebarOpen}
      />

      {/* 主区 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 顶栏 */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.background.paper, 0.4),
            backdropFilter: 'blur(8px)',
          }}
        >
          <Tooltip title={t('切换侧栏')}>
            <IconButton
              size="small"
              aria-label={t('切换侧栏')}
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <MenuIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* 会话标题：双击就地编辑（不用 window.prompt —— 原生弹窗打断流程、
              样式不可控、且在部分浏览器里会吞掉输入法候选框）。 */}
          <InlineTitle
            title={activeSession?.title || t('新对话')}
            onCommit={(next) => renameSession(activeId, next)}
          />

          {/* 消息数：轻量的上下文体感 */}
          {messages.length > 0 && (
            <Typography variant="caption" sx={{ fontSize: '0.68rem', opacity: 0.4, flexShrink: 0 }}>
              {t('{{n}} 条', { n: messages.length })}
            </Typography>
          )}

          <Box sx={{ flex: 1 }} />

          {/* 模型：可点，直接开选择器（顶栏和输入框两处入口一致） */}
          <Tooltip title={t('切换模型')} arrow>
            <Chip
              size="small"
              variant="outlined"
              clickable
              onClick={() => setModelPicker({ open: true, query: '' })}
              icon={<ClaudeIcon size={11} color={CLAUDE_BRAND} />}
              label={config.model || t('未选择模型')}
              sx={{ fontSize: '0.72rem', height: 24, maxWidth: 220 }}
            />
          </Tooltip>

          {/* 联网状态：开着才显示，省空间 */}
          {config.webSearch && (
            <Tooltip title={t('联网搜索已开启')} arrow>
              <Chip
                size="small"
                variant="outlined"
                icon={<Public sx={{ fontSize: 11 }} />}
                label={t('联网')}
                sx={{
                  fontSize: '0.7rem', height: 22,
                  color: 'primary.main',
                  borderColor: alpha(theme.palette.primary.main, 0.4),
                }}
              />
            </Tooltip>
          )}

          {/* 本会话消耗：发消息前是占位符，收到 usage 后显示实际值 */}
          <Tooltip
            arrow
            title={
              sessionUsage.counted
                ? `${t('本会话')}：${fmtNum(sessionUsage.inputTokens)} in / ${fmtNum(sessionUsage.outputTokens)} out`
                : t('本会话消耗 —— 发送第一条消息后开始统计')
            }
          >
            <Chip
              size="small"
              variant="outlined"
              label={
                sessionUsage.counted
                  ? (sessionUsage.cost > 0
                      ? fmtCost(sessionUsage.cost)
                      : `${fmtNum(sessionUsage.inputTokens + sessionUsage.outputTokens)} tok`)
                  : '$ —'
              }
              sx={{
                fontSize: '0.7rem', height: 22,
                opacity: sessionUsage.counted ? 0.95 : 0.45,
                fontVariantNumeric: 'tabular-nums',
                transition: 'opacity 260ms',
              }}
            />
          </Tooltip>

          {/* 账户累计（面板聚合），和本会话区分开 */}
          {usage && (
            <Tooltip arrow title={t('账户累计（全部 API key）')}>
              <Chip
                size="small"
                variant="outlined"
                label={`${t('账户')} ${fmtCost(usage.total_cost)}`}
                sx={{ fontSize: '0.7rem', height: 22, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}
              />
            </Tooltip>
          )}

          <Tooltip title={t('参数设置')}>
            <IconButton
              size="small"
              onClick={() => setShowSettings((s) => !s)}
              color={showSettings ? 'primary' : 'default'}
              aria-label={t('参数设置')}
              aria-expanded={showSettings}
            >
              <Tune sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {keyError && (
            <Tooltip title={keyError}>
              <IconButton size="small" color="error" aria-label={keyError}>
                <ErrorOutline sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* 账户：登录态收成头像，比一个长 email chip 省空间。
              email 放 tooltip 里，不直接摊在栏上（也少一点肩窥风险）。 */}
          {bridgeLoading && <CircularProgress size={14} sx={{ color: 'text.disabled' }} />}
          {!bridgeLoading && bridgeInfo && (
            <Tooltip
              arrow
              title={
                <Box sx={{ py: 0.25 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {userEmail || t('已登录')}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.75 }}>
                    {bridgeInfo.mode === 'sub2api' ? t('sub2api 模式') : t('New API 模式')}
                  </Typography>
                </Box>
              }
            >
              <Box
                sx={{
                  width: 24, height: 24, flexShrink: 0,
                  borderRadius: '50%',
                  display: 'grid', placeItems: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                  color: 'primary.main',
                  fontSize: '0.68rem', fontWeight: 700,
                  userSelect: 'none', cursor: 'default',
                }}
              >
                {(userEmail || '?').trim().charAt(0).toUpperCase()}
              </Box>
            </Tooltip>
          )}
          {!bridgeLoading && !bridgeInfo && (
            <Tooltip title={t('未登录 —— 请先在面板登录')} arrow>
              <Chip
                size="small"
                variant="outlined"
                color="warning"
                label={t('未登录')}
                sx={{ fontSize: '0.68rem', height: 22 }}
              />
            </Tooltip>
          )}
        </Box>

        {/* 设置面板：浮窗（Dialog）而非从顶部下拉 */}
        <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700, pb: 1 }}>
            {t('参数设置')}
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 1.5 }}>
            <SettingsPanel config={config} setConfig={setConfig} models={visibleModels} groups={groups} />
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={() => setShowSettings(false)}>{t('关闭')}</Button>
          </DialogActions>
        </Dialog>

        {/* 保存失败警告：无声丢消息比崩溃更糟，必须显式告知 */}
        {saveError && (
          <Box
            sx={{
              mx: 2, mt: 1, px: 1.5, py: 1, borderRadius: 1.5,
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              border: '1px solid',
              borderColor: alpha(theme.palette.warning.main, 0.35),
              display: 'flex', alignItems: 'center', gap: 1,
            }}
          >
            <ErrorOutline sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'warning.main', flex: 1 }}>
              {saveError === 'too_large'
                ? t('这个会话太大，新消息已停止自动保存。建议导出后新建会话。')
                : t('浏览器存储不可用或已满，新消息不会被保存。建议导出重要内容。')}
            </Typography>
          </Box>
        )}

        {/* 错误横幅 */}
        {keyError && (
          <Box
            sx={{
              mx: 2, mt: 1, px: 1.5, py: 1, borderRadius: 1.5,
              bgcolor: alpha(theme.palette.error.main, 0.08),
              border: '1px solid',
              borderColor: alpha(theme.palette.error.main, 0.3),
              display: 'flex', alignItems: 'center', gap: 1,
            }}
          >
            <ErrorOutline sx={{ fontSize: 16, color: 'error.main' }} />
            <Typography variant="caption" sx={{ color: 'error.main', flex: 1 }}>
              {keyError}
            </Typography>
            <IconButton size="small" onClick={() => setKeyError(null)} aria-label={t('关闭')}>
              <Close sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}

        {/* 消息区 */}
        <Box
          ref={scrollAreaRef}
          sx={{
            flex: 1, overflowY: 'auto',
            px: { xs: 1, md: 3 },
            py: 2,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
          }}
        >
          <Box sx={{ maxWidth: 860, mx: 'auto' }}>
            {/* 分享内容的只读预览。链接里的内容不写进本地会话，
                要留下来得点「存为新会话」—— 避免别人的链接污染你的历史。 */}
            {viewingShared && (
              <Box
                sx={{
                  mb: 2.5, px: 2, py: 1.5, borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.info.main, 0.07),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.info.main, 0.3),
                  display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>
                    {shared.title}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.65, fontSize: '0.7rem' }}>
                    {t('这是别人分享的会话（只读）')}
                    {shared.model ? ` · ${shared.model}` : ''}
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={importShared}>
                  {t('存为新会话')}
                </Button>
                <Button size="small" onClick={() => setSharedDismissed(true)}>
                  {t('忽略')}
                </Button>
              </Box>
            )}

            {viewingShared ? (
              sharedMessages.map((m) => (
                <ChatMessage key={m.key} message={m} isBusy />
              ))
            ) : !messages.length ? (
              <WelcomeHero
                signedIn={Boolean(bridgeInfo)}
                loading={bridgeLoading}
                onPickPrompt={(text) => {
                  setInput(text);
                  // 填进输入框后把焦点交回去，让人可以直接改或直接发
                  requestAnimationFrame(() => {
                    document.querySelector('textarea')?.focus();
                  });
                }}
              />
            ) : (
              messages.map((m) => (
                <ChatMessage
                  key={m.key}
                  message={m}
                  onDelete={handleDelete}
                  onRegenerate={handler.regenerate}
                  onEditResend={handler.editAndResend}
                  isBusy={isStreaming && m.key !== activeKey}
                />
              ))
            )}
            <div ref={bottomRef} />
          </Box>
        </Box>

        {/* 输入条（Claude Code 风格）+ BTW 侧问浮层 */}
        <Box sx={{ px: { xs: 1, md: 3 }, pb: 2, pt: 1, position: 'relative' }}>
          <Box sx={{ maxWidth: 860, mx: 'auto', position: 'relative' }}>
            {/* 模型选择菜单：贴着输入框上方弹出 */}
            <ModelPicker
              // key 变化强制重挂 → 每次打开都以 initialQuery 为初值重置内部状态
              key={modelPicker.open ? `mp-${modelPicker.query}` : 'mp-closed'}
              open={modelPicker.open}
              models={visibleModels}
              current={config.model}
              initialQuery={modelPicker.query}
              onPick={(m) => {
                setConfig((c) => ({ ...c, model: m }));
                setModelPicker({ open: false, query: '' });
                setToast(`${t('已切换到')} ${m}`);
              }}
              onClose={() => setModelPicker({ open: false, query: '' })}
            />
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onStop={handler.stop}
              isStreaming={isStreaming}
              onPasteImage={(url) => setImageUrls((p) => [...p, url])}
              imageUrls={imageUrls}
              onRemoveImage={(i) => setImageUrls((p) => p.filter((_, j) => j !== i))}
              onRunCommand={handleCommand}
              config={config}
              onOpenModelPicker={() => setModelPicker({ open: true, query: '' })}
              onOpenSettings={() => setShowSettings(true)}
            />
          </Box>
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.75, opacity: 0.4, fontSize: '0.65rem' }}>
            {t('AI 也可能出错，请核验重要信息。对话与用量绑定你的 API key。')}
          </Typography>

          {/* BTW 浮层 */}
          <BtwOverlay
            open={btw.open}
            onClose={() => setBtw((b) => ({ ...b, open: false }))}
            question={btw.question}
            answer={btw.answer}
            loading={btw.loading}
            error={btw.error}
          />
        </Box>

        {/* 帮助对话框（/help 或命令菜单） */}
        <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
            {t('斜杠命令')}
          </DialogTitle>
          <DialogContent dividers>
            {/* 帮助条目：模块级常量，避免 render 内 destructure 图标变量触发
                no-unused-vars（本项目 eslint 未开 react/jsx-uses-vars，JSX 使用不计数） */}
            <HelpItems />
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={() => setHelpOpen(false)}>{t('关闭')}</Button>
          </DialogActions>
        </Dialog>

        {/* 导出/分享的轻提示 */}
        <Snackbar
          open={Boolean(toast)}
          message={toast}
          autoHideDuration={3600}
          onClose={() => setToast('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Box>
    </Box>
  );
}
