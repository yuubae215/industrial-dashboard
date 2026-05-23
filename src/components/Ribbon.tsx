import { useDebugStore } from '../store/useDebugStore'
import { theme } from '../styles/theme'

/* ── Icon definitions ─────────────────────────────────── */

const IconBack = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="10,3 5,8 10,13" />
  </svg>
)

const IconSettings = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="2" y1="4" x2="14" y2="4" />
    <circle cx="6" cy="4" r="1.5" />
    <line x1="2" y1="8" x2="14" y2="8" />
    <circle cx="10" cy="8" r="1.5" />
    <line x1="2" y1="12" x2="14" y2="12" />
    <circle cx="5" cy="12" r="1.5" />
  </svg>
)

const IconTrend = () => (
  <svg viewBox="0 0 16 12" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,10 4,6 7,8 10,3 13,5 15,2" />
  </svg>
)

const IconWatch = () => (
  <svg viewBox="0 0 16 14" width="16" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="14" height="12" rx="1.5" />
    <line x1="1" y1="5" x2="15" y2="5" />
    <line x1="6" y1="5" x2="6" y2="13" />
  </svg>
)

/* ── RibbonButton ─────────────────────────────────────── */

interface RibbonButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  activeColor?: string
}

const RibbonButton: React.FC<RibbonButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
  activeColor = theme.accent,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      padding: '5px 10px',
      minWidth: 52,
      height: 44,
      border: 'none',
      borderRadius: 4,
      background: active ? `${activeColor}28` : 'transparent',
      color: disabled
        ? theme.textMuted
        : active
          ? activeColor
          : theme.textMuted,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.35 : 1,
      fontFamily: theme.fontMono,
      transition: 'background 0.12s, color 0.12s',
      outline: active ? `1px solid ${activeColor}55` : 'none',
    }}
    onMouseEnter={(e) => {
      if (!disabled && !active)
        (e.currentTarget as HTMLButtonElement).style.background = `${theme.border}88`
    }}
    onMouseLeave={(e) => {
      if (!disabled && !active)
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
    <span style={{ fontSize: 9, letterSpacing: '0.06em', fontWeight: active ? 700 : 400, lineHeight: 1 }}>
      {label}
    </span>
  </button>
)

const RibbonSep = () => (
  <div
    style={{
      width: 1,
      height: 32,
      background: theme.border,
      margin: '0 4px',
      alignSelf: 'center',
    }}
  />
)

/* ── Ribbon ───────────────────────────────────────────── */

interface RibbonProps {
  isTrendVisible: boolean
  onTrendToggle: () => void
  onSettingsOpen: () => void
}

/**
 * ヘッダー直下のツールバー。ADR-004 の 4 固定スロットをここに配置。
 * スロット順（左→右）: Back | Settings | Trend | Watch
 */
export const Ribbon: React.FC<RibbonProps> = ({
  isTrendVisible,
  onTrendToggle,
  onSettingsOpen,
}) => {
  const isMaintenanceMode = useDebugStore((s) => s.isMaintenanceMode)
  const toggleMaintenance = useDebugStore((s) => s.toggleMaintenanceMode)

  return (
    <div
      role="toolbar"
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        background: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
        gap: 2,
      }}
    >
      {/* Slot 0: Back (reserved) */}
      <RibbonButton icon={<IconBack />} label="BACK" onClick={() => {}} disabled />

      <RibbonSep />

      {/* Slot 1: Settings */}
      <RibbonButton icon={<IconSettings />} label="SETTINGS" onClick={onSettingsOpen} />

      <RibbonSep />

      {/* Slot 2: Trend chart toggle */}
      <RibbonButton
        icon={<IconTrend />}
        label="TREND"
        onClick={onTrendToggle}
        active={isTrendVisible}
        activeColor={theme.accent}
      />

      {/* Slot 3: Watch window / Maintenance mode */}
      <RibbonButton
        icon={<IconWatch />}
        label="WATCH"
        onClick={toggleMaintenance}
        active={isMaintenanceMode}
        activeColor={theme.warning}
      />
    </div>
  )
}
