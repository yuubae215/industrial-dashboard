export const theme = {
  bg: '#1A1D20',
  bgCard: '#2D3748',
  bgHeader: '#1A202C',
  text: '#E2E8F0',
  textMuted: '#A0AEC0',
  border: '#4A5568',
  normal: '#48BB78',
  warning: '#F4A261',
  critical: '#E63946',
  accent: '#63B3ED',
  fontMono: "'JetBrains Mono', 'Roboto Mono', Consolas, monospace",
  touchMin: 48,
} as const

export type ThemeColor = 'normal' | 'warning' | 'critical' | 'accent'

export const alarmLevelColor: Record<string, string> = {
  HH: theme.critical,
  H: theme.warning,
  L: theme.warning,
  LL: theme.critical,
}
