import { useDebugStore } from '../store/useDebugStore'
import { theme } from '../styles/theme'
import { POLLING_INTERVAL_MS } from '../config/plc'

interface StatusBarProps {
  tagCount: number
}

export const StatusBar: React.FC<StatusBarProps> = ({ tagCount }) => {
  const isMaintenanceMode = useDebugStore((s) => s.isMaintenanceMode)

  return (
    <div
      style={{
        height: 28,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: theme.bgHeader,
        borderTop: `1px solid ${theme.border}`,
        fontSize: theme.fs.xs,
        fontFamily: theme.fontMono,
        letterSpacing: '0.06em',
      }}
    >
      <span
        style={{
          color: isMaintenanceMode ? theme.warning : theme.normal,
          fontWeight: 700,
        }}
      >
        {isMaintenanceMode ? 'MAINTENANCE MODE' : 'NORMAL MODE'}
      </span>

      <span style={{ color: theme.textMuted }}>
        POLLING {POLLING_INTERVAL_MS}ms
      </span>

      <span style={{ color: theme.textMuted }}>
        {tagCount} TAGS MONITORED
      </span>
    </div>
  )
}
