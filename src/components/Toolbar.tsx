import { theme } from '../styles/theme'
import { POLLING_INTERVAL_MS } from '../config/plc'

interface ToolbarProps {
  isPollingActive: boolean
  onConnect: () => void
  onDisconnect: () => void
  onSettingsOpen: () => void
  isTrendVisible: boolean
  onTrendToggle: () => void
}

const ToolbarButton: React.FC<{
  title: string
  onClick: () => void
  active?: boolean
  color?: string
  children: React.ReactNode
}> = ({ title, onClick, active, color, children }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      background: active ? `${color ?? theme.accent}22` : 'transparent',
      border: `1px solid ${active ? (color ?? theme.accent) : 'transparent'}`,
      borderRadius: 3,
      color: active ? (color ?? theme.accent) : theme.textMuted,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: '0 8px',
      height: 22,
      fontFamily: theme.fontMono,
      fontSize: theme.fs.xs,
      letterSpacing: '0.04em',
      fontWeight: 600,
      transition: 'background 0.12s, color 0.12s, border-color 0.12s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = `${color ?? theme.accent}18`
      e.currentTarget.style.color = color ?? theme.accent
      e.currentTarget.style.borderColor = color ?? theme.accent
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = active ? `${color ?? theme.accent}22` : 'transparent'
      e.currentTarget.style.color = active ? (color ?? theme.accent) : theme.textMuted
      e.currentTarget.style.borderColor = active ? (color ?? theme.accent) : 'transparent'
    }}
  >
    {children}
  </button>
)

const Separator: React.FC = () => (
  <div
    style={{
      width: 1,
      height: 16,
      background: theme.border,
      flexShrink: 0,
      margin: '0 4px',
    }}
  />
)

export const Toolbar: React.FC<ToolbarProps> = ({
  isPollingActive,
  onConnect,
  onDisconnect,
  onSettingsOpen,
  isTrendVisible,
  onTrendToggle,
}) => {
  return (
    <div
      style={{
        flexShrink: 0,
        height: 28,
        background: theme.toolbar,
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: 4,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <ToolbarButton
        title="Connect to PLCs"
        onClick={onConnect}
        active={isPollingActive}
        color={theme.normal}
      >
        <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor">
          <polygon points="2,1 11,6 2,11" />
        </svg>
        CONNECT
      </ToolbarButton>

      <ToolbarButton
        title="Disconnect from PLCs"
        onClick={onDisconnect}
        active={!isPollingActive}
        color={theme.critical}
      >
        <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor">
          <rect x="2" y="2" width="8" height="8" />
        </svg>
        DISCONNECT
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        title="Toggle Realtime Trend Chart"
        onClick={onTrendToggle}
        active={isTrendVisible}
      >
        <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="1,9 4,5 7,7 11,2" />
        </svg>
        TREND
      </ToolbarButton>

      <ToolbarButton title="Connection Settings" onClick={onSettingsOpen}>
        <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor">
          <path d="M6 4a2 2 0 100 4 2 2 0 000-4zM1 5.5h1.2A3.99 3.99 0 015 2.2V1h2v1.2a3.99 3.99 0 012.8 3.3H11v1h-1.2A3.99 3.99 0 017 9.8V11H5V9.8A3.99 3.99 0 012.2 6.5H1v-1z" />
        </svg>
        SETTINGS
      </ToolbarButton>

      <Separator />

      <span
        style={{
          fontSize: theme.fs.xs,
          color: theme.textMuted,
          fontFamily: theme.fontMono,
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        {isPollingActive ? `POLLING ${POLLING_INTERVAL_MS}ms` : 'IDLE'}
      </span>
    </div>
  )
}
