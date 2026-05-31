import { useDebugStore } from '../store/useDebugStore'
import { theme } from '../styles/theme'
import { TouchButton } from './TouchButton'

/**
 * ADR-008: layout-agnostic 4-slot control surface.
 *
 * layout="horizontal"  → mobile footer (4-column CSS grid, sticky bottom)
 * layout="vertical"    → desktop sidebar toolbar (horizontal icon ribbon)
 *
 * Slot roles are fixed (ADR-008 §1):
 *   Slot 0  BACK        — reserved, always disabled
 *   Slot 1  SETTINGS    — opens ConnectionSettings modal
 *   Slot 2  TREND       — toggles RealtimeTrendChart
 *   Slot 3  MAINTENANCE — toggles isMaintenanceMode
 *
 * Never render two instances simultaneously (ADR-008 prohibition).
 */

interface FixedControlSlotsProps {
  layout: 'horizontal' | 'vertical'
  isTrendVisible: boolean
  isConnected: boolean
  onConnect: () => void
  onDisconnect: () => void
  onTrendToggle: () => void
  onSettingsOpen: () => void
}

/* ── Desktop icon SVGs ────────────────────────────────── */

const IconConnect = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <polygon points="3,2 14,8 3,14" />
  </svg>
)

const IconDisconnect = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <rect x="3" y="3" width="10" height="10" />
  </svg>
)

const IconSettings = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.6 3.6l.85.85M11.55 11.55l.85.85M3.6 12.4l.85-.85M11.55 4.45l.85-.85" />
  </svg>
)

const IconTrend = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,12 5,8 8,9 11,5 14,3" />
    <line x1="2" y1="14" x2="14" y2="14" />
  </svg>
)

const IconMaintenance = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2a3.5 3.5 0 00-3.4 4.4L3 11a1.4 1.4 0 002 2l4.6-4.6A3.5 3.5 0 0011 2z" />
    <circle cx="11" cy="5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

/* ── Desktop icon button ──────────────────────────────── */

interface IconButtonProps {
  icon: React.ReactNode
  title: string
  active?: boolean
  activeColor?: string
  disabled?: boolean
  onClick: () => void
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  title,
  active = false,
  activeColor = theme.accent,
  disabled = false,
  onClick,
}) => {
  const baseBg = active ? `${activeColor}22` : 'transparent'
  const baseColor = disabled ? theme.border : active ? activeColor : theme.textMuted
  const baseBorder = active ? `1px solid ${activeColor}66` : `1px solid ${theme.border}`

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        borderRadius: 3,
        border: disabled ? `1px solid ${theme.border}` : baseBorder,
        background: disabled ? 'transparent' : baseBg,
        color: baseColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'color 0.12s, border-color 0.12s, background 0.12s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        const el = e.currentTarget
        el.style.color = active ? activeColor : theme.text
        el.style.borderColor = active ? activeColor : theme.textMuted
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        const el = e.currentTarget
        el.style.color = baseColor
        el.style.borderColor = active ? `${activeColor}66` : theme.border
      }}
    >
      {icon}
    </button>
  )
}

/* ── FixedControlSlots ────────────────────────────────── */

export const FixedControlSlots: React.FC<FixedControlSlotsProps> = ({
  layout,
  isTrendVisible,
  isConnected,
  onConnect,
  onDisconnect,
  onTrendToggle,
  onSettingsOpen,
}) => {
  const isMaintenanceMode = useDebugStore((s) => s.isMaintenanceMode)
  const toggleMaintenance = useDebugStore((s) => s.toggleMaintenanceMode)

  if (layout === 'vertical') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 4,
          padding: '6px 8px',
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
        }}
        data-slot-layout={layout}
      >
        {/* Slot 0: CONNECT / DISCONNECT */}
        <IconButton
          icon={isConnected ? <IconDisconnect /> : <IconConnect />}
          title={isConnected ? 'Disconnect all PLCs' : 'Connect all PLCs'}
          active={isConnected}
          activeColor={isConnected ? theme.critical : theme.normal}
          onClick={isConnected ? onDisconnect : onConnect}
        />

        {/* Slot 1: SETTINGS */}
        <IconButton
          icon={<IconSettings />}
          title="Connection Settings"
          onClick={onSettingsOpen}
        />

        {/* Slot 2: TREND */}
        <IconButton
          icon={<IconTrend />}
          title={isTrendVisible ? 'Hide Trend Chart' : 'Show Trend Chart'}
          active={isTrendVisible}
          activeColor={theme.accent}
          onClick={onTrendToggle}
        />

        {/* Slot 3: MAINTENANCE */}
        <IconButton
          icon={<IconMaintenance />}
          title={isMaintenanceMode ? 'Exit Maintenance Mode' : 'Enter Maintenance Mode'}
          active={isMaintenanceMode}
          activeColor={theme.critical}
          onClick={toggleMaintenance}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        padding: '8px 16px',
        background: theme.bgHeader,
        borderTop: `1px solid ${theme.border}`,
        flexShrink: 0,
        height: 64,
        boxSizing: 'border-box',
        width: '100%',
      }}
      data-slot-layout={layout}
    >
      {/* Slot 0: CONNECT / DISCONNECT */}
      <TouchButton
        label={isConnected ? 'DISCONN' : 'CONNECT'}
        variant={isConnected ? 'critical' : 'normal'}
        onClick={isConnected ? onDisconnect : onConnect}
      />

      {/* Slot 1: SETTINGS */}
      <TouchButton label="Settings" variant="ghost" onClick={onSettingsOpen} />

      {/* Slot 2: TREND */}
      <TouchButton
        label={isTrendVisible ? 'Hide Trend' : 'Trend'}
        variant="accent"
        onClick={onTrendToggle}
      />

      {/* Slot 3: MAINTENANCE */}
      <TouchButton
        label={isMaintenanceMode ? 'Maint. OFF' : 'Maint. ON'}
        variant={isMaintenanceMode ? 'critical' : 'normal'}
        onClick={toggleMaintenance}
      />
    </div>
  )
}
