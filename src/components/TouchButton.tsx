import type { ThemeColor } from '../styles/theme'
import { theme } from '../styles/theme'

const variantBg: Record<ThemeColor, string> = {
  normal: theme.normal,
  warning: theme.warning,
  critical: theme.critical,
  accent: theme.accent,
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
      borderRadius: 6,
      border: 'none',
      fontFamily: theme.fontMono,
      fontSize: 13,
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.38 : 1,
      background: disabled ? theme.border : variantBg[variant],
      color: disabled ? theme.textMuted : '#0F1114',
      transition: 'opacity 0.15s, background 0.15s',
      ...style,
    }}
  >
    {label}
  </button>
)
