// 输入框。参考 Claude Code Desktop / Codex Desktop / DeepSeek 的设计语言：
//   - 一个干净的大圆角容器，输入区在上、工具行在下
//   - 工具行是低对比度的小 pill 按钮（不是花哨的 Chip 堆叠）
//   - 发送键是右下角的实心圆形按钮，只在有内容时高亮
//   - `/` 弹命令菜单（前缀匹配，方向键导航）
//   - 模型名做成可点的 pill —— 切模型是高频操作，点一下就弹选择菜单
//
// 关键取舍：不在输入框里堆状态 Chip（联网/模型/快捷键三个 Chip 显得臃肿）。
// 只留「模型 pill + 联网开关 + 设置」三个必要入口，其余靠 tooltip。

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box, Typography, IconButton, Tooltip, alpha, useTheme,
  Paper, MenuItem, MenuList, ButtonBase,
} from '@mui/material';
import {
  ArrowUpward, StopCircle, AttachFile, Close, ModelTraining, Public,
  Psychology, DeleteSweep, HelpOutline, Bolt, Tune, ExpandMore,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { SLASH_COMMANDS, parseSlashCommand } from '../lib/slashCommands';

const COMMAND_ICONS = {
  model: ModelTraining,
  web: Public,
  btw: Psychology,
  clear: DeleteSweep,
  help: HelpOutline,
  bolt: Bolt,
};

const ITEM_H = 46; // 每项高度（滑块定位靠它，改样式时要同步）

// 斜杠命令菜单。
//
// 动效设计：
//   1. 整体入场 —— 从下方 8px + scale(0.97) 弹上来，用 cubic-bezier(0.16,1,0.3,1)
//      这条曲线（快起慢收），比线性/ease 更有"被弹出来"的手感，不生硬。
//   2. 选中态是**一个会滑动的滑块**，不是每项各自换背景色。滑块用 transform
//      移动（走 GPU 合成，不触发重排），所以上下键连按也很顺。
//   3. hover/选中项轻微放大，给一点触感反馈。
//
// 为什么滑块要单独一层：如果靠每个 MenuItem 的 selected 背景色切换，
// 视觉上是"这个亮起、那个暗掉"的闪烁；单独一层做位移，眼睛会跟着它走。
function SlashMenu({ matches, activeIndex, onPick, onHover, reduceMotion }) {
  const theme = useTheme();
  if (!matches?.length) return null;

  const safeIndex = Math.min(Math.max(activeIndex, 0), matches.length - 1);

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        bottom: '100%', left: 0, mb: 1,
        minWidth: 320, maxHeight: 340, overflowY: 'auto', overflowX: 'hidden',
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.2),
        bgcolor: alpha(theme.palette.background.paper, 0.97),
        backdropFilter: 'blur(14px)',
        zIndex: 1100,
        transformOrigin: 'bottom left',
        ...(reduceMotion ? {} : {
          animation: 'skiMenuIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
          '@keyframes skiMenuIn': {
            from: { opacity: 0, transform: 'translateY(8px) scale(0.97)' },
            to: { opacity: 1, transform: 'none' },
          },
        }),
      }}
    >
      <Box sx={{ position: 'relative', py: 0.5 }}>
        {/* 滑动选中块：跟着 activeIndex 平移 */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: 4, right: 4,
            top: 4,
            height: ITEM_H,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.22),
            transform: `translateY(${safeIndex * ITEM_H}px)`,
            transition: reduceMotion
              ? 'none'
              : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
          }}
        />

        <MenuList dense sx={{ py: 0, position: 'relative' }} disablePadding>
          {matches.map((cmd, i) => {
            const Icon = COMMAND_ICONS[cmd.icon] || Bolt;
            const isActive = i === safeIndex;
            return (
              <MenuItem
                key={cmd.name}
                onClick={() => onPick(cmd)}
                // 鼠标移上去也让滑块跟过来 —— 键盘和鼠标共用同一个"预选"状态
                onMouseEnter={() => onHover?.(i)}
                sx={{
                  gap: 1.25, mx: 0.5, px: 1,
                  height: ITEM_H, borderRadius: 1.5,
                  // 背景交给滑块，这里保持透明（含 hover/selected）
                  bgcolor: 'transparent !important',
                  transition: reduceMotion
                    ? 'none'
                    : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isActive && !reduceMotion ? 'scale(1.015)' : 'none',
                }}
              >
                <Icon
                  sx={{
                    fontSize: 17, flexShrink: 0,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    transition: reduceMotion ? 'none' : 'color 180ms, transform 180ms',
                    transform: isActive && !reduceMotion ? 'scale(1.1)' : 'none',
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontSize: '0.79rem', fontFamily: 'monospace',
                        fontWeight: isActive ? 700 : 500,
                        transition: reduceMotion ? 'none' : 'font-weight 120ms',
                      }}
                    >
                      /{cmd.name}
                    </Typography>
                    {/* 参数提示：让人知道这个命令后面能跟什么 */}
                    {cmd.args && (
                      <Typography
                        sx={{
                          fontSize: '0.7rem', fontFamily: 'monospace',
                          opacity: isActive ? 0.6 : 0.35,
                          transition: reduceMotion ? 'none' : 'opacity 180ms',
                        }}
                      >
                        {cmd.args}
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontSize: '0.66rem',
                      opacity: isActive ? 0.72 : 0.45,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: reduceMotion ? 'none' : 'opacity 180ms',
                    }}
                  >
                    {cmd.desc}
                  </Typography>
                </Box>
                {/* Tab 提示只给当前项，淡入 */}
                <Typography
                  aria-hidden="true"
                  variant="caption"
                  sx={{
                    fontSize: '0.6rem', flexShrink: 0, ml: 1,
                    border: '1px solid', borderColor: 'divider',
                    borderRadius: 0.5, px: 0.5,
                    opacity: isActive ? 0.5 : 0,
                    transition: reduceMotion ? 'none' : 'opacity 180ms',
                  }}
                >
                  Tab
                </Typography>
              </MenuItem>
            );
          })}
        </MenuList>
      </Box>
    </Paper>
  );
}

// 底部工具行的小 pill 按钮
function ToolPill({ icon: Icon, label, active, onClick, title, endIcon: EndIcon }) {
  const theme = useTheme();
  return (
    <Tooltip title={title || label} arrow>
      <ButtonBase
        onClick={onClick}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5,
          px: 0.9, py: 0.4, borderRadius: 1,
          fontSize: '0.7rem',
          color: active ? 'primary.main' : 'text.secondary',
          bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
          border: '1px solid',
          borderColor: active ? alpha(theme.palette.primary.main, 0.3) : alpha(theme.palette.text.primary, 0.1),
          transition: 'all 150ms',
          maxWidth: 240,
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, active ? 0.16 : 0.06),
            borderColor: alpha(theme.palette.primary.main, 0.35),
          },
        }}
      >
        {Icon && <Icon sx={{ fontSize: 13 }} />}
        {label && (
          <Typography
            component="span"
            sx={{
              fontSize: '0.7rem', fontWeight: 500, lineHeight: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
        )}
        {EndIcon && <EndIcon sx={{ fontSize: 12, opacity: 0.6 }} />}
      </ButtonBase>
    </Tooltip>
  );
}

export default function ChatInput({
  value, onChange, onSend, onStop, isStreaming,
  onPasteImage, imageUrls, onRemoveImage,
  onRunCommand, config, onOpenModelPicker, onOpenSettings,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);
  // 输入法合成状态。只靠 e.nativeEvent.isComposing 不够 —— Safari 在部分
  // 输入法下不设这个字段，中文选词时按 Enter 会误发送。
  const composingRef = useRef(false);
  // 系统开了"减少动态效果"就退化成无动画（无障碍要求）
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined'
      && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches),
    []
  );

  // 菜单可见性从 value 派生（不在 effect 里 setState）。
  // parseSlashCommand 现在直接给出该显示的候选：还在打命令名就有 matches，
  // 输了空格（进入填参数阶段）就是空数组。
  const wantsMenu = value.startsWith('/') && !value.startsWith('/ ');
  const parsedNow = wantsMenu ? parseSlashCommand(value) : null;
  // useMemo 稳定引用：直接 `?? []` 每次渲染都是新数组，会让下游 useCallback 失效
  const menuMatches = useMemo(() => parsedNow?.matches ?? [], [parsedNow]);

  // 输入变化时重置菜单状态（纯派生，条件 setState 是 React 认可的模式）
  const [lastInputKey, setLastInputKey] = useState(value);
  if (value !== lastInputKey) {
    setLastInputKey(value);
    setMenuIndex(0);
    setMenuDismissed(false);
  }

  const showMenu = wantsMenu && menuMatches.length > 0 && !menuDismissed;
  const canSend = Boolean(value.trim() || imageUrls.length);

  // 输入框用一句固定文案。打字机效果挪到了欢迎区标题（WelcomeHero）——
  // 放在输入框里会和用户即将输入的位置重叠，动个不停反而干扰。

  // Tab：只补全命令名，留在输入框继续填参数（不执行）。
  // 这样 `/mod` + Tab → `/model `，光标停在后面等你输模型名。
  const completeCommand = useCallback((cmd) => {
    onChange(`/${cmd.name} `);
    textareaRef.current?.focus();
  }, [onChange]);

  // Enter / 点击：执行命令。无参数的命令直接跑，需要参数的先补全等输入。
  const pickCommand = useCallback((cmd) => {
    if (cmd.name === 'help') {
      onRunCommand?.({ type: 'help' });
      onChange('');
    } else if (cmd.name === 'clear') {
      onRunCommand?.({ type: 'cleared' });
      onChange('');
    } else if (cmd.name === 'model') {
      // 模型选择本身就是个菜单，直接弹，不用再打字
      onChange('');
      onRunCommand?.({ type: 'model', query: '' });
    } else {
      // btw / websearch 这类要参数的：补全命令名，等用户接着输
      onChange(`/${cmd.name} `);
    }
    textareaRef.current?.focus();
  }, [onChange, onRunCommand]);

  const handleKey = useCallback((e) => {
    // 输入法合成中：所有按键都归输入法（Enter 是确认候选、方向键是翻候选页），
    // 既不发送也不驱动斜杠菜单导航。
    if (composingRef.current || e.nativeEvent?.isComposing) return;

    if (showMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMenuIndex((i) => (i + 1) % menuMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMenuIndex((i) => (i - 1 + menuMatches.length) % menuMatches.length);
        return;
      }
      // Tab = 补全命令名，留在输入框填参数；Enter = 执行
      if (e.key === 'Tab') {
        const cmd = menuMatches[menuIndex];
        if (cmd) {
          e.preventDefault();
          completeCommand(cmd);
          return;
        }
      }
      if (e.key === 'Enter') {
        const cmd = menuMatches[menuIndex];
        if (cmd) {
          e.preventDefault();
          pickCommand(cmd);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuDismissed(true);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [showMenu, menuMatches, menuIndex, pickCommand, completeCommand, onSend]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        // 限 5MB：大 base64 会撑爆 localStorage 预算导致整轮保存被丢弃
        if (file && file.size <= 5 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onload = () => onPasteImage?.(reader.result);
          reader.readAsDataURL(file);
        }
      }
    }
  }, [onPasteImage]);

  const onFilePicked = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f && f.size <= 5 * 1024 * 1024) {
      const r = new FileReader();
      r.onload = () => onPasteImage?.(r.result);
      r.readAsDataURL(f);
    }
    e.target.value = '';
  }, [onPasteImage]);

  const toggleWebSearch = useCallback(() => {
    onRunCommand?.({ type: 'websearch-toggle' });
  }, [onRunCommand]);

  return (
    <Box sx={{ position: 'relative' }}>
      <SlashMenu
        matches={showMenu ? menuMatches : null}
        activeIndex={menuIndex}
        onPick={pickCommand}
        onHover={setMenuIndex}
        reduceMotion={reduceMotion}
      />

      <Box
        sx={{
          // 方一点：跟随站点其余卡片的圆角语言，不做胶囊
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: alpha(theme.palette.text.primary, 0.12),
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.02),
          transition: 'border-color 180ms, box-shadow 180ms',
          '&:focus-within': {
            borderColor: alpha(theme.palette.primary.main, 0.5),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}`,
          },
        }}
      >
        {/* 图片预览 */}
        {imageUrls.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, px: 1.75, pt: 1.5 }}>
            {imageUrls.map((u, i) => (
              <Box key={i} sx={{ position: 'relative', display: 'inline-block' }}>
                <Box
                  component="img"
                  src={u}
                  alt=""
                  sx={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 2, display: 'block' }}
                />
                <IconButton
                  size="small"
                  aria-label={t('移除图片')}
                  onClick={() => onRemoveImage?.(i)}
                  sx={{
                    position: 'absolute', top: -6, right: -6, p: 0.15,
                    bgcolor: 'background.paper',
                    border: '1px solid', borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Close sx={{ fontSize: 11 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* 文本区 */}
        <Box
          component="textarea"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          onPaste={handlePaste}
          placeholder={t('今天我能为你提供什么帮助？')}
          aria-label={t('输入消息')}
          rows={Math.min(8, Math.max(1, value.split('\n').length))}
          sx={{
            display: 'block', width: '100%', boxSizing: 'border-box',
            resize: 'none', outline: 'none', border: 'none',
            bgcolor: 'transparent',
            px: 1.75, pt: 1.5, pb: 0.5,
            fontFamily: 'inherit', fontSize: '0.925rem', lineHeight: 1.65,
            color: 'text.primary', maxHeight: 220,
            '&::placeholder': { color: 'text.disabled' },
          }}
        />

        {/* 工具行 */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.6,
            px: 1.25, pb: 1.1, pt: 0.4,
          }}
        >
          <input
            type="file"
            accept="image/*"
            hidden
            ref={fileInputRef}
            onChange={onFilePicked}
            aria-hidden="true"
          />
          <Tooltip title={t('添加图片')} arrow>
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t('添加图片')}
              sx={{ p: 0.6, color: 'text.secondary' }}
            >
              <AttachFile sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>

          {/* 模型 pill：点开模型选择菜单 */}
          <ToolPill
            icon={ModelTraining}
            label={config?.model || t('选择模型')}
            title={t('切换模型（也可输入 /model）')}
            onClick={onOpenModelPicker}
            endIcon={ExpandMore}
          />

          {/* 联网开关 */}
          <ToolPill
            icon={Public}
            label={t('联网')}
            active={Boolean(config?.webSearch)}
            title={config?.webSearch ? t('联网搜索：已开') : t('联网搜索：已关')}
            onClick={toggleWebSearch}
          />

          {/* 设置 */}
          <Tooltip title={t('参数设置')} arrow>
            <IconButton
              size="small"
              onClick={onOpenSettings}
              aria-label={t('参数设置')}
              sx={{ p: 0.6, color: 'text.secondary' }}
            >
              <Tune sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Box sx={{ flex: 1 }} />

          {/* 发送 / 停止 */}
          {isStreaming ? (
            <Tooltip title={t('停止生成')} arrow>
              <IconButton
                onClick={onStop}
                aria-label={t('停止生成')}
                sx={{
                  p: 0.7, color: 'error.main',
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.18) },
                }}
              >
                <StopCircle sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title={canSend ? t('发送（Enter）') : t('输入内容后发送')} arrow>
              <IconButton
                onClick={onSend}
                disabled={!canSend}
                aria-label={t('发送')}
                sx={{
                  p: 0.7,
                  color: canSend ? 'primary.contrastText' : 'text.disabled',
                  bgcolor: canSend ? 'primary.main' : alpha(theme.palette.text.primary, 0.06),
                  transition: 'all 150ms',
                  '&:hover': { bgcolor: canSend ? 'primary.dark' : alpha(theme.palette.text.primary, 0.1) },
                  '&.Mui-disabled': { color: 'text.disabled' },
                }}
              >
                <ArrowUpward sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
}
