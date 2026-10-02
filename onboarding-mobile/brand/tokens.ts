// Power Platform AI Solution brand tokens — shared source of truth for the mobile app.
// Mirrors the web app / email templates (indigo → violet gradient, pink accent).
export const tokens = {
  color: {
    primary: '#4F46E5',
    primaryDeep: '#3730A3',
    violet: '#7C3AED',
    accent: '#EEF2FF',
    pink: '#DB2777',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    onPrimary: '#FFFFFF',
    statusSuccess: '#15803D',
    statusWarning: '#B45309',
    statusDanger: '#B91C1C',
    statusInfo: '#4338CA',
  },
  gradient: ['#4F46E5', '#7C3AED', '#DB2777'] as const,
} as const;
