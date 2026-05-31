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
  activityBar:    '#080A10',
  toolbar:        '#0A0C16',
  panelHeader:    '#0C0F1B',
  splitterActive: '#334155',
  fontMono: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",
  touchMin: 48,
  // Modular type scale — base 13, ratio ~1.25 (Major Third)
  // xs→sm→base→md→lg use 1.22–1.25x steps; xl is the display size for primary metric values
  fs: {
    xs:   10,  // debug metadata, raw tags
    sm:   11,  // secondary labels, status badges
    base: 13,  // body / normal text
    md:   16,  // card headings, modal titles
    lg:   20,  // clock, section emphasis
    xl:   36,  // primary metric value (was 44 — reduced for better card proportions)
  },
  // 4px-base spacing grid
  sp: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
} as const

export type ThemeColor = 'normal' | 'warning' | 'critical' | 'accent' | 'ghost'

export const alarmLevelColor: Record<string, string> = {
  HH: theme.critical,
  H:  theme.warning,
  L:  theme.warning,
  LL: theme.critical,
}
