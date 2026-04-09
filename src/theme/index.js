import { createTheme, alpha } from '@mui/material/styles';
import { Slide } from '@mui/material';
import { forwardRef, createElement } from 'react';

// ─── Gemini-Inspired M3 Tokens ─────────────────────────────────────────────
// Refined AI platform aesthetic with tonal elevation and generous rounding.
const TOKENS_DARK = {
  canvas:        '#0F0F0F',       // near-black, OLED-friendly
  surface:       '#1A1A1A',       // surface container
  surfaceRaised: '#242424',       // surface container high
  surfaceBright: '#2E2E2E',       // surface container highest
  surfaceHover:  '#1E1E1E',
  border:        '#2E2E2E',
  borderStrong:  '#3D3D3D',
  text:          '#E3E3E3',
  textMuted:     '#A0A0A0',
  textSubtle:    '#6E6E6E',
  accent:        '#A78BFA',       // violet-400 — Gemini-esque soft purple
  accentDim:     '#7C3AED',       // violet-600 — for tonal surfaces
  accentInk:     '#FFFFFF',
  accentSurface: '#1E1533',       // tinted surface for selected states
  success:       '#34D399',
  warn:          '#FBBF24',
  error:         '#F87171',
  info:          '#60A5FA',
  scrim:         'rgba(0,0,0,0.64)',
};

const TOKENS_LIGHT = {
  canvas:        '#F8F8FA',
  surface:       '#FFFFFF',
  surfaceRaised: '#F0F0F3',
  surfaceBright: '#E8E8EC',
  surfaceHover:  '#F4F4F6',
  border:        '#E0E0E5',
  borderStrong:  '#C8C8D0',
  text:          '#1A1A1A',
  textMuted:     '#5C5C66',
  textSubtle:    '#8C8C96',
  accent:        '#7C3AED',       // violet-600
  accentDim:     '#6D28D9',       // violet-700
  accentInk:     '#FFFFFF',
  accentSurface: '#F0EBFF',       // tinted surface for selected states
  success:       '#16A34A',
  warn:          '#D97706',
  error:         '#DC2626',
  info:          '#2563EB',
  scrim:         'rgba(0,0,0,0.32)',
};

// ─── Fonts ──────────────────────────────────────────────────────────────────
const FONT_BODY    = '"Geist", "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const FONT_MONO    = '"Geist Mono", "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

// ─── Motion ─────────────────────────────────────────────────────────────────
const EASE = 'cubic-bezier(0.2, 0, 0, 1)';  // M3 standard easing
const EASE_EMPHASIZED = 'cubic-bezier(0.05, 0.7, 0.1, 1)';  // M3 emphasized
const durations = { micro: 100, short: 200, medium: 300, long: 500 };

// ─── Slide Up transition for Dialogs ────────────────────────────────────────
const SlideUp = forwardRef(function SlideUp(props, ref) {
  return createElement(Slide, { direction: 'up', ref, ...props });
});

// ─── Theme factory ──────────────────────────────────────────────────────────
export function createAppTheme(mode = 'dark') {
  const t = mode === 'dark' ? TOKENS_DARK : TOKENS_LIGHT;

  return createTheme({
    palette: {
      mode,
      primary: { main: t.accent, contrastText: t.accentInk },
      secondary: { main: t.textMuted, contrastText: t.surface },
      error: { main: t.error, contrastText: '#fff' },
      warning: { main: t.warn, contrastText: '#fff' },
      info: { main: t.info, contrastText: '#fff' },
      success: { main: t.success, contrastText: '#fff' },
      background: { default: t.canvas, paper: t.surface },
      text: { primary: t.text, secondary: t.textMuted, disabled: t.textSubtle },
      divider: t.border,
      action: {
        hover: alpha(t.text, mode === 'dark' ? 0.08 : 0.04),
        selected: alpha(t.accent, 0.12),
        focus: alpha(t.accent, 0.16),
        disabled: alpha(t.text, 0.38),
        disabledBackground: alpha(t.text, 0.12),
      },
      // Custom design tokens exposed for direct use
      tokens: t,
      // Backwards-compat alias
      m3: {
        primary: t.accent, onPrimary: t.accentInk,
        surface: t.surface, onSurface: t.text,
        surfaceVariant: t.surfaceRaised, onSurfaceVariant: t.textMuted,
        surfaceContainerLow: t.surface, surfaceContainer: t.surfaceRaised,
        surfaceContainerHigh: t.surfaceBright, surfaceContainerHighest: t.borderStrong,
        outline: t.border, outlineVariant: t.border,
        background: t.canvas, scrim: t.scrim,
      },
    },

    shape: { borderRadius: 12 },  // M3 generous rounding

    typography: {
      fontFamily: FONT_BODY,
      htmlFontSize: 16,
      fontSize: 14,
      // Display scale — sans-serif, clean
      displayLarge:  { fontFamily: FONT_BODY, fontSize: '3.5rem',  fontWeight: 400, lineHeight: 1.1,  letterSpacing: '-0.02em' },
      displayMedium: { fontFamily: FONT_BODY, fontSize: '2.75rem', fontWeight: 400, lineHeight: 1.12, letterSpacing: '-0.015em' },
      displaySmall:  { fontFamily: FONT_BODY, fontSize: '2.25rem', fontWeight: 400, lineHeight: 1.16, letterSpacing: '-0.01em' },
      // Headlines
      h1: { fontFamily: FONT_BODY, fontSize: '2rem',    fontWeight: 500, lineHeight: 1.2,  letterSpacing: '-0.01em' },
      h2: { fontFamily: FONT_BODY, fontSize: '1.75rem', fontWeight: 500, lineHeight: 1.2,  letterSpacing: '-0.005em' },
      h3: { fontFamily: FONT_BODY, fontSize: '1.5rem',  fontWeight: 500, lineHeight: 1.25 },
      h4: { fontFamily: FONT_BODY, fontSize: '1.125rem',fontWeight: 500, lineHeight: 1.35 },
      h5: { fontFamily: FONT_BODY, fontSize: '1rem',    fontWeight: 500, lineHeight: 1.4 },
      h6: { fontFamily: FONT_BODY, fontSize: '0.875rem',fontWeight: 600, lineHeight: 1.45, letterSpacing: '0.005em' },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.5 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5 },
      body1: { fontSize: '0.875rem', lineHeight: 1.6 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5, color: t.textMuted },
      button: { fontSize: '0.8125rem', fontWeight: 500, letterSpacing: '0.01em' },
      caption: { fontSize: '0.75rem', lineHeight: 1.4, letterSpacing: '0.02em', color: t.textMuted },
      overline: { fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.textMuted },
      // Mono — for numbers, tokens, IDs
      mono: { fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1, "zero" 1' },
    },

    transitions: {
      easing: { easeInOut: EASE, easeOut: EASE_EMPHASIZED, easeIn: EASE, sharp: EASE },
      duration: {
        shortest: durations.micro, shorter: durations.short, short: durations.short,
        standard: durations.medium, complex: durations.long,
        enteringScreen: durations.medium, leavingScreen: durations.short,
      },
    },

    components: {
      // ── Baseline ──────────────────────────────────────────────────────────
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            '--canvas': t.canvas,
            '--surface': t.surface,
            '--surface-raised': t.surfaceRaised,
            '--border': t.border,
            '--text': t.text,
            '--text-muted': t.textMuted,
            '--accent': t.accent,
            '--font-body': FONT_BODY,
            '--font-mono': FONT_MONO,
          },
          html: { fontFeatureSettings: '"ss01" 1, "cv11" 1' },
          body: {
            backgroundColor: t.canvas,
            color: t.text,
            fontFamily: FONT_BODY,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          'input, textarea': { fontFamily: FONT_BODY },
          'code, pre, kbd, samp': { fontFamily: FONT_MONO },
          '.MuiTableCell-root, .mono': { fontVariantNumeric: 'tabular-nums' },
          '::-webkit-scrollbar': { width: 6, height: 6 },
          '::-webkit-scrollbar-track': { background: 'transparent' },
          '::-webkit-scrollbar-thumb': { backgroundColor: alpha(t.text, 0.15), borderRadius: 3 },
          '::-webkit-scrollbar-thumb:hover': { backgroundColor: alpha(t.text, 0.25) },
          '::selection': { backgroundColor: alpha(t.accent, 0.3), color: t.text },
        },
      },

      // ── Button — refined glass ────────────────────────────────────────────
      MuiButton: {
        defaultProps: { disableElevation: true, disableRipple: false },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            borderRadius: 9,
            padding: '7px 18px',
            minHeight: 36,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: `all ${durations.short}ms ${EASE}`,
            '&:active': { transform: 'scale(0.97)', transition: 'transform 80ms ease' },
          },
          sizeSmall: { minHeight: 30, padding: '5px 14px', fontSize: '0.75rem', borderRadius: 7 },
          sizeLarge: { minHeight: 42, padding: '10px 24px', fontSize: '0.875rem', borderRadius: 10 },
          contained: mode === 'dark' ? {
            // ── Dark mode: frosted glass panel ──
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#F0F0F0',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderColor: 'rgba(255,255,255,0.2)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
              transform: 'translateY(-0.5px)',
            },
          } : {
            // ── Light mode: solid dark with subtle depth ──
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
            '&:hover': {
              backgroundColor: '#111111',
              boxShadow: '0 3px 10px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
              transform: 'translateY(-0.5px)',
            },
          },
          containedPrimary: mode === 'dark' ? {
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#F0F0F0',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderColor: 'rgba(255,255,255,0.2)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
              transform: 'translateY(-0.5px)',
            },
          } : {
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
            '&:hover': {
              backgroundColor: '#111111',
              boxShadow: '0 3px 10px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
              transform: 'translateY(-0.5px)',
            },
          },
          outlined: {
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : t.border,
            color: t.text,
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'transparent',
            '&:hover': {
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : t.textMuted,
              backgroundColor: alpha(t.text, 0.05),
            },
          },
          text: {
            color: t.textMuted,
            '&:hover': { backgroundColor: alpha(t.text, 0.06), color: t.text },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: '50%',
            color: t.textMuted,
            transition: `all ${durations.short}ms ${EASE}`,
            '&:hover': {
              backgroundColor: alpha(t.text, 0.08),
              color: t.text,
            },
            '&:active': { transform: 'scale(0.92)' },
          },
          sizeSmall: { padding: 6 },
        },
      },

      // ── FAB ───────────────────────────────────────────────────────────────
      MuiFab: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: `0 2px 8px ${alpha('#000', 0.2)}`,
            textTransform: 'none',
          },
        },
      },

      // ── Card — generous rounding, tonal surface ──────────────────────────
      MuiCard: {
        defaultProps: { variant: 'outlined', elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 16,
            borderColor: t.border,
            backgroundColor: t.surface,
            backgroundImage: 'none',
            transition: `border-color ${durations.short}ms ${EASE}, box-shadow ${durations.medium}ms ${EASE}`,
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none', backgroundColor: t.surface },
          outlined: { borderColor: t.border },
          rounded: { borderRadius: 16 },
        },
      },

      // ── Table ─────────────────────────────────────────────────────────────
      MuiTable: {
        styleOverrides: {
          root: { borderCollapse: 'separate', borderSpacing: 0 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${t.border}`,
            padding: '12px 16px',
            fontSize: '0.8125rem',
            color: t.text,
          },
          head: {
            fontWeight: 500,
            fontSize: '0.75rem',
            letterSpacing: '0.02em',
            color: t.textMuted,
            backgroundColor: 'transparent',
            borderBottom: `1px solid ${t.border}`,
            padding: '12px 16px',
          },
          sizeSmall: { padding: '8px 12px' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: `background-color ${durations.short}ms ${EASE}`,
            '&.MuiTableRow-hover:hover': { backgroundColor: alpha(t.text, 0.04) },
            '&:last-child td': { borderBottom: 'none' },
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: { borderTop: `1px solid ${t.border}`, fontSize: '0.75rem', color: t.textMuted },
          selectLabel: { fontSize: '0.75rem' },
          displayedRows: { fontSize: '0.75rem', fontFamily: FONT_MONO },
        },
      },

      // ── Chip — pill shape, tonal fills ────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            height: 28,
            fontSize: '0.75rem',
            fontWeight: 500,
            border: `1px solid ${t.border}`,
            backgroundColor: alpha(t.text, 0.04),
            color: t.textMuted,
            transition: `all ${durations.micro}ms ${EASE}`,
            '& .MuiChip-label': { padding: '0 10px' },
            '& .MuiChip-icon': { fontSize: 15, marginLeft: 6, marginRight: -4 },
            '&.MuiChip-clickable:hover': {
              borderColor: alpha(t.accent, 0.4),
              backgroundColor: alpha(t.accent, 0.08),
              transform: 'translateY(-1px)',
              boxShadow: `0 2px 6px ${alpha(t.accent, 0.1)}`,
            },
            '&.MuiChip-clickable:active': { transform: 'scale(0.97)' },
          },
          sizeSmall: { height: 24, fontSize: '0.6875rem' },
          filled: {
            backgroundColor: alpha(t.accent, 0.12),
            color: t.accent,
            border: 'none',
            fontWeight: 600,
          },
          colorSuccess: { borderColor: alpha(t.success, 0.3), color: t.success, backgroundColor: alpha(t.success, 0.1) },
          colorError:   { borderColor: alpha(t.error, 0.3),   color: t.error,   backgroundColor: alpha(t.error, 0.1) },
          colorWarning: { borderColor: alpha(t.warn, 0.3),    color: t.warn,    backgroundColor: alpha(t.warn, 0.1) },
          colorInfo:    { borderColor: alpha(t.info, 0.3),     color: t.info,    backgroundColor: alpha(t.info, 0.1) },
          outlined: { backgroundColor: 'transparent' },
        },
      },

      // ── Inputs — rounded, clean ───────────────────────────────────────────
      MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontSize: '0.8125rem',
            backgroundColor: mode === 'dark' ? alpha(t.text, 0.04) : t.surface,
            transition: `border-color ${durations.short}ms ${EASE}, box-shadow ${durations.short}ms ${EASE}`,
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.textMuted },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.accent, borderWidth: 2 },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(t.accent, 0.12)}` },
          },
          notchedOutline: { borderColor: t.border },
          input: { padding: '10px 14px' },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { fontSize: '0.8125rem', color: t.textMuted, '&.Mui-focused': { color: t.accent } },
        },
      },
      MuiSelect: {
        styleOverrides: { select: { fontSize: '0.8125rem' } },
      },

      // ── Dialog — large rounding, blur backdrop ────────────────────────────
      MuiDialog: {
        defaultProps: { TransitionComponent: SlideUp },
        styleOverrides: {
          paper: {
            borderRadius: 24,
            border: `1px solid ${t.border}`,
            backgroundColor: t.surface,
            backgroundImage: 'none',
          },
          backdrop: { backgroundColor: t.scrim, backdropFilter: 'blur(8px)' },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontFamily: FONT_BODY,
            fontSize: '1.25rem',
            fontWeight: 500,
            padding: '24px 24px 12px',
          },
        },
      },

      // ── Drawer ────────────────────────────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${t.border}`,
            backgroundColor: t.canvas,
            backgroundImage: 'none',
          },
        },
      },

      // ── List / Nav — rounded pill selection ───────────────────────────────
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            margin: '2px 12px',
            padding: '8px 16px',
            minHeight: 36,
            color: t.textMuted,
            fontSize: '0.8125rem',
            transition: `all ${durations.short}ms ${EASE}`,
            '&:hover': { backgroundColor: alpha(t.text, 0.06), color: t.text },
            '&:active': { transform: 'scale(0.98)' },
            '&.Mui-selected': {
              backgroundColor: t.accentSurface,
              color: t.accent,
              fontWeight: 600,
              boxShadow: `inset 3px 0 0 ${t.accent}`,
              '& .MuiListItemIcon-root': { color: t.accent },
              '&:hover': { backgroundColor: alpha(t.accent, 0.16) },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 32, color: t.textSubtle } },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: { fontSize: '0.8125rem', fontWeight: 400 },
        },
      },

      // ── Tabs ──────────────────────────────────────────────────────────────
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            minHeight: 44,
            padding: '10px 20px',
            borderRadius: '12px 12px 0 0',
            color: t.textMuted,
            '&.Mui-selected': { color: t.text },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44, borderBottom: `1px solid ${t.border}` },
          indicator: { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: t.accent },
        },
      },

      // ── Tooltip — rounded, accent-tinted ──────────────────────────────────
      MuiTooltip: {
        defaultProps: { arrow: false, placement: 'top' },
        styleOverrides: {
          tooltip: {
            backgroundColor: t.surfaceRaised,
            color: t.text,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 8,
            padding: '6px 12px',
            border: `1px solid ${t.border}`,
            boxShadow: `0 4px 12px ${alpha('#000', 0.15)}`,
          },
        },
      },

      // ── Alert — rounded, tonal ────────────────────────────────────────────
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: 'none',
            fontSize: '0.8125rem',
            padding: '12px 16px',
          },
          standardSuccess: { backgroundColor: alpha(t.success, 0.1), color: t.success },
          standardError:   { backgroundColor: alpha(t.error, 0.1),   color: t.error },
          standardInfo:    { backgroundColor: alpha(t.info, 0.1),     color: t.info },
          standardWarning: { backgroundColor: alpha(t.warn, 0.1),     color: t.warn },
        },
      },

      // ── Switch — M3 style ─────────────────────────────────────────────────
      MuiSwitch: {
        styleOverrides: {
          root: { width: 42, height: 26, padding: 0, display: 'flex' },
          switchBase: {
            padding: 3, color: t.textSubtle,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#fff',
              '& + .MuiSwitch-track': { backgroundColor: t.accent, opacity: 1 },
            },
          },
          thumb: { width: 20, height: 20, boxShadow: 'none', transition: `all ${durations.short}ms ${EASE}` },
          track: { borderRadius: 13, backgroundColor: t.border, opacity: 1, transition: `background-color ${durations.short}ms ${EASE}` },
        },
      },

      // ── Toggle Button ───────────────────────────────────────────────────
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            overflow: 'hidden',
            backgroundColor: alpha(t.text, 0.03),
            padding: 2,
            gap: 2,
          },
          grouped: {
            border: 'none',
            borderRadius: '10px !important',
            '&:not(:first-of-type)': { borderLeft: 'none', marginLeft: 0 },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 14px',
            color: t.textMuted,
            border: 'none',
            borderRadius: 10,
            transition: `all ${durations.short}ms ${EASE}`,
            '&:hover': {
              backgroundColor: alpha(t.text, 0.06),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(t.accent, 0.15),
              color: t.accent,
              boxShadow: `0 1px 4px ${alpha(t.accent, 0.15)}`,
              '&:hover': { backgroundColor: alpha(t.accent, 0.2) },
            },
          },
        },
      },

      // ── Divider ───────────────────────────────────────────────────────────
      MuiDivider: { styleOverrides: { root: { borderColor: t.border } } },

      // ── Skeleton ──────────────────────────────────────────────────────────
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: { borderRadius: 8, backgroundColor: alpha(t.text, 0.06) },
        },
      },

      // ── AppBar / TopBar ───────────────────────────────────────────────────
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: {
            backgroundColor: t.canvas,
            borderBottom: `1px solid ${t.border}`,
            backgroundImage: 'none',
          },
        },
      },

      // ── Menu / Popover ────────────────────────────────────────────────────
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            boxShadow: `0 4px 24px ${alpha('#000', 0.2)}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 6px',
            padding: '8px 12px',
            fontSize: '0.8125rem',
            transition: `background-color ${durations.micro}ms ${EASE}`,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            boxShadow: `0 4px 24px ${alpha('#000', 0.2)}`,
          },
        },
      },

      // ── Autocomplete ──────────────────────────────────────────────────────
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            boxShadow: `0 4px 24px ${alpha('#000', 0.2)}`,
          },
          option: { borderRadius: 8, margin: '2px 6px' },
        },
      },
    },
  });
}
