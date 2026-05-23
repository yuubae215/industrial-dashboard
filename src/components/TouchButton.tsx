import type { ThemeColor } from '../styles/theme'
import { theme } from '../styles/theme'

const variantBg: Record<ThemeColor, string> = {
  normal:   theme.normal,
  warning:  theme.warning,
  critical: theme.critical,
  accent:   theme.accent,
  ghost:    'transparent',
}

const variantTextColor: Record<ThemeColor, string> = {
  normal:   '#0F1114',
  warning:  '#0F1114',
  critical: '#0F1114',
  accent:   '#0F1114',
  ghost:    theme.textMuted,
}

const variantBorder: Record<ThemeColor, string> = {
  normal:   'none',
  warning:  'none',
  critical: 'none',
  accent:   'none',
  ghost:    `1px solid ${theme.border}`,
}

interface TouchButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: ThemeColor
  style?: React.CSSProperties
}

/**
 * 産業用タッチ対応ボタン。
 * 最小サイズ 48px（手袋着用でも操作可能）。
 * [ADR-004] disabled 時は display:none ではなく disabled + grayout。
 */
export const TouchButton: React.FC<TouchButtonProps> = ({
  label,
  onClick,
  disabled = false,
  variant = 'normal',
  style,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-disabled={disabled}
    style={{
      minHeight: theme.touchMin,
      minWidth: 80,
      padding: '0 16px',
      borderRadius: 4,
      border: disabled ? `1px solid ${theme.border}` : variantBorder[variant],
      fontFamily: theme.fontMono,
      fontSize: theme.fs.base,
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.32 : 1,
      background: disabled ? 'transparent' : variantBg[variant],
      color: disabled ? theme.textMuted : variantTextColor[variant],
      transition: 'opacity 0.15s, background 0.15s',
      letterSpacing: '0.03em',
      ...style,
    }}
  >
    {label}
  </button>
)
