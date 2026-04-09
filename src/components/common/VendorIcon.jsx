import React, { Suspense, lazy } from 'react';
import { Box } from '@mui/material';

// Lazy-load lobehub icons to avoid bundling all of them
const icons = {
  OpenAI: lazy(() => import('@lobehub/icons/es/OpenAI').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Anthropic: lazy(() => import('@lobehub/icons/es/Anthropic').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Claude: lazy(() => import('@lobehub/icons/es/Claude').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Google: lazy(() => import('@lobehub/icons/es/Google').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Gemini: lazy(() => import('@lobehub/icons/es/Gemini').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  DeepSeek: lazy(() => import('@lobehub/icons/es/DeepSeek').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Meta: lazy(() => import('@lobehub/icons/es/Meta').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Mistral: lazy(() => import('@lobehub/icons/es/Mistral').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Cohere: lazy(() => import('@lobehub/icons/es/Cohere').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Moonshot: lazy(() => import('@lobehub/icons/es/Moonshot').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Qwen: lazy(() => import('@lobehub/icons/es/Qwen').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Zhipu: lazy(() => import('@lobehub/icons/es/Zhipu').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Perplexity: lazy(() => import('@lobehub/icons/es/Perplexity').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  XAI: lazy(() => import('@lobehub/icons/es/XAI').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Grok: lazy(() => import('@lobehub/icons/es/Grok').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Ollama: lazy(() => import('@lobehub/icons/es/Ollama').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  Baidu: lazy(() => import('@lobehub/icons/es/Baidu').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
  SiliconCloud: lazy(() => import('@lobehub/icons/es/SiliconCloud').then(m => ({ default: m.default?.Avatar || m.Avatar || (() => null) }))),
};

// Map vendor names to icon keys (handles aliases)
const VENDOR_MAP = {
  'OpenAI': 'OpenAI',
  'Anthropic': 'Claude',
  'Anthropic Claude': 'Claude',
  'Claude': 'Claude',
  'Google': 'Gemini',
  'Google Gemini': 'Gemini',
  'Gemini': 'Gemini',
  'DeepSeek': 'DeepSeek',
  'Meta': 'Meta',
  'Mistral': 'Mistral',
  'Mistral AI': 'Mistral',
  'Cohere': 'Cohere',
  'Moonshot': 'Moonshot',
  'Qwen': 'Qwen',
  '阿里通义千问': 'Qwen',
  '阿里巴巴': 'Qwen',
  'Perplexity': 'Perplexity',
  'xAI': 'Grok',
  'xAI Grok': 'Grok',
  'Grok': 'Grok',
  '智谱': 'Zhipu',
  '智谱 GLM': 'Zhipu',
  'Ollama': 'Ollama',
  '百度': 'Baidu',
  '百度文心千帆': 'Baidu',
  'SiliconCloud': 'SiliconCloud',
};

// Map API icon field (e.g. "Claude.Color", "XAI", "Gemini.Color") to lobehub icon key
const ICON_FIELD_MAP = {
  'Claude': 'Claude',
  'Claude.Color': 'Claude',
  'OpenAI': 'OpenAI',
  'OpenAI.Color': 'OpenAI',
  'Gemini': 'Gemini',
  'Gemini.Color': 'Gemini',
  'DeepSeek': 'DeepSeek',
  'DeepSeek.Color': 'DeepSeek',
  'Qwen': 'Qwen',
  'Qwen.Color': 'Qwen',
  'XAI': 'Grok',
  'XAI.Color': 'Grok',
  'Grok': 'Grok',
  'Grok.Color': 'Grok',
  'Meta': 'Meta',
  'Meta.Color': 'Meta',
  'Ollama': 'Ollama',
  'Ollama.Color': 'Ollama',
  'Anthropic': 'Anthropic',
  'Anthropic.Color': 'Anthropic',
  'Mistral': 'Mistral',
  'Mistral.Color': 'Mistral',
  'Cohere': 'Cohere',
  'Cohere.Color': 'Cohere',
  'Moonshot': 'Moonshot',
  'Moonshot.Color': 'Moonshot',
  'Zhipu': 'Zhipu',
  'Zhipu.Color': 'Zhipu',
  'Perplexity': 'Perplexity',
  'Perplexity.Color': 'Perplexity',
  'Baidu': 'Baidu',
  'Baidu.Color': 'Baidu',
  'SiliconCloud': 'SiliconCloud',
  'SiliconCloud.Color': 'SiliconCloud',
};

function FallbackIcon({ name, size }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'action.hover', fontSize: size * 0.4, fontWeight: 700, color: 'text.secondary',
    }}>
      {(name || '?').substring(0, 2)}
    </Box>
  );
}

/**
 * Renders a vendor/provider icon from @lobehub/icons.
 * Falls back to initials if no icon found.
 * @param {string} name - Vendor name (e.g., "OpenAI", "Anthropic", "阿里通义千问")
 * @param {string} icon - API icon field (e.g., "Claude.Color", "XAI", "Gemini.Color") — takes priority over name
 * @param {number} size - Icon size in px (default 32)
 */
export default function VendorIcon({ name, icon, size = 32 }) {
  // Prefer API icon field, then fall back to vendor name mapping
  const key = (icon && ICON_FIELD_MAP[icon]) || VENDOR_MAP[name];
  const IconComponent = key ? icons[key] : null;

  if (!IconComponent) return <FallbackIcon name={name} size={size} />;

  return (
    <Suspense fallback={<FallbackIcon name={name} size={size} />}>
      <IconComponent size={size} />
    </Suspense>
  );
}
