export const theme = {
  bg: '#0B0D13',
  bgCard: '#131722',
  bgHeader: '#0F111A',
  text: '#F8FAFC',
  textMuted: '#475569',
  border: '#1E293B',
  normal: '#0EA5E9',
  warning: '#F59E0B',
  critical: '#EF4444',
  accent: '#6366F1',
  quantity: {
    temp:    '#F97316',
    press:   '#06B6D4',
    flow:    '#10B981',
    generic: '#64748B',
  },
  fontMono: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",
  touchMin: 48,
} as const

export type ThemeColor = 'normal' | 'warning' | 'critical' | 'accent'

export const alarmLevelColor: Record<string, string> = {
  HH: theme.critical,
  H:  theme.warning,
  L:  theme.warning,
  LL: theme.critical,
}
