/**
 * TrueCalling Structured Visual Design Tokens
 */

export const THEME_TOKENS = {
  colors: {
    bgDark: '#080C14',
    bgCard: 'rgba(16, 23, 38, 0.85)',
    bgCardHover: 'rgba(24, 34, 56, 0.95)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderActive: 'rgba(16, 185, 129, 0.4)',
    
    // Status & Accents
    accentEmerald: '#10B981',
    accentCyan: '#06B6D4',
    warningAmber: '#F59E0B',
    dangerRose: '#EF4444',
    
    // Text Hierarchy
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    
    // Audio Waveform & Glow
    speakingGlow: '0 0 20px rgba(16, 185, 129, 0.45)',
    mutedGlow: '0 0 12px rgba(239, 68, 68, 0.35)',
  },

  fonts: {
    labels: "'Space Mono', monospace, ui-monospace",
    headings: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    full: '9999px',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
} as const;
