import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Stack, Container, Chip, alpha, useTheme, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PlayArrow, Description, ContentCopy, ArrowForward, Speed, Shield, Bolt, Public } from '@mui/icons-material';
import { API } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, copy } from '../utils';
import VendorIcon from '../components/common/VendorIcon';
import { useTranslation } from 'react-i18next';

// ─── CSS Keyframes (injected once) ──────────────────────────────────────────
const styleId = 'skiapi-home-anims';
if (!document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes sk-float { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(3deg); } }
    @keyframes sk-pulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } }
    @keyframes sk-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes sk-slide { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
    @keyframes sk-fadein { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes sk-glow { 0%,100% { box-shadow: 0 0 20px rgba(167,139,250,0.3); } 50% { box-shadow: 0 0 40px rgba(167,139,250,0.6); } }
  `;
  document.head.appendChild(style);
}

// ─── Floating Orb ───────────────────────────────────────────────────────────
function Orb({ size, color, top, left, delay }) {
  return (
    <Box sx={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle, ${alpha(color, 0.3)}, transparent 70%)`,
      top, left, filter: 'blur(40px)', pointerEvents: 'none',
      animation: `sk-float ${6 + delay}s ease-in-out infinite ${delay}s`,
    }} />
  );
}

// ─── Feature Card ───────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, delay }) {
  const theme = useTheme();
  return (
    <Box sx={{
      p: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
      bgcolor: alpha(theme.palette.background.paper, 0.8), backdropFilter: 'blur(20px)',
      transition: 'transform 0.3s, border-color 0.3s, box-shadow 0.3s',
      '&:hover': { transform: 'translateY(-4px)', borderColor: alpha(theme.palette.primary.main, 0.4), boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}` },
      animation: `sk-fadein 0.6s ease-out ${delay}s both`,
    }}>
      <Box sx={{
        width: 48, height: 48, borderRadius: 3, mb: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.primary.main, 0.05)})`,
      }}>
        <Icon sx={{ fontSize: 24, color: 'primary.main' }} />
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{desc}</Typography>
    </Box>
  );
}

// ─── Vendor list for marquee ─────────────────────────────────────────────────
const VENDORS = [
  'OpenAI', 'Claude', 'Gemini', 'DeepSeek', 'Grok', 'Mistral',
  'Qwen', '智谱', 'Meta', 'Cohere', 'Moonshot', 'Perplexity',
];

// ─── Vendor Showcase (marquee / grid toggle) ────────────────────────────────
function VendorShowcase() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [grid, setGrid] = useState(false);
  // Triple the list for seamless loop
  const tripled = [...VENDORS, ...VENDORS, ...VENDORS];

  return (
    <Box sx={{ position: 'relative', zIndex: 1, py: 5, overflow: 'hidden' }}>
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', letterSpacing: 1.5, fontWeight: 500 }}>{t('支持众多的大模型供应商')}</Typography>
        <IconButton size="small" onClick={() => setGrid(g => !g)}
          sx={{ border: 1, borderColor: 'divider', width: 28, height: 28 }}>
          {grid ? <ArrowForward sx={{ fontSize: 14 }} /> : <Public sx={{ fontSize: 14 }} />}
        </IconButton>
      </Stack>

      {grid ? (
        /* ── Grid mode ── */
        <Container maxWidth="sm">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
            {VENDORS.map((v, i) => (
              <Box key={i} sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.8,
                transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.12)' },
              }}>
                <VendorIcon name={v} size={48} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 500 }}>{v}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      ) : (
        /* ── Marquee mode (seamless) ── */
        <Box sx={{ overflow: 'hidden', py: 1 }}>
          <Box sx={{ display: 'flex', animation: 'sk-slide 50s linear infinite', width: 'fit-content' }}>
            {tripled.map((v, i) => (
              <Box key={i} sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.8,
                mx: 3, flexShrink: 0, transition: 'transform 0.2s, opacity 0.2s', opacity: 0.8,
                '&:hover': { transform: 'scale(1.12)', opacity: 1 },
              }}>
                <VendorIcon name={v} size={44} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 500 }}>{v}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const apiBase = typeof window !== 'undefined' ? window.location.origin : '';

  const copyApi = () => { copy(apiBase); showSuccess(t('API 地址已复制')); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', overflow: 'hidden', position: 'relative' }}>

      {/* ── Animated background ── */}
      <Box sx={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
        background: `radial-gradient(ellipse at 20% 50%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 20%, ${alpha('#7c3aed', 0.06)} 0%, transparent 50%),
                     radial-gradient(ellipse at 50% 80%, ${alpha('#06b6d4', 0.05)} 0%, transparent 50%)`,
      }}>
        <Orb size={400} color={theme.palette.primary.main} top="10%" left="15%" delay={0} />
        <Orb size={300} color="#7c3aed" top="60%" left="70%" delay={2} />
        <Orb size={250} color="#06b6d4" top="30%" left="80%" delay={4} />
        <Orb size={200} color="#f59e0b" top="70%" left="10%" delay={1} />
      </Box>

      {/* ── Hero ── */}
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, pt: { xs: 8, md: 12 }, pb: 4, textAlign: 'center' }}>
        <Box sx={{ animation: 'sk-fadein 0.8s ease-out' }}>
          <Chip icon={<Bolt sx={{ fontSize: 16 }} />} label={t('高性能 AI API 中转平台')} size="small" variant="outlined"
            sx={{ mb: 3, fontSize: '0.8rem', py: 0.5,
              borderColor: alpha(theme.palette.primary.main, 0.3), color: 'primary.main',
              '& .MuiChip-icon': { color: 'inherit' } }} />

          <Typography sx={{
            fontSize: { xs: '2.5rem', md: '4rem' }, fontWeight: 900, lineHeight: 1.1, mb: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #7c3aed 30%, #06b6d4 60%, ${theme.palette.primary.main} 100%)`,
            backgroundSize: '300% 300%', animation: 'sk-gradient 8s ease infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {t('统一的')}<br />{t('大模型接口网关')}
          </Typography>

          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4, maxWidth: 500, mx: 'auto', fontWeight: 400, lineHeight: 1.6, animation: 'sk-fadein 0.8s ease-out 0.2s both' }}>{t('更好的价格，更好的稳定性')}<br />{t('只需要将模型基址替换为：')}</Typography>
        </Box>

        {/* ── API Endpoint Display ── */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0, mb: 4,
          borderRadius: 3, overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.6), backdropFilter: 'blur(20px)',
          animation: 'sk-fadein 0.8s ease-out 0.4s both',
        }}>
          <Box sx={{ px: 3, py: 1.5 }}>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{apiBase}</Typography>
          </Box>
          <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08), borderLeft: `1px solid ${alpha(theme.palette.divider, 0.3)}` }}>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 500 }}>/v1/chat/completions</Typography>
          </Box>
          <Tooltip title={t('复制 API 地址')}>
            <IconButton onClick={copyApi} sx={{ mx: 1 }}><ContentCopy sx={{ fontSize: 18 }} /></IconButton>
          </Tooltip>
        </Box>

        {/* ── CTA Buttons ── */}
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2, animation: 'sk-fadein 0.8s ease-out 0.6s both' }}>
          <Button variant="contained" color="primary" size="large"
            endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
            onClick={() => navigate(isLoggedIn ? '/console' : '/login')}
            sx={{ px: 4, '&:hover': { transform: 'translateY(-1px)' } }}>
            {isLoggedIn ? t('进入控制台') : t('获取密钥')}
          </Button>
          <Button variant="outlined" size="large"
            onClick={() => navigate('/pricing')}
            sx={{ px: 4, backdropFilter: 'blur(10px)',
              '&:hover': { transform: 'translateY(-1px)' } }}>{t('模型广场')}</Button>
        </Stack>
      </Container>

      {/* ── Vendor Logos ── */}
      <VendorShowcase />

      {/* ── Features ── */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
        <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 800, mb: 1 }}>{t('为什么选择 SKIAPI')}</Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', mb: 6 }}>{t('一站式 AI 模型接口服务')}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2.5 }}>
          <FeatureCard icon={Bolt} title={t('极速响应')} desc={t('全球边缘节点加速，毫秒级延迟转发，自动负载均衡')} delay={0.1} />
          <FeatureCard icon={Shield} title={t('稳定可靠')} desc={t('多渠道冗余备份，自动故障切换，99.9% 可用性')} delay={0.2} />
          <FeatureCard icon={Speed} title={t('灵活计费')} desc={t('按量/按次灵活计费，支持月卡订阅，价格透明公开')} delay={0.3} />
          <FeatureCard icon={Public} title={t('全模型覆盖')} desc={t('OpenAI、Claude、Gemini、DeepSeek 等 50+ 模型全覆盖')} delay={0.4} />
        </Box>
      </Container>

      {/* ── Stats ── */}
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, py: 6 }}>
        <Box sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3,
          p: 4, borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.7), backdropFilter: 'blur(20px)',
        }}>
          {[
            { value: '50+', label: t('支持模型') },
            { value: '10+', label: t('供应商') },
            { value: '99.9%', label: t('可用性') },
            { value: '<100ms', label: t('平均延迟') },
          ].map((s, i) => (
            <Box key={i} sx={{ textAlign: 'center', animation: `sk-fadein 0.6s ease-out ${0.5 + i * 0.1}s both` }}>
              <Typography variant="h4" sx={{
                fontWeight: 900,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, #7c3aed)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{s.value}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Container>

      {/* ── Footer ── */}
      <Box sx={{ position: 'relative', zIndex: 1, py: 4, textAlign: 'center', borderTop: `1px solid ${alpha(theme.palette.divider, 0.15)}` }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          © {new Date().getFullYear()} SKIAPI. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
