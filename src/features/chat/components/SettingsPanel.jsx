// 参数面板。对标 New API Playground 的 playground-parameter-panel，用 MUI 重写。
//
// 本次增强（2026-08-09）：
//   1. 模型选择从 Select 换成 Autocomplete —— 可打字搜索、模糊补填。
//      模型多了以后 Select 的下拉翻页是灾难，Autocomplete 是标配。
//   2. 分组下拉「始终显示」—— 之前 groups 为空就整块隐藏，看起来像 bug。
//      现在空时显示「无可用分组」占位，并附一句说明分组由 API key 决定。
//   3. 主题切换（深/浅）—— 走仓库 ThemeContext 的 useThemeMode，持久化到
//      localStorage['theme_mode']，刷新不丢。
//   4. 公开自定义区 —— 预留一组可扩展的项（当前放「使用说明」类链接/入口），
//      后续要公开什么自定义内容往这个区域加即可，不动核心参数逻辑。
//
// 每个采样参数仍保持「开关 + 滑块」两段式：关掉就不进 payload
// （而不是发默认值——那会覆盖上游默认策略，两种语义不同）。

import React, { useState } from 'react';
import {
  Box, Stack, Typography, Slider, Switch, TextField, FormControlLabel,
  Autocomplete, FormControl, InputLabel, Select, MenuItem, Divider, Tooltip, IconButton,
  alpha, useTheme,
} from '@mui/material';
import { HelpOutline, RestartAlt, DarkMode, LightMode, Link as LinkIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { defaultChatConfig } from '../hooks/useChatState';

// 单个「开关 + 滑块」行
function ToggleSlider({ label, hint, enabled, onToggle, value, onChange, min, max, step }) {
  const theme = useTheme();
  return (
    <Box sx={{ opacity: enabled ? 1 : 0.55, transition: 'opacity 150ms' }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Switch size="small" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
          {label}
        </Typography>
        {hint && (
          <Tooltip title={hint} arrow>
            <HelpOutline sx={{ fontSize: 12, opacity: 0.5, cursor: 'help' }} />
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace', fontSize: '0.72rem', px: 0.75, py: 0.1, borderRadius: 0.75,
            bgcolor: alpha(theme.palette.primary.main, enabled ? 0.12 : 0.04),
            color: enabled ? 'primary.main' : 'text.disabled',
          }}
        >
          {value}
        </Typography>
      </Stack>
      <Slider
        size="small"
        value={value}
        onChange={(_, v) => onChange(v)}
        disabled={!enabled}
        min={min}
        max={max}
        step={step}
        sx={{ mt: 0.25, py: 0.75 }}
      />
    </Box>
  );
}

// 分组下拉：始终显示。空时占位说明。
// 布尔开关行：标题+说明在左，Switch 靠右。用 space-between 把两侧撑开，
// 保证多行之间的标题、说明、开关三列都是对齐的。
function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 2, py: 0.25,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', display: 'block' }}>
          {label}
        </Typography>
        {hint && (
          <Typography
            variant="caption"
            sx={{ fontSize: '0.65rem', opacity: 0.55, display: 'block', mt: 0.25, lineHeight: 1.45 }}
          >
            {hint}
          </Typography>
        )}
      </Box>
      <Switch
        size="small"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        inputProps={{ 'aria-label': label }}
        sx={{ flexShrink: 0, mt: -0.25 }}
      />
    </Box>
  );
}

function GroupSelect({ groups, value, onChange }) {
  const { t } = useTranslation();
  const options = Array.isArray(groups) ? groups : [];

  return (
    <FormControl size="small" fullWidth>
      <InputLabel sx={{ fontSize: '0.8rem' }}>{t('分组')}</InputLabel>
      <Select
        label={t('分组')}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || '')}
        sx={{ fontSize: '0.82rem' }}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300 } } } }}
      >
        {options.length === 0 && (
          <MenuItem value="" disabled>
            {t('无可用分组')}
          </MenuItem>
        )}
        {options.map((g) => (
          <MenuItem key={g.value} value={g.value} sx={{ fontSize: '0.82rem' }}>
            {g.label}
          </MenuItem>
        ))}
      </Select>
      {options.length === 0 && (
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.55, fontSize: '0.68rem' }}>
          {t('分组由 API key 决定，此处仅展示可用项')}
        </Typography>
      )}
    </FormControl>
  );
}

export default function SettingsPanel({ config, setConfig, models, groups }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { mode, toggleTheme } = useThemeMode();
  const [modelInput, setModelInput] = useState('');
  const set = (patch) => setConfig((c) => ({ ...c, ...patch }));

  const modelOptions = Array.isArray(models) ? models : [];
  const currentModel = config.model || '';

  // 可公开的自定义内容区。每项：{ label, desc, href? }。
  // 想公开更多内容就往这个数组加，UI 会自动渲染，不动核心参数逻辑。
  const publicItems = [
    { label: t('模型广场'), desc: t('浏览全部可用模型与定价'), href: '/model-plaza' },
    { label: t('接入文档'), desc: t('OpenAI / Anthropic 兼容接入说明'), href: 'https://docs.skiapi.dev' },
  ];

  return (
    <Box
      sx={{
        p: 2, borderRadius: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.5),
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
          {t('请求参数')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={t('切换深色/浅色')}>
          <IconButton size="small" onClick={toggleTheme} aria-label={t('切换主题')}>
            {mode === 'dark' ? <LightMode sx={{ fontSize: 15 }} /> : <DarkMode sx={{ fontSize: 15 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('恢复默认')}>
          <IconButton
            size="small"
            aria-label={t('恢复默认')}
            onClick={() => setConfig((c) => ({ ...defaultChatConfig, model: c.model, group: c.group }))}
          >
            <RestartAlt sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack spacing={1.75}>
        {/* 模型 + 分组 */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {/* 模型：Autocomplete，可打字搜索。 */}
          <Autocomplete
            size="small"
            fullWidth
            freeSolo={false}
            options={modelOptions}
            value={currentModel}
            inputValue={modelInput}
            onInputChange={(_, v) => setModelInput(v)}
            onChange={(_, v) => set({ model: v || '' })}
            getOptionLabel={(o) => o}
            noOptionsText={modelOptions.length ? t('无匹配模型') : t('模型列表为空，请检查登录与分组')}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('模型')}
                placeholder={t('输入模型名搜索，如 claude / gpt / gemini…')}
                InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                inputProps={{ ...params.inputProps, style: { fontSize: '0.82rem' } }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ fontSize: '0.82rem' }}>
                {option}
              </Box>
            )}
            sx={{ '& .MuiAutocomplete-input': { fontSize: '0.82rem' } }}
          />

          <GroupSelect
            groups={groups}
            value={config.group}
            onChange={(v) => {
              // 换分组时如果当前模型不在新分组里，自动切到新分组的第一个 ——
              // 否则会拿着旧分组的模型 ID 去请求，网关必然报模型不可用。
              const g = (Array.isArray(groups) ? groups : []).find((x) => x.value === v);
              const allowed = g?.models || [];
              if (allowed.length && config.model && !allowed.includes(config.model)) {
                set({ group: v, model: allowed[0] });
              } else {
                set({ group: v });
              }
            }}
          />
        </Stack>

        {/* 推理强度。留空 = 不发这个字段，跟随上游/分组默认。
            合法值来自 sub2api 的 normalize 分支：none/minimal/low/medium/high */}
        <FormControl size="small" fullWidth>
          <InputLabel sx={{ fontSize: '0.8rem' }}>{t('推理强度')}</InputLabel>
          <Select
            label={t('推理强度')}
            value={config.reasoningEffort || ''}
            onChange={(e) => set({ reasoningEffort: e.target.value })}
            sx={{ fontSize: '0.82rem' }}
          >
            <MenuItem value="" sx={{ fontSize: '0.82rem' }}>{t('默认（不指定）')}</MenuItem>
            <MenuItem value="none" sx={{ fontSize: '0.82rem' }}>none — {t('不推理')}</MenuItem>
            <MenuItem value="minimal" sx={{ fontSize: '0.82rem' }}>minimal — {t('极少')}</MenuItem>
            <MenuItem value="low" sx={{ fontSize: '0.82rem' }}>low — {t('低')}</MenuItem>
            <MenuItem value="medium" sx={{ fontSize: '0.82rem' }}>medium — {t('中')}</MenuItem>
            <MenuItem value="high" sx={{ fontSize: '0.82rem' }}>high — {t('高（更慢更贵）')}</MenuItem>
          </Select>
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.55, fontSize: '0.65rem' }}>
            {t('只对支持推理的模型有效；分组可能设了上限，超出会被网关钳制')}
          </Typography>
        </FormControl>

        {/* 系统提示词 */}
        <TextField
          label={t('系统提示词')}
          placeholder={t('给模型的角色与规则设定，留空则不发送')}
          multiline
          minRows={2}
          maxRows={6}
          size="small"
          fullWidth
          value={config.systemPrompt}
          onChange={(e) => set({ systemPrompt: e.target.value })}
          InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
          InputProps={{ sx: { fontSize: '0.82rem' } }}
        />

        <Divider />

        {/* 采样参数 */}
        <ToggleSlider
          label="temperature"
          hint={t('随机性。低=稳定保守，高=发散有创意。不开则用上游默认')}
          enabled={config.temperatureEnabled}
          onToggle={(v) => set({ temperatureEnabled: v })}
          value={config.temperature}
          onChange={(v) => set({ temperature: v })}
          min={0}
          max={2}
          step={0.01}
        />
        <ToggleSlider
          label="top_p"
          hint={t('核采样。只从累积概率前 p 的词里选。一般与 temperature 二选一')}
          enabled={config.topPEnabled}
          onToggle={(v) => set({ topPEnabled: v })}
          value={config.topP}
          onChange={(v) => set({ topP: v })}
          min={0}
          max={1}
          step={0.01}
        />
        <ToggleSlider
          label="max_tokens"
          hint={t('单次回复的最大长度上限（不含输入）')}
          enabled={config.maxTokensEnabled}
          onToggle={(v) => set({ maxTokensEnabled: v })}
          value={config.maxTokens}
          onChange={(v) => set({ maxTokens: v })}
          min={256}
          max={64000}
          step={256}
        />

        <Divider />

        {/* 开关行：标题+说明在左、Switch 靠右对齐。
            之前用 FormControlLabel（switch 在左、label 紧贴）导致
            标题和右侧说明文字既不对齐也没有间距。 */}
        <ToggleRow
          label={t('流式输出')}
          hint={t('逐字返回（SSE）。关掉则等完整回复一次性显示')}
          checked={Boolean(config.stream)}
          onChange={(v) => set({ stream: v })}
        />

        {/* 联网开关：请求带 web_search 工具，由网关执行联网 */}
        <ToggleRow
          label={t('联网搜索')}
          hint={t('让模型搜索最新信息。需管理员在后台配置搜索服务')}
          checked={Boolean(config.webSearch)}
          onChange={(v) => set({ webSearch: v })}
        />

        <Divider />

        {/* 公开自定义区：往 publicItems 加项即可扩展 */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', opacity: 0.7 }}>
            {t('更多内容')}
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 0.75 }}>
            {publicItems.map((item) => (
              <Box
                key={item.label}
                component="a"
                href={item.href}
                target={item.href?.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 1.25, py: 0.75, borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  textDecoration: 'none', color: 'inherit',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                }}
              >
                <LinkIcon sx={{ fontSize: 13, opacity: 0.6 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  {item.desc && (
                    <Typography variant="caption" sx={{ fontSize: '0.68rem', opacity: 0.6 }}>
                      {item.desc}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
