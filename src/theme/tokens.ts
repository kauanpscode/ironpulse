import type { TextStyle } from 'react-native';

export const colors = {
  // Core surfaces (Dark Mode Native)
  background: '#0D0D0F',
  surface: '#18181B',
  surfaceElevated: '#222228',
  surfacePressed: '#2B2B33',
  border: '#27272A',
  borderSubtle: '#1F1F24',

  // Brand accents
  primary: '#F97316', // Vibrant Orange
  primaryDark: '#EA580C',
  primaryMuted: 'rgba(249, 115, 22, 0.16)',
  secondary: '#84CC16', // Vibrant Lime Green
  secondaryDark: '#65A30D',
  secondaryMuted: 'rgba(132, 204, 22, 0.16)',

  // Semantic colors
  success: '#84CC16',
  successMuted: 'rgba(132, 204, 22, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.16)',
  info: '#38BDF8',
  infoMuted: 'rgba(56, 189, 248, 0.16)',
  purple: '#A855F7',
  purpleMuted: 'rgba(168, 85, 247, 0.16)',

  // Text
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textInverse: '#09090B',

  // Heatmap levels
  heatmap0: '#1C1C21',
  heatmap1: 'rgba(249, 115, 22, 0.28)',
  heatmap2: 'rgba(249, 115, 22, 0.52)',
  heatmap3: 'rgba(249, 115, 22, 0.78)',
  heatmap4: '#F97316',
  cardioDot: '#38BDF8',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography: Record<
  | 'hero'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'micro'
  | 'metricLarge'
  | 'metricMedium',
  TextStyle
> = {
  hero: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  micro: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  metricLarge: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
  metricMedium: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
};

export const SET_TYPE_META = {
  W: {
    label: 'Aquecimento',
    short: 'W',
    color: colors.info,
    bg: colors.infoMuted,
  },
  N: {
    label: 'Trabalho',
    short: 'N',
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  D: {
    label: 'Drop-set',
    short: 'D',
    color: colors.purple,
    bg: colors.purpleMuted,
  },
  F: {
    label: 'Falha',
    short: 'F',
    color: colors.danger,
    bg: colors.dangerMuted,
  },
} as const;
