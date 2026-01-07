/**
 * Design Tokens - Light & Dark Mode
 * Shopify Polaris-inspired design system
 */
import { useState, useEffect } from 'react'

// ============================================
// LIGHT MODE COLORS
// ============================================
export const lightColors = {
  // Backgrounds
  bgPage: '#f6f6f7',
  bgSurface: '#ffffff',
  bgSurfaceHover: '#f9fafb',
  bgSurfacePressed: '#f1f2f3',
  bgSurfaceSelected: '#f2f7fe',
  bgSubdued: '#fafbfb',

  // Text
  text: '#202223',
  textSecondary: '#6d7175',
  textSubdued: '#8c9196',
  textDisabled: '#b5b5b5',
  textOnPrimary: '#ffffff',

  // Borders
  border: '#e1e3e5',
  borderSubdued: '#ebebeb',
  borderHover: '#c9cccf',
  borderFocused: '#5c6ac4',

  // Primary (Indigo - Shopify style)
  primary: '#5c6ac4',
  primaryHover: '#4959bd',
  primaryPressed: '#3f4eae',
  primaryLight: '#f4f5fa',
  primarySubtle: '#eef0fb',

  // Success
  success: '#008060',
  successLight: '#e3f1ed',
  successSubtle: '#f1f8f5',

  // Warning
  warning: '#b98900',
  warningLight: '#fcf1cd',
  warningSubtle: '#fdf8e8',

  // Critical
  critical: '#d72c0d',
  criticalLight: '#fbeae5',
  criticalSubtle: '#fdf3f0',

  // Interactive (Blue)
  interactive: '#2c6ecb',
  interactiveHover: '#1f5199',
  interactivePressed: '#164689',

  // Tiers
  tierBronze: '#8b5a2b',
  tierBronzeLight: '#fdf4e8',
  tierSilver: '#6b7280',
  tierSilverLight: '#f3f4f6',
  tierGold: '#b8860b',
  tierGoldLight: '#fef9e7',
  tierPlatinum: '#64748b',
  tierPlatinumLight: '#f1f5f9',
}

// ============================================
// DARK MODE COLORS
// ============================================
export const darkColors = {
  // Backgrounds
  bgPage: '#1a1a1b',
  bgSurface: '#202223',
  bgSurfaceHover: '#2a2b2c',
  bgSurfacePressed: '#323334',
  bgSurfaceSelected: '#2a3441',
  bgSubdued: '#252627',

  // Text
  text: '#f6f6f7',
  textSecondary: '#a8a8a8',
  textSubdued: '#8c8c8c',
  textDisabled: '#5c5c5c',
  textOnPrimary: '#ffffff',

  // Borders
  border: '#3a3a3b',
  borderSubdued: '#303031',
  borderHover: '#4a4a4b',
  borderFocused: '#7c8adb',

  // Primary (Lighter Indigo for dark mode)
  primary: '#7c8adb',
  primaryHover: '#8b98e0',
  primaryPressed: '#6b79cc',
  primaryLight: '#2a2d3d',
  primarySubtle: '#252836',

  // Success
  success: '#00a67d',
  successLight: '#1a2f28',
  successSubtle: '#1a2924',

  // Warning
  warning: '#d4a800',
  warningLight: '#2f2a1a',
  warningSubtle: '#2a261a',

  // Critical
  critical: '#ff4d4d',
  criticalLight: '#2f1a1a',
  criticalSubtle: '#2a1a1a',

  // Interactive (Lighter Blue)
  interactive: '#4d8fd9',
  interactiveHover: '#6ba0e0',
  interactivePressed: '#3d7fcc',

  // Tiers (adjusted for dark mode visibility)
  tierBronze: '#cd8b5a',
  tierBronzeLight: '#2a231a',
  tierSilver: '#9ca3af',
  tierSilverLight: '#252627',
  tierGold: '#d4a800',
  tierGoldLight: '#2a261a',
  tierPlatinum: '#94a3b8',
  tierPlatinumLight: '#252830',
}

// Export colors as the default (light mode) for backwards compatibility
export const colors = lightColors;

// ============================================
// SHADOWS
// ============================================
export const lightShadows = {
  sm: '0 1px 0 rgba(0, 0, 0, 0.05)',
  md: '0 0 0 1px rgba(63, 63, 68, 0.05), 0 1px 3px rgba(63, 63, 68, 0.15)',
  lg: '0 0 0 1px rgba(63, 63, 68, 0.05), 0 4px 16px rgba(0, 0, 0, 0.12)',
  xl: '0 0 0 1px rgba(63, 63, 68, 0.05), 0 8px 32px rgba(0, 0, 0, 0.16)',
  focus: '0 0 0 2px #5c6ac4',
  card: '0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
  cardHover: '0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.12)',
}

export const darkShadows = {
  sm: '0 1px 0 rgba(0, 0, 0, 0.2)',
  md: '0 0 0 1px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.4)',
  lg: '0 0 0 1px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.3)',
  xl: '0 0 0 1px rgba(0, 0, 0, 0.2), 0 8px 32px rgba(0, 0, 0, 0.4)',
  focus: '0 0 0 2px #7c8adb',
  card: '0 1px 2px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.3)',
  cardHover: '0 2px 4px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.35)',
}

// Export shadows as the default (light mode) for backwards compatibility
export const shadows = lightShadows;

// ============================================
// SPACING & SIZING
// ============================================
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
}

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

  // Font sizes
  xs: 12,
  sm: 13,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,

  // Font weights
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

// ============================================
// RESPONSIVE HOOK
// ============================================
export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const checkBreakpoint = () => {
      if (window.innerWidth < 640) setBreakpoint('mobile')
      else if (window.innerWidth < 1024) setBreakpoint('tablet')
      else setBreakpoint('desktop')
    }
    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  return breakpoint
}

// ============================================
// THEME-AWARE STYLE HELPERS
// ============================================
// These functions take colors as a parameter for theme-awareness

export const getCardStyle = (c: typeof lightColors, s: typeof lightShadows): React.CSSProperties => ({
  backgroundColor: c.bgSurface,
  borderRadius: radius.lg,
  border: `1px solid ${c.border}`,
  boxShadow: s.card,
})

export const getInputStyle = (c: typeof lightColors): React.CSSProperties => ({
  width: '100%',
  padding: '10px 12px',
  backgroundColor: c.bgSurface,
  border: `1px solid ${c.border}`,
  borderRadius: radius.md,
  fontSize: typography.base,
  color: c.text,
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
})

export const getButtonPrimaryStyle = (c: typeof lightColors): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 16px',
  backgroundColor: c.primary,
  color: c.textOnPrimary,
  border: 'none',
  borderRadius: radius.md,
  fontSize: typography.base,
  fontWeight: typography.medium,
  cursor: 'pointer',
  transition: 'background-color 150ms ease',
})

export const getButtonSecondaryStyle = (c: typeof lightColors): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 16px',
  backgroundColor: c.bgSurface,
  color: c.text,
  border: `1px solid ${c.border}`,
  borderRadius: radius.md,
  fontSize: typography.base,
  fontWeight: typography.medium,
  cursor: 'pointer',
  transition: 'background-color 150ms ease, border-color 150ms ease',
})

export const getBadgeStyle = (
  c: typeof lightColors,
  variant: 'success' | 'warning' | 'critical' | 'default'
): React.CSSProperties => {
  const variants = {
    success: { bg: c.successLight, color: c.success },
    warning: { bg: c.warningLight, color: c.warning },
    critical: { bg: c.criticalLight, color: c.critical },
    default: { bg: c.bgSubdued, color: c.textSecondary },
  }
  const v = variants[variant]
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    backgroundColor: v.bg,
    color: v.color,
    borderRadius: radius.full,
    fontSize: typography.xs,
    fontWeight: typography.medium,
  }
}

export const getTierBadgeStyle = (
  c: typeof lightColors,
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
): React.CSSProperties => {
  const tiers = {
    bronze: { bg: c.tierBronzeLight, color: c.tierBronze },
    silver: { bg: c.tierSilverLight, color: c.tierSilver },
    gold: { bg: c.tierGoldLight, color: c.tierGold },
    platinum: { bg: c.tierPlatinumLight, color: c.tierPlatinum },
  }
  const t = tiers[tier]
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    backgroundColor: t.bg,
    color: t.color,
    borderRadius: radius.full,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    textTransform: 'capitalize',
  }
}

// ============================================
// LEGACY STYLE EXPORTS (for backwards compatibility)
// These use light mode colors by default
// ============================================
export const cardStyle: React.CSSProperties = getCardStyle(lightColors, lightShadows)
export const inputStyle: React.CSSProperties = getInputStyle(lightColors)
export const buttonPrimaryStyle: React.CSSProperties = getButtonPrimaryStyle(lightColors)
export const buttonSecondaryStyle: React.CSSProperties = getButtonSecondaryStyle(lightColors)

export const badgeStyle = (variant: 'success' | 'warning' | 'critical' | 'default'): React.CSSProperties =>
  getBadgeStyle(lightColors, variant)

export const tierBadgeStyle = (tier: 'bronze' | 'silver' | 'gold' | 'platinum'): React.CSSProperties =>
  getTierBadgeStyle(lightColors, tier)
