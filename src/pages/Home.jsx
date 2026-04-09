import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, Button, Stack, Container, alpha, useTheme, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ContentCopy, ArrowForward, Speed, Shield, Bolt, Public } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, copy } from '../utils';
import VendorIcon from '../components/common/VendorIcon';
import { useTranslation } from 'react-i18next';

/* ═══ Keyframes ═══ */
const styleId = 'skiapi-home-v5';
if (!document.getElementById(styleId)) {
  const s = document.createElement('style');
  s.id = styleId;
  s.textContent = `
    @keyframes s5-fadein  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
    @keyframes s5-float   { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
    @keyframes s5-blink   { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
    @keyframes s5-shimmer { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
    @keyframes s5-slide   { 0% { transform:translateX(0) } 100% { transform:translateX(-33.333%) } }
    @keyframes s5-pulse   { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.6; transform:scale(1.8) } }
    @keyframes s5-gradient { 0% { background-position:0% 50% } 50% { background-position:100% 50% } 100% { background-position:0% 50% } }
    @keyframes s5-glow-border {
      0%,100% { border-color: rgba(167,139,250,0.15) }
      50% { border-color: rgba(167,139,250,0.35) }
    }
    @keyframes s5-radar {
      0% { transform: rotate(0deg) }
      100% { transform: rotate(360deg) }
    }
    @keyframes s5-cursor-move {
      0%   { left: 30%; top: 60% }
      8%   { left: 15%; top: 15% }
      10%  { left: 15%; top: 15% }
      18%  { left: 50%; top: 8% }
      20%  { left: 50%; top: 8% }
      28%  { left: 70%; top: 40% }
      30%  { left: 70%; top: 40% }
      38%  { left: 45%; top: 65% }
      40%  { left: 45%; top: 65% }
      48%  { left: 20%; top: 80% }
      50%  { left: 20%; top: 80% }
      58%  { left: 80%; top: 20% }
      60%  { left: 80%; top: 20% }
      68%  { left: 60%; top: 75% }
      70%  { left: 60%; top: 75% }
      78%  { left: 35%; top: 30% }
      80%  { left: 35%; top: 30% }
      88%  { left: 55%; top: 50% }
      90%  { left: 55%; top: 50% }
      100% { left: 30%; top: 60% }
    }
    @keyframes s5-click-ring {
      0% { transform: scale(0.5); opacity: 1 }
      100% { transform: scale(2.5); opacity: 0 }
    }
    @keyframes s5-window-open {
      0% { transform: scale(0.8); opacity: 0 }
      100% { transform: scale(1); opacity: 1 }
    }
    @keyframes s5-typing {
      0%,100% { width: 0 }
      50% { width: 100% }
    }
    @keyframes s5-scroll-content {
      0% { transform: translateY(0) }
      100% { transform: translateY(-50%) }
    }
  `;
  document.head.appendChild(s);
}

/* ═══ Glassmorphic Bento Card ═══ */
function BentoCard({ children, sx = {}, delay = 0, glowBorder = false, ...props }) {
  const theme = useTheme();
  const dk = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      borderRadius: 4,
      border: `1px solid ${alpha(theme.palette.divider, dk ? 0.12 : 0.08)}`,
      bgcolor: alpha(theme.palette.background.paper, dk ? 0.5 : 0.7),
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      overflow: 'hidden', position: 'relative',
      transition: 'border-color 0.4s, box-shadow 0.4s',
      animation: `s5-fadein 0.7s ease-out ${delay}s both${glowBorder ? ', s5-glow-border 4s ease-in-out infinite' : ''}`,
      '&:hover': {
        borderColor: alpha(theme.palette.primary.main, 0.3),
        boxShadow: `0 8px 40px ${alpha(theme.palette.primary.main, dk ? 0.12 : 0.06)}`,
      },
      ...sx,
    }} {...props}>
      {children}
    </Box>
  );
}

/* ═══ Mini Desktop — Claude Computer Use Demo ═══ */
function ClaudeDesktop() {
  const theme = useTheme();
  const [step, setStep] = useState(0);

  // Cycle through steps: 0→1→2→3→4→0...
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1200),
      setTimeout(() => setStep(2), 3500),
      setTimeout(() => setStep(3), 6000),
      setTimeout(() => setStep(4), 8500),
      setTimeout(() => setStep(0), 11500),
    ];
    const loop = setInterval(() => {
      const base = Date.now();
      setTimeout(() => setStep(1), 0);
      setTimeout(() => setStep(2), 2300);
      setTimeout(() => setStep(3), 4800);
      setTimeout(() => setStep(4), 7300);
      setTimeout(() => setStep(0), 10300);
    }, 12000);
    return () => { timers.forEach(clearTimeout); clearInterval(loop); };
  }, []);

  return (
    <Box sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      bgcolor: '#0c0c0c',
    }}>
      {/* macOS-style title bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.8,
        bgcolor: '#1a1a1a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#ff5f57' }} />
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#febc2e' }} />
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#28c840' }} />
        <Typography sx={{
          ml: 1, fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)',
          fontFamily: '"Geist Mono", monospace',
        }}>
          Claude Desktop — computer_use active
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{
            width: 5, height: 5, borderRadius: '50%', bgcolor: '#d97706',
            boxShadow: '0 0 6px #d97706',
            animation: 's5-pulse 2s ease-out infinite',
          }} />
          <Typography sx={{
            fontSize: '0.45rem', color: '#d97706',
            fontFamily: '"Geist Mono", monospace',
          }}>
            LIVE
          </Typography>
        </Box>
      </Box>

      {/* Desktop area */}
      <Box sx={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f0f12 0%, #131320 50%, #0f1218 100%)',
      }}>
        {/* Desktop grid dots */}
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }} />

        {/* ── Window 1: Browser (visible at step >= 1) ── */}
        <Box sx={{
          position: 'absolute', top: '4%', left: '4%', width: '52%', height: '48%',
          borderRadius: 1.5, overflow: 'hidden',
          bgcolor: '#1e1e2e',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          {/* Browser tab bar */}
          <Box sx={{
            display: 'flex', alignItems: 'center', px: 1, py: 0.4,
            bgcolor: '#13131d', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Box sx={{
              px: 1, py: 0.3, borderRadius: 0.8,
              bgcolor: step >= 2 ? '#2a2a3e' : '#1e1e2e',
              border: step >= 2 ? '1px solid rgba(167,139,250,0.2)' : '1px solid transparent',
              transition: 'all 0.3s',
            }}>
              <Typography sx={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Geist Mono", monospace' }}>
                staging.internal:443
              </Typography>
            </Box>
            <Box sx={{ px: 1, py: 0.3, ml: 0.3 }}>
              <Typography sx={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', fontFamily: '"Geist Mono", monospace' }}>
                +
              </Typography>
            </Box>
          </Box>
          {/* Browser URL bar */}
          <Box sx={{
            mx: 0.8, my: 0.5, px: 1, py: 0.3,
            borderRadius: 1, bgcolor: '#0a0a14',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Typography sx={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.4)', fontFamily: '"Geist Mono", monospace' }}>
              🔒 https://staging.internal/admin/dashboard
            </Typography>
          </Box>
          {/* Browser content — simulated admin panel */}
          <Box sx={{ p: 1, display: 'flex', gap: 0.8 }}>
            {/* Sidebar */}
            <Box sx={{ width: '25%', display: 'flex', flexDirection: 'column', gap: 0.4 }}>
              {['Dashboard', 'Users', 'Settings', 'API Keys'].map((item, i) => (
                <Box key={i} sx={{
                  px: 0.6, py: 0.3, borderRadius: 0.5,
                  bgcolor: i === 0 ? 'rgba(167,139,250,0.15)' : 'transparent',
                }}>
                  <Typography sx={{ fontSize: '0.35rem', color: i === 0 ? '#a78bfa' : 'rgba(255,255,255,0.3)', fontFamily: '"Geist Mono", monospace' }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>
            {/* Main content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ height: 6, width: '60%', bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 0.5 }} />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box sx={{ height: 18, flex: 1, bgcolor: 'rgba(167,139,250,0.06)', borderRadius: 0.8, border: '1px solid rgba(167,139,250,0.1)' }} />
                <Box sx={{ height: 18, flex: 1, bgcolor: 'rgba(6,182,212,0.06)', borderRadius: 0.8, border: '1px solid rgba(6,182,212,0.1)' }} />
              </Box>
              <Box sx={{ height: 4, width: '80%', bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 0.5 }} />
              <Box sx={{ height: 4, width: '55%', bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 0.5 }} />
            </Box>
          </Box>
        </Box>

        {/* ── Window 2: Terminal (visible at step >= 2) ── */}
        <Box sx={{
          position: 'absolute', top: '28%', left: '28%', width: '56%', height: '46%',
          borderRadius: 1.5, overflow: 'hidden',
          bgcolor: '#0d0d0d',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          opacity: step >= 2 ? 1 : 0,
          transform: step >= 2 ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: step >= 2 ? 2 : 0,
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.5,
            bgcolor: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ff5f57' }} />
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#febc2e' }} />
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#28c840' }} />
            <Typography sx={{ ml: 0.5, fontSize: '0.4rem', color: 'rgba(255,255,255,0.35)', fontFamily: '"Geist Mono", monospace' }}>
              bash — claude@agent
            </Typography>
          </Box>
          <Box sx={{ p: 1, fontFamily: '"Geist Mono", monospace', fontSize: '0.4rem', lineHeight: 1.8 }}>
            <Box component="span" sx={{ color: '#06b6d4' }}>$ </Box>
            <Box component="span" sx={{ color: '#86efac' }}>nmap -sV --script vuln</Box>
            <Box component="span" sx={{ color: '#666' }}> staging:443</Box>
            <br />
            {step >= 3 && (
              <>
                <Box component="span" sx={{ color: '#7dd3fc' }}>PORT  STATE SERVICE</Box><br />
                <Box component="span" sx={{ color: '#e0e0e0' }}>443   open  https</Box><br />
                <Box component="span" sx={{ color: '#f87171', fontWeight: 600 }}>|_CVE-2024-53141: VULNERABLE</Box><br />
                <br />
                <Box component="span" sx={{ color: '#06b6d4' }}>$ </Box>
                <Box component="span" sx={{ color: '#86efac' }}>sqlmap</Box>
                <Box component="span" sx={{ color: '#e0e0e0' }}> -u "/api/users?id=1"</Box><br />
                <Box component="span" sx={{ color: '#f87171' }}>[!] blind SQL injection found</Box><br />
              </>
            )}
            {step >= 4 && (
              <>
                <br />
                <Box component="span" sx={{ color: '#06b6d4' }}>$ </Box>
                <Box component="span" sx={{ color: '#86efac' }}>cat</Box>
                <Box component="span" sx={{ color: '#e0e0e0' }}> /etc/shadow</Box><br />
                <Box component="span" sx={{ color: '#fca5a5' }}>root:$6$rK...truncated</Box><br />
                <br />
                <Box component="span" sx={{
                  color: '#ef4444', fontWeight: 700,
                  textShadow: '0 0 8px rgba(239,68,68,0.4)',
                }}>
                  [CRITICAL] 3 RCE vectors — report generated
                </Box>
              </>
            )}
            <Box component="span" sx={{ animation: 's5-blink 1s step-end infinite', color: step >= 4 ? '#ef4444' : '#a78bfa' }}>▌</Box>
          </Box>
        </Box>

        {/* ── Window 3: Claude thinking panel (step >= 3) ── */}
        <Box sx={{
          position: 'absolute', top: '2%', right: '4%', width: '34%', height: 'auto',
          borderRadius: 1.5, overflow: 'hidden',
          bgcolor: alpha('#d97706', 0.06),
          border: `1px solid ${alpha('#d97706', 0.25)}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${alpha('#d97706', 0.1)}`,
          opacity: step >= 3 ? 1 : 0,
          transform: step >= 3 ? 'scale(1)' : 'scale(0.9)',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 3,
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5,
            bgcolor: alpha('#d97706', 0.1),
            borderBottom: `1px solid ${alpha('#d97706', 0.15)}`,
          }}>
            <Box sx={{
              width: 16, height: 16, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              '& > *': { display: 'flex !important' },
            }}>
              <VendorIcon name="Claude" size={16} />
            </Box>
            <Typography sx={{ fontSize: '0.44rem', color: '#d97706', fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>
              Extended Thinking
            </Typography>
          </Box>
          <Box sx={{ p: 1, fontSize: '0.4rem', fontFamily: '"Geist Mono", monospace', color: alpha('#fff', 0.5), lineHeight: 1.8 }}>
            <Box sx={{ color: alpha('#d97706', 0.8), mb: 0.3 }}>▸ Analyzing attack surface...</Box>
            <Box sx={{ color: alpha('#fff', 0.4) }}>Found nginx/1.25 on :443</Box>
            <Box sx={{ color: alpha('#fff', 0.4) }}>Testing injection vectors...</Box>
            {step >= 4 && (
              <>
                <Box sx={{ color: '#f87171', mt: 0.3 }}>⚠ Path traversal confirmed</Box>
                <Box sx={{ color: '#f87171' }}>⚠ Privilege escalation possible</Box>
              </>
            )}
          </Box>
        </Box>

        {/* ── Animated cursor (SVG pointer) ── */}
        <Box sx={{
          position: 'absolute',
          animation: 's5-cursor-move 12s ease-in-out infinite',
          zIndex: 10,
          pointerEvents: 'none',
          ml: '-2px', mt: '-2px',
        }}>
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }}>
            <path d="M1 1L1 15L5.5 11L9.5 18L12 17L8 10L13.5 9.5L1 1Z" fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5"/>
          </svg>
          {/* Click ripple */}
          <Box sx={{
            position: 'absolute', top: 0, left: 0,
            width: 10, height: 10,
            borderRadius: '50%',
            border: '1.5px solid rgba(217,119,6,0.5)',
            animation: 's5-click-ring 1.5s ease-out infinite',
          }} />
        </Box>

        {/* ── Taskbar ── */}
        <Box sx={{
          position: 'absolute', bottom: 4, left: 4, right: 4,
          height: 22,
          bgcolor: 'rgba(10,10,15,0.85)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 1,
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', px: 1, gap: 1,
        }}>
          {/* App icons in taskbar */}
          <Box sx={{
            width: 14, height: 14, borderRadius: '3px',
            bgcolor: step >= 1 ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: step >= 1 ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent',
            transition: 'all 0.3s',
          }}>
            <Typography sx={{ fontSize: '0.35rem', color: '#a78bfa', lineHeight: 1 }}>🌐</Typography>
          </Box>
          <Box sx={{
            width: 14, height: 14, borderRadius: '3px',
            bgcolor: step >= 2 ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: step >= 2 ? '1px solid rgba(6,182,212,0.3)' : '1px solid transparent',
            transition: 'all 0.3s',
          }}>
            <Typography sx={{ fontSize: '0.35rem', lineHeight: 1 }}>⬛</Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.35rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"Geist Mono", monospace' }}>
              opus-4-6
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ═══ Model Icon Cell — Claude as centerpiece ═══ */
const SIDE_MODELS = ['OpenAI', 'Gemini', 'DeepSeek', 'Grok', 'Mistral', 'Qwen'];

function ModelGrid() {
  const theme = useTheme();
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2.5 }}>
      {/* Claude — the star */}
      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.2,
        animation: 's5-float 4s ease-in-out infinite',
      }}>
        {/* Outer spinning ring — all layers centered via inset positioning */}
        <Box sx={{
          position: 'relative',
          width: 82, height: 82,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Spinning glow ring */}
          <Box sx={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: `2px solid transparent`,
            borderTopColor: alpha('#d97706', 0.6),
            borderRightColor: alpha('#fb923c', 0.3),
            animation: 's5-radar 3s linear infinite',
            filter: `drop-shadow(0 0 6px ${alpha('#d97706', 0.3)})`,
          }} />
          {/* Static outer ring */}
          <Box sx={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: `1px solid ${alpha('#d97706', 0.15)}`,
          }} />
          {/* Ambient glow */}
          <Box sx={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            boxShadow: `0 0 30px ${alpha('#d97706', 0.15)}, 0 0 60px ${alpha('#d97706', 0.06)}`,
          }} />
          {/* Icon — lobehub Avatar already renders as circle */}
          <Box sx={{
            position: 'relative', zIndex: 1,
            width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            '& > *': { display: 'flex !important', alignItems: 'center', justifyContent: 'center' },
            '& .lobe-flex': { margin: '0 auto' },
          }}>
            <VendorIcon name="Claude" size={56} />
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{
            fontSize: '0.78rem', fontWeight: 700,
            fontFamily: '"Geist Mono", monospace',
            color: '#d97706',
          }}>
            Claude Opus 4.6
          </Typography>
          <Typography sx={{
            fontSize: '0.55rem', color: 'text.secondary',
            fontFamily: '"Geist Mono", monospace',
          }}>
            computer use · bash · extended thinking
          </Typography>
        </Box>
      </Box>
      {/* Other models */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 1.2, md: 1.8 }, flexWrap: 'wrap' }}>
        {SIDE_MODELS.map((name, i) => {
          const big = name === 'OpenAI' || name === 'Gemini';
          return (
            <Box key={name} sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4,
              animation: `s5-float ${3 + (i % 3) * 0.4}s ease-in-out ${0.3 + i * 0.1}s infinite`,
              transition: 'transform 0.2s', opacity: big ? 0.95 : 0.7,
              '&:hover': { transform: 'scale(1.15)', opacity: 1 },
            }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(big && {
                  filter: `drop-shadow(0 0 8px ${alpha(theme.palette.primary.main, 0.12)})`,
                }),
              }}>
                <VendorIcon name={name} size={big ? 32 : 22} />
              </Box>
              <Typography sx={{
                fontSize: big ? '0.55rem' : '0.48rem', color: big ? 'text.primary' : 'text.secondary',
                fontFamily: '"Geist Mono", monospace', fontWeight: big ? 600 : 500,
              }}>
                {name}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ═══ Live Status Dot ═══ */
function StatusDot() {
  return (
    <Box sx={{ position: 'relative', width: 8, height: 8 }}>
      <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: '#22c55e' }} />
      <Box sx={{
        position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: '#22c55e',
        animation: 's5-pulse 2s ease-out infinite',
      }} />
    </Box>
  );
}

/* ═══ Feature Card ═══ */
function FeatureCard({ icon: Icon, title, desc, delay }) {
  const theme = useTheme();
  return (
    <BentoCard delay={delay} sx={{ p: 3 }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: 2.5, mb: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.primary.main, 0.05)})`,
      }}>
        <Icon sx={{ fontSize: 22, color: 'primary.main' }} />
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{desc}</Typography>
    </BentoCard>
  );
}

/* ═══ Vendor Marquee ═══ */
const VENDORS = ['OpenAI', 'Claude', 'Gemini', 'DeepSeek', 'Grok', 'Mistral', 'Qwen', '智谱', 'Meta', 'Cohere', 'Moonshot', 'Perplexity'];

function VendorShowcase() {
  const { t } = useTranslation();
  const tripled = [...VENDORS, ...VENDORS, ...VENDORS];
  return (
    <Box sx={{ position: 'relative', zIndex: 1, py: 4, overflow: 'hidden' }}>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', letterSpacing: 1.5, fontWeight: 500, mb: 3 }}>
        {t('支持众多的大模型供应商')}
      </Typography>
      <Box sx={{ overflow: 'hidden', py: 1 }}>
        <Box sx={{ display: 'flex', animation: 's5-slide 50s linear infinite', width: 'fit-content' }}>
          {tripled.map((v, i) => (
            <Box key={i} sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.8,
              mx: 3, flexShrink: 0, opacity: 0.7, transition: 'transform 0.2s, opacity 0.2s',
              '&:hover': { transform: 'scale(1.12)', opacity: 1 },
            }}>
              <VendorIcon name={v} size={40} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', fontWeight: 500 }}>{v}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
  const dk = theme.palette.mode === 'dark';
  const ac = theme.palette.primary.main;

  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const onMove = useCallback((e) => {
    setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);
  useEffect(() => {
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [onMove]);

  const copyApi = () => { copy(apiBase); showSuccess(t('API 地址已复制')); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', overflow: 'hidden', position: 'relative' }}>

      {/* ── Background ── */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Box sx={{
          position: 'absolute', width: '60vw', height: '60vw', top: '-20%',
          left: `${8 + (mouse.x - 0.5) * 10}%`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(ac, dk ? 0.1 : 0.05)} 0%, transparent 70%)`,
          filter: 'blur(80px)', transition: 'left 0.8s ease-out',
        }} />
        <Box sx={{
          position: 'absolute', width: '50vw', height: '50vw', top: '40%',
          right: `${-5 + (mouse.x - 0.5) * -8}%`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#06b6d4', dk ? 0.07 : 0.03)} 0%, transparent 70%)`,
          filter: 'blur(80px)', transition: 'right 0.8s ease-out',
        }} />
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(${alpha(theme.palette.divider, dk ? 0.1 : 0.06)} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }} />
      </Box>

      {/* ════════════════════ HERO BENTO GRID ════════════════════ */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 4, md: 6 }, pb: 2 }}>

        <Typography sx={{
          textAlign: 'center', mb: 4,
          fontSize: '0.7rem', letterSpacing: 2,
          fontFamily: '"Geist Mono", monospace',
          color: 'text.secondary',
          animation: 's5-fadein 0.5s ease-out both',
        }}>
          {t('home_chip')}
        </Typography>

        {/* ── Bento Grid ── */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr' },
          gridTemplateRows: { md: 'auto auto' },
          gap: 2, mb: 2,
        }}>
          {/* ▸ MAIN CARD */}
          <BentoCard delay={0.1} glowBorder sx={{
            gridRow: { md: 'span 2' },
            p: { xs: 3, md: 5 },
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <Typography sx={{
              fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.5rem' },
              fontWeight: 900, lineHeight: 1.1, mb: 2, letterSpacing: '-0.03em',
              background: `linear-gradient(135deg, ${ac} 0%, #06b6d4 50%, ${ac} 100%)`,
              backgroundSize: '200% 200%',
              animation: 's5-gradient 6s ease infinite',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              SKIAPI
            </Typography>

            <Typography sx={{
              fontSize: { xs: '1rem', md: '1.15rem' },
              color: 'text.secondary', mb: 3, maxWidth: 420, lineHeight: 1.7,
              fontWeight: 400,
            }}>
              {t('home_subtitle')}
            </Typography>

            <Box sx={{
              display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
              borderRadius: 2.5, overflow: 'hidden', mb: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
              bgcolor: alpha(theme.palette.background.default, 0.5),
            }}>
              <Box sx={{ px: 2, py: 1.2 }}>
                <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, fontSize: '0.8rem' }}>
                  {apiBase}
                </Typography>
              </Box>
              <Box sx={{
                px: 1.5, py: 1.2, bgcolor: alpha(ac, 0.06),
                borderLeft: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
              }}>
                <Typography sx={{ fontFamily: '"Geist Mono", monospace', color: 'primary.main', fontWeight: 500, fontSize: '0.8rem' }}>
                  /v1
                </Typography>
              </Box>
              <Tooltip title={t('复制 API 地址')}>
                <IconButton onClick={copyApi} size="small" sx={{ mx: 0.5 }}>
                  <ContentCopy sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" color="primary"
                endIcon={<ArrowForward sx={{ fontSize: 15 }} />}
                onClick={() => navigate(isLoggedIn ? '/console' : '/login')}
                sx={{ px: 3, '&:hover': { transform: 'translateY(-1px)' } }}>
                {isLoggedIn ? t('进入控制台') : t('获取密钥')}
              </Button>
              <Button variant="outlined"
                onClick={() => navigate('/pricing')}
                sx={{ px: 3, '&:hover': { transform: 'translateY(-1px)' } }}>
                {t('模型广场')}
              </Button>
            </Stack>
          </BentoCard>

          {/* ▸ MODEL GRID */}
          <BentoCard delay={0.2}>
            <ModelGrid />
          </BentoCard>

          {/* ▸ CLAUDE DESKTOP — computer use demo */}
          <BentoCard delay={0.3} sx={{ minHeight: 280, borderRadius: 2.5, '& > *': { borderRadius: 'inherit' } }}>
            <ClaudeDesktop />
          </BentoCard>
        </Box>

        {/* ── Stats Row ── */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2, mb: 2,
        }}>
          {[
            { value: '50+', label: t('支持模型') },
            { value: '10+', label: t('供应商') },
            { value: '99.9%', label: t('可用性') },
            { value: '<100ms', label: t('平均延迟') },
          ].map((s, i) => (
            <BentoCard key={i} delay={0.4 + i * 0.08} sx={{
              p: 2.5, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
            }}>
              <Typography sx={{
                fontSize: '1.5rem', fontWeight: 800,
                fontFamily: '"Geist Mono", monospace',
                background: `linear-gradient(135deg, ${ac}, #06b6d4)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>{s.label}</Typography>
            </BentoCard>
          ))}
        </Box>

        {/* ── Status bar ── */}
        <BentoCard delay={0.7} sx={{
          p: 2, mb: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <StatusDot />
          <Typography sx={{
            fontSize: '0.75rem', color: 'text.secondary',
            fontFamily: '"Geist Mono", monospace',
          }}>
            All systems operational
          </Typography>
          <Box sx={{ width: 1, height: 14, bgcolor: alpha(theme.palette.divider, 0.2) }} />
          <Typography sx={{
            fontSize: '0.75rem', color: 'text.secondary',
            fontFamily: '"Geist Mono", monospace',
          }}>
            {t('home_chip')}
          </Typography>
        </BentoCard>
      </Container>

      <VendorShowcase />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 6 }}>
        <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 800, mb: 1 }}>
          {t('为什么选择 SKIAPI')}
        </Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', mb: 5 }}>
          {t('home_features_sub')}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <FeatureCard icon={Bolt}   title={t('极速响应')}   desc={t('全球边缘节点加速，毫秒级延迟转发，自动负载均衡')} delay={0.1} />
          <FeatureCard icon={Shield} title={t('稳定可靠')}   desc={t('多渠道冗余备份，自动故障切换，99.9% 可用性')}     delay={0.15} />
          <FeatureCard icon={Speed}  title={t('灵活计费')}   desc={t('按量/按次灵活计费，支持月卡订阅，价格透明公开')}   delay={0.2} />
          <FeatureCard icon={Public} title={t('全模型覆盖')} desc={t('OpenAI、Claude、Gemini、DeepSeek 等 50+ 模型全覆盖')} delay={0.25} />
        </Box>
      </Container>

      <Box sx={{
        position: 'relative', zIndex: 1, py: 4, textAlign: 'center',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          © {new Date().getFullYear()} SKIAPI. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
