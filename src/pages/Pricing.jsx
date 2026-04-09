import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, InputAdornment, Chip, Stack,
  Grid, ToggleButton, ToggleButtonGroup, alpha, useTheme, Skeleton, IconButton,
  Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, GlobalStyles,
} from '@mui/material';
import {
  Search, ViewModule, ViewList, StorefrontOutlined, ContentCopy,
  RestartAlt, DarkMode, LightMode, TrendingUp, Speed, Category,
  ArrowBack,
} from '@mui/icons-material';
import { API } from '../api';
import { showError, showSuccess, safeArray, copy } from '../utils';
import EmptyState from '../components/common/EmptyState';
import VendorIcon from '../components/common/VendorIcon';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/ThemeContext';

// ─── Vendor color accents ───────────────────────────────────────────────────
const VENDOR_COLORS = {
  'OpenAI': '#10A37F', 'Anthropic': '#D4A574', 'Claude': '#D4A574',
  'Google': '#4285F4', 'Gemini': '#4285F4', 'xAI': '#1DA1F2', 'Grok': '#1DA1F2',
  'Meta': '#0668E1', 'DeepSeek': '#4D6BFE', '阿里巴巴': '#FF6A00', 'Qwen': '#FF6A00',
  'Mistral': '#F54E42', 'Cohere': '#39594D', 'Moonshot': '#5B5BD6',
  'Perplexity': '#20808D', 'SiliconCloud': '#6366F1', '百度': '#2932E1', '智谱': '#3B5998',
};

// ─── Theme-aware billing colors ─────────────────────────────────────────────
function useBillingColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return {
    usage:   { text: isDark ? '#60A5FA' : '#2563EB', bg: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)' },
    request: { text: isDark ? '#FBBF24' : '#B45309', bg: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(180,83,9,0.08)' },
  };
}

// ─── Keyframe animations ────────────────────────────────────────────────────
const globalAnimations = (
  <GlobalStyles styles={{
    '@keyframes pricingFloat': {
      '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
      '33%': { transform: 'translateY(-8px) rotate(1deg)' },
      '66%': { transform: 'translateY(4px) rotate(-1deg)' },
    },
    '@keyframes pricingPulse': {
      '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
      '50%': { opacity: 0.8, transform: 'scale(1.05)' },
    },
    '@keyframes pricingGradient': {
      '0%': { backgroundPosition: '0% 50%' },
      '50%': { backgroundPosition: '100% 50%' },
      '100%': { backgroundPosition: '0% 50%' },
    },
    '@keyframes pricingFadeUp': {
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    '@keyframes pricingSpin': {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
  }} />
);

// ─── Floating Orb (decorative) ──────────────────────────────────────────────
function FloatingOrb({ color, size, top, left, delay = 0 }) {
  return (
    <Box sx={{
      position: 'absolute', top, left, width: size, height: size,
      borderRadius: '50%', pointerEvents: 'none',
      background: `radial-gradient(circle, ${alpha(color, 0.25)} 0%, transparent 70%)`,
      animation: `pricingFloat ${6 + delay}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      filter: 'blur(1px)',
    }} />
  );
}

// ─── Vendor Pill (hero) ─────────────────────────────────────────────────────
function VendorPill({ vendor, count, selected, onClick, isDark }) {
  const theme = useTheme();
  const vc = VENDOR_COLORS[vendor.name] || theme.palette.primary.main;
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75,
        px: 1.5, py: 0.6, borderRadius: 2.5, cursor: 'pointer',
        border: `1.5px solid ${selected ? alpha(vc, 0.5) : alpha(theme.palette.divider, 0.4)}`,
        backgroundColor: selected
          ? alpha(vc, isDark ? 0.15 : 0.08)
          : alpha(theme.palette.background.paper, isDark ? 0.4 : 0.7),
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        ...(selected && {
          boxShadow: `0 2px 8px ${alpha(vc, isDark ? 0.25 : 0.15)}, inset 0 0 0 1px ${alpha(vc, 0.1)}`,
        }),
        '&:hover': {
          borderColor: alpha(vc, 0.5),
          backgroundColor: alpha(vc, isDark ? 0.18 : 0.1),
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${alpha(vc, 0.15)}`,
        },
        '&:active': { transform: 'scale(0.97)' },
      }}
    >
      <VendorIcon name={vendor.name} icon={vendor.icon} size={18} />
      <Typography variant="caption" sx={{
        fontWeight: selected ? 700 : 500,
        color: selected ? vc : 'text.primary',
        fontSize: '0.76rem', lineHeight: 1,
      }}>
        {vendor.name}
      </Typography>
      <Box sx={{
        px: 0.6, py: 0.15, borderRadius: 1,
        backgroundColor: selected ? alpha(vc, 0.15) : alpha(theme.palette.text.primary, 0.06),
      }}>
        <Typography variant="caption" sx={{
          fontWeight: 700, fontSize: '0.6rem', lineHeight: 1,
          color: selected ? vc : 'text.secondary',
        }}>
          {count}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5,
      borderRadius: 3, flex: 1, minWidth: 160,
      background: alpha(color, theme.palette.mode === 'dark' ? 0.08 : 0.05),
      border: `1px solid ${alpha(color, 0.12)}`,
    }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: alpha(color, 0.12),
      }}>
        <Icon sx={{ fontSize: 18, color }} />
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: '1.1rem' }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>{label}</Typography>
      </Box>
    </Box>
  );
}

// ─── Price Bar (mini visualization) ─────────────────────────────────────────
function PriceBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <Box sx={{ width: '100%', height: 3, borderRadius: 2, bgcolor: alpha(color, 0.1), overflow: 'hidden' }}>
      <Box sx={{
        height: '100%', borderRadius: 2, bgcolor: color,
        width: `${Math.max(pct, 4)}%`,
        transition: 'width 0.5s cubic-bezier(0.2, 0, 0, 1)',
      }} />
    </Box>
  );
}

// ─── Model Card ─────────────────────────────────────────────────────────────
function ModelCard({ model, vendor, maxPrice, index }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const vendorName = vendor?.name || t('未知');
  const vendorColor = VENDOR_COLORS[vendorName] || theme.palette.primary.main;
  const billing = useBillingColors();
  const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit') || '500000');

  const inputPrice = model.model_price > 0
    ? (model.model_price * 2 / quotaPerUnit)
    : (model.model_ratio * 0.002);
  const outputPrice = model.model_price > 0
    ? (model.model_price * 2 * model.completion_ratio / quotaPerUnit)
    : (model.model_ratio * model.completion_ratio * 0.002);

  const copyModel = (e) => {
    e.stopPropagation();
    copy(model.model_name);
    showSuccess(t('模型名称已复制'));
  };

  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      animation: `pricingFadeUp 0.4s ease-out both`,
      animationDelay: `${Math.min(index * 0.04, 0.5)}s`,
      background: isDark
        ? `linear-gradient(145deg, ${alpha(vendorColor, 0.04)} 0%, ${theme.palette.background.paper} 40%)`
        : theme.palette.background.paper,
      transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
      '&::before': {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${vendorColor}, ${alpha(vendorColor, 0.2)})`,
        opacity: 0, transition: 'opacity 0.3s ease',
      },
      '&::after': {
        content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: `radial-gradient(circle at 50% 0%, ${alpha(vendorColor, 0.06)} 0%, transparent 60%)`,
        opacity: 0, transition: 'opacity 0.3s ease', pointerEvents: 'none',
      },
      '&:hover': {
        transform: 'translateY(-6px) scale(1.01)',
        borderColor: alpha(vendorColor, 0.4),
        boxShadow: `0 12px 40px ${alpha(vendorColor, isDark ? 0.2 : 0.12)}, 0 4px 12px ${alpha('#000', 0.05)}`,
        '&::before': { opacity: 1 },
        '&::after': { opacity: 1 },
      },
    }}>
      <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
          <Box sx={{
            p: 0.75, borderRadius: 2.5, position: 'relative',
            background: `linear-gradient(135deg, ${alpha(vendorColor, 0.12)} 0%, ${alpha(vendorColor, 0.04)} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            '&::after': {
              content: '""', position: 'absolute', inset: -1,
              borderRadius: 'inherit', padding: 1,
              background: `linear-gradient(135deg, ${alpha(vendorColor, 0.3)}, transparent)`,
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              opacity: 0.6,
            },
          }}>
            <VendorIcon name={vendorName} icon={vendor?.icon} size={30} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Tooltip title={model.model_name} placement="top-start">
              <Typography variant="subtitle2" sx={{
                fontWeight: 700, lineHeight: 1.3, fontSize: '0.82rem',
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {model.model_name || '-'}
              </Typography>
            </Tooltip>
            <Typography variant="caption" sx={{ color: vendorColor, fontWeight: 600, fontSize: '0.7rem', opacity: 0.8 }}>
              {vendorName}
            </Typography>
          </Box>
          <Tooltip title={t('复制模型名')}>
            <IconButton size="small" onClick={copyModel} sx={{
              opacity: 0, transition: 'all 0.2s',
              '.MuiCard-root:hover &': { opacity: 0.5 },
              '&:hover': { opacity: '1 !important', color: vendorColor, backgroundColor: alpha(vendorColor, 0.1) },
              '&:active': { transform: 'scale(0.9)' },
            }}>
              <ContentCopy sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Prices with bars */}
        <Box sx={{
          mb: 2, p: 1.5, borderRadius: 2.5,
          backgroundColor: isDark ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.015),
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}>
          <Stack spacing={1.2}>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  {t('输入')}
                </Typography>
                <Typography sx={{ fontWeight: 800, color: 'success.main', fontFamily: '"Geist Mono", monospace', fontSize: '0.82rem' }}>
                  ${inputPrice.toFixed(4)}
                </Typography>
              </Stack>
              <PriceBar value={inputPrice} max={maxPrice} color={theme.palette.success.main} />
            </Box>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  {t('输出')}
                </Typography>
                <Typography sx={{ fontWeight: 800, color: 'warning.main', fontFamily: '"Geist Mono", monospace', fontSize: '0.82rem' }}>
                  ${outputPrice.toFixed(4)}
                </Typography>
              </Stack>
              <PriceBar value={outputPrice} max={maxPrice} color={theme.palette.warning.main} />
            </Box>
          </Stack>
        </Box>

        {/* Tags */}
        <Stack direction="row" spacing={0.5} sx={{ mt: 'auto', flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            label={model.quota_type === 0 ? t('按量计费') : t('按次计费')}
            size="small"
            sx={{
              fontSize: '0.62rem', height: 22, fontWeight: 700, letterSpacing: '0.02em',
              backgroundColor: model.quota_type === 0 ? billing.usage.bg : billing.request.bg,
              color: model.quota_type === 0 ? billing.usage.text : billing.request.text,
              border: 'none',
            }}
          />
          {model.enable_groups?.slice(0, 2).map((g, i) => (
            <Chip key={i} label={g} size="small" variant="outlined"
              sx={{ fontSize: '0.62rem', height: 22, opacity: 0.6 }} />
          ))}
          {model.enable_groups?.length > 2 && (
            <Chip label={`+${model.enable_groups.length - 2}`} size="small" variant="outlined"
              sx={{ fontSize: '0.62rem', height: 22, opacity: 0.4 }} />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Pricing Page ───────────────────────────────────────────────────────────
export default function Pricing() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const isDark = mode === 'dark';
  const billing = useBillingColors();
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    API.get('/api/pricing').then(res => {
      if (res.data.success !== false) setRawData(res.data);
    }).catch(err => showError(err)).finally(() => setLoading(false));
  }, []);

  const models = useMemo(() => safeArray(rawData?.data).filter(m => m.model_name), [rawData]);
  const vendors = useMemo(() => safeArray(rawData?.vendors), [rawData]);
  const groupRatio = rawData?.group_ratio || {};

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach(v => { m[v.id] = v; });
    return m;
  }, [vendors]);

  const vendorCounts = useMemo(() => {
    const c = {};
    models.forEach(m => {
      const v = vendorMap[m.vendor_id];
      const name = v?.name || '未知';
      c[name] = (c[name] || 0) + 1;
    });
    return c;
  }, [models, vendorMap]);

  const groupList = useMemo(() => {
    const c = {};
    models.forEach(m => (m.enable_groups || []).forEach(g => { c[g] = (c[g] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [models]);

  const typeCounts = useMemo(() => {
    const c = { 0: 0, 1: 0 };
    models.forEach(m => { c[m.quota_type] = (c[m.quota_type] || 0) + 1; });
    return c;
  }, [models]);

  const filtered = useMemo(() => {
    return models.filter(m => {
      if (search && !m.model_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedVendor) {
        const v = vendorMap[m.vendor_id];
        if ((v?.name || '未知') !== selectedVendor) return false;
      }
      if (selectedGroup && !(m.enable_groups || []).includes(selectedGroup)) return false;
      if (selectedType !== null && m.quota_type !== selectedType) return false;
      return true;
    });
  }, [models, vendorMap, search, selectedVendor, selectedGroup, selectedType]);

  // Max price for bar visualization
  const maxPrice = useMemo(() => {
    const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit') || '500000');
    let max = 0;
    filtered.forEach(m => {
      const base = m.model_price > 0 ? (m.model_price * 2 / quotaPerUnit) : (m.model_ratio * 0.002);
      const out = m.model_price > 0 ? (base * m.completion_ratio) : (m.model_ratio * m.completion_ratio * 0.002);
      max = Math.max(max, base, out);
    });
    return max;
  }, [filtered]);

  const hasFilters = selectedVendor || selectedGroup || selectedType !== null || search;
  const resetFilters = () => { setSelectedVendor(null); setSelectedGroup(null); setSelectedType(null); setSearch(''); };

  const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit') || '500000');
  const calcPrice = (m, isOutput) => {
    const base = m.model_price > 0 ? (m.model_price * 2 / quotaPerUnit) : (m.model_ratio * 0.002);
    return isOutput ? (base * m.completion_ratio).toFixed(4) : base.toFixed(4);
  };

  const selectedVendorColor = selectedVendor ? (VENDOR_COLORS[selectedVendor] || theme.palette.primary.main) : theme.palette.primary.main;
  const vendorCount = Object.keys(vendorCounts).length;

  return (
    <>
      {globalAnimations}
      <Box sx={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: isDark
          ? theme.palette.background.default
          : `linear-gradient(180deg, #F0EBFF 0%, ${theme.palette.background.default} 30%)`,
      }}>
        {/* ── Animated background mesh ── */}
        <Box sx={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          opacity: isDark ? 0.3 : 0.15,
        }}>
          <FloatingOrb color={selectedVendorColor} size={400} top="-10%" left="-5%" delay={0} />
          <FloatingOrb color="#7C3AED" size={300} top="20%" left="70%" delay={2} />
          <FloatingOrb color="#3B82F6" size={250} top="60%" left="20%" delay={4} />
          <FloatingOrb color={selectedVendorColor} size={200} top="80%" left="80%" delay={1} />
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>

          {/* ── Back to Dashboard ── */}
          <Box
            onClick={() => navigate('/console')}
            sx={{
              position: 'fixed', top: 20, left: 20, zIndex: 1100,
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1.8, py: 0.8, borderRadius: '100px', cursor: 'pointer',
              backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.85 : 0.92),
              backdropFilter: 'blur(16px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
              boxShadow: `0 2px 12px ${alpha('#000', isDark ? 0.3 : 0.08)}`,
              transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                transform: 'translateX(-2px)',
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
              '&:active': { transform: 'scale(0.96)' },
            }}
          >
            <ArrowBack sx={{ fontSize: 17, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em', color: 'text.primary', fontSize: '0.75rem' }}>
              SKIAPI
            </Typography>
          </Box>

          {/* ── Theme Toggle ── */}
          <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 1100 }}>
            <IconButton
              onClick={toggleTheme}
              sx={{
                width: 42, height: 42,
                backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.85 : 0.92),
                backdropFilter: 'blur(16px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                boxShadow: `0 2px 12px ${alpha('#000', isDark ? 0.3 : 0.08)}`,
                transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
                '&:hover': {
                  backgroundColor: alpha(isDark ? '#FBBF24' : '#6366F1', 0.1),
                  transform: 'rotate(20deg) scale(1.05)',
                  boxShadow: `0 4px 20px ${alpha(isDark ? '#FBBF24' : '#6366F1', 0.2)}`,
                  borderColor: alpha(isDark ? '#FBBF24' : '#6366F1', 0.3),
                },
                '&:active': { transform: 'scale(0.92)' },
              }}
            >
              {isDark ? <LightMode sx={{ fontSize: 19, color: '#FBBF24' }} /> : <DarkMode sx={{ fontSize: 19, color: '#6366F1' }} />}
            </IconButton>
          </Box>

          {/* ── Hero Section ── */}
          <Box sx={{
            pt: { xs: 4, md: 6 }, pb: { xs: 3, md: 4 }, mb: 3, position: 'relative',
            animation: 'pricingFadeUp 0.6s ease-out',
          }}>
            {/* Gradient headline */}
            <Typography sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', mb: 1.5,
              background: isDark
                ? `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${selectedVendorColor} 50%, ${alpha(theme.palette.text.primary, 0.6)} 100%)`
                : `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${selectedVendorColor} 60%, ${theme.palette.primary.main} 100%)`,
              backgroundSize: '200% auto',
              animation: 'pricingGradient 8s ease infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {selectedVendor || t('模型定价')}
            </Typography>
            <Typography variant="body1" sx={{
              color: 'text.secondary', maxWidth: 520, lineHeight: 1.7, mb: 3.5,
            }}>
              {t('查看所有可用的AI模型供应商，包括众多知名供应商的模型。')}
            </Typography>

            {/* Vendor pills */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3 }}>
              <Box
                onClick={() => setSelectedVendor(null)}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.75,
                  px: 1.5, py: 0.6, borderRadius: 2.5, cursor: 'pointer',
                  border: `1.5px solid ${!selectedVendor ? alpha(theme.palette.primary.main, 0.5) : alpha(theme.palette.divider, 0.4)}`,
                  backgroundColor: !selectedVendor
                    ? alpha(theme.palette.primary.main, isDark ? 0.12 : 0.06)
                    : alpha(theme.palette.background.paper, isDark ? 0.4 : 0.7),
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                  ...(!selectedVendor && {
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, isDark ? 0.25 : 0.15)}`,
                  }),
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.4),
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                  },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                <Typography variant="caption" sx={{
                  fontWeight: !selectedVendor ? 700 : 500, fontSize: '0.76rem', lineHeight: 1,
                  color: !selectedVendor ? theme.palette.primary.main : 'text.primary',
                }}>
                  {t('全部')}
                </Typography>
                <Box sx={{
                  px: 0.6, py: 0.15, borderRadius: 1,
                  backgroundColor: !selectedVendor
                    ? alpha(theme.palette.primary.main, 0.15)
                    : alpha(theme.palette.text.primary, 0.06),
                }}>
                  <Typography variant="caption" sx={{
                    fontWeight: 700, fontSize: '0.6rem', lineHeight: 1,
                    color: !selectedVendor ? theme.palette.primary.main : 'text.secondary',
                  }}>
                    {models.length}
                  </Typography>
                </Box>
              </Box>
              {vendors.sort((a, b) => (vendorCounts[b.name] || 0) - (vendorCounts[a.name] || 0)).map(v => (
                <VendorPill
                  key={v.id}
                  vendor={v}
                  count={vendorCounts[v.name] || 0}
                  selected={selectedVendor === v.name}
                  onClick={() => setSelectedVendor(v.name === selectedVendor ? null : v.name)}
                  isDark={isDark}
                />
              ))}
            </Box>

            {/* Stats bar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
              animation: 'pricingFadeUp 0.6s ease-out 0.15s both',
            }}>
              <StatCard icon={Category} label={t('可用模型')} value={filtered.length} color={selectedVendorColor} />
              <StatCard icon={TrendingUp} label={t('供应商')} value={vendorCount} color="#7C3AED" />
              <StatCard icon={Speed} label={t('按量计费')} value={typeCounts[0]} color="#3B82F6" />
            </Stack>
          </Box>

          {/* ── Controls Bar ── */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap',
            p: 2, borderRadius: 3,
            backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.6 : 0.8),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
            boxShadow: `0 2px 12px ${alpha('#000', isDark ? 0.2 : 0.04)}`,
            animation: 'pricingFadeUp 0.6s ease-out 0.25s both',
          }}>
            <TextField
              placeholder={t('搜索模型...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
              }}
              sx={{
                flex: 1, minWidth: 200, maxWidth: 360,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: alpha(theme.palette.background.default, isDark ? 0.5 : 0.6),
                  borderRadius: 2.5,
                  '&:hover': { backgroundColor: alpha(theme.palette.background.default, isDark ? 0.7 : 0.8) },
                },
              }}
            />

            {/* Group filters */}
            <Stack direction="row" spacing={0.75} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {groupList.slice(0, 3).map(([name, count]) => {
                const sel = selectedGroup === name;
                return (
                  <Chip key={name} size="small" variant={sel ? 'filled' : 'outlined'}
                    label={`${name} ${count}`}
                    onClick={() => setSelectedGroup(name === selectedGroup ? null : name)}
                    sx={{
                      cursor: 'pointer', fontWeight: sel ? 700 : 500,
                      ...(sel && {
                        boxShadow: `0 1px 6px ${alpha(theme.palette.primary.main, 0.2)}`,
                      }),
                    }}
                  />
                );
              })}
            </Stack>

            <Box sx={{ flex: 1 }} />

            {/* Billing type */}
            <Stack direction="row" spacing={0.75} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              {[
                { type: 0, label: t('按量'), color: billing.usage },
                { type: 1, label: t('按次'), color: billing.request },
              ].map(({ type, label, color }) => {
                const sel = selectedType === type;
                return (
                  <Chip key={type} size="small" variant={sel ? 'filled' : 'outlined'}
                    label={`${label} ${typeCounts[type]}`}
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    sx={{
                      cursor: 'pointer', fontWeight: sel ? 700 : 500,
                      ...(sel && {
                        backgroundColor: color.bg, color: color.text, borderColor: 'transparent',
                        boxShadow: `0 1px 6px ${alpha(color.text, 0.15)}`,
                      }),
                    }}
                  />
                );
              })}
            </Stack>

            {hasFilters && (
              <Tooltip title={t('重置筛选')}>
                <IconButton size="small" onClick={resetFilters} sx={{
                  animation: 'pricingFadeUp 0.2s ease-out',
                  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  '&:hover': { borderColor: alpha(theme.palette.error.main, 0.4), color: 'error.main' },
                }}>
                  <RestartAlt sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, opacity: 0.5 }} />

            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
              <ToggleButton value="card"><Tooltip title={t('卡片视图')}><ViewModule sx={{ fontSize: 20 }} /></Tooltip></ToggleButton>
              <ToggleButton value="table"><Tooltip title={t('表格视图')}><ViewList sx={{ fontSize: 20 }} /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* ── Mobile filters ── */}
          <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'flex', md: 'none' }, mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
            {groupList.map(([name, count]) => {
              const sel = selectedGroup === name;
              return (
                <Chip key={name} size="small" variant={sel ? 'filled' : 'outlined'}
                  label={`${name} ${count}`}
                  onClick={() => setSelectedGroup(name === selectedGroup ? null : name)}
                  sx={{ cursor: 'pointer', fontWeight: sel ? 600 : 400 }}
                />
              );
            })}
          </Stack>

          {/* ── Loading ── */}
          {loading && (
            <Grid container spacing={2}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                  <Card sx={{ animation: `pricingPulse 1.5s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                        <Skeleton variant="rounded" width={42} height={42} sx={{ borderRadius: 2.5 }} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton width="75%" height={16} />
                          <Skeleton width="45%" height={12} sx={{ mt: 0.5 }} />
                        </Box>
                      </Stack>
                      <Skeleton variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: 2.5 }} />
                      <Stack direction="row" spacing={0.5}>
                        <Skeleton variant="rounded" width={65} height={22} sx={{ borderRadius: 1.5 }} />
                        <Skeleton variant="rounded" width={50} height={22} sx={{ borderRadius: 1.5 }} />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* ── Empty ── */}
          {!loading && filtered.length === 0 && (
            <EmptyState icon={StorefrontOutlined} title={t('暂无匹配模型')} description={t('尝试调整筛选条件或搜索关键词')} />
          )}

          {/* ── Card View ── */}
          {!loading && viewMode === 'card' && filtered.length > 0 && (
            <Grid container spacing={2}>
              {filtered.map((m, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={m.model_name + i}>
                  <ModelCard model={m} vendor={vendorMap[m.vendor_id]} maxPrice={maxPrice} index={i} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* ── Table View ── */}
          {!loading && viewMode === 'table' && filtered.length > 0 && (
            <Card sx={{
              animation: 'pricingFadeUp 0.4s ease-out',
              backdropFilter: 'blur(12px)',
              backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.8 : 0.95),
            }}>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>{t('模型')}</TableCell>
                    <TableCell>{t('供应商')}</TableCell>
                    <TableCell align="right">{t('输入 ($/M)')}</TableCell>
                    <TableCell align="right">{t('输出 ($/M)')}</TableCell>
                    <TableCell>{t('计费')}</TableCell>
                    <TableCell>{t('分组')}</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {filtered.map((m, i) => {
                      const v = vendorMap[m.vendor_id];
                      const vc = VENDOR_COLORS[v?.name] || theme.palette.primary.main;
                      return (
                        <TableRow key={i} hover sx={{
                          animation: `pricingFadeUp 0.3s ease-out both`,
                          animationDelay: `${Math.min(i * 0.02, 0.4)}s`,
                        }}>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <VendorIcon name={v?.name} icon={v?.icon} size={24} />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{m.model_name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={v?.name || t('未知')} size="small" variant="outlined"
                              sx={{ fontSize: '0.7rem', borderColor: alpha(vc, 0.3), color: vc }} />
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600, fontFamily: '"Geist Mono", monospace' }}>
                            ${calcPrice(m, false)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 600, fontFamily: '"Geist Mono", monospace' }}>
                            ${calcPrice(m, true)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={m.quota_type === 0 ? t('按量') : t('按次')}
                              size="small"
                              sx={{
                                fontSize: '0.7rem', border: 'none',
                                backgroundColor: m.quota_type === 0 ? billing.usage.bg : billing.request.bg,
                                color: m.quota_type === 0 ? billing.usage.text : billing.request.text,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {(m.enable_groups || []).join(', ')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* ── Footer ── */}
          <Box sx={{ textAlign: 'center', py: 5, mt: 4, opacity: 0.6 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.03em' }}>
              {t('价格以 USD 每百万 token 计算')} · per million tokens
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
}
