import { usePlcStore } from '../store/usePlcStore'
import { MELSEC_PLC_ID, KEYENCE_PLC_ID } from '../store/usePlcConfigStore'
import { theme } from '../styles/theme'

const STATUS_COLOR: Record<string, string> = {
  connected: theme.normal,
  connecting: theme.warning,
  disconnected: theme.border,
  timeout: theme.warning,
  error: theme.critical,
}

const STATUS_LABEL: Record<string, string> = {
  connected: 'ONLINE',
  connecting: 'CONNECTING',
  disconnected: 'OFFLINE',
  timeout: 'TIMEOUT',
  error: 'ERROR',
}

const MENU_ITEMS = ['Project', 'View', 'Online', 'Tools'] as const

const menuItemStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: theme.textMuted,
  cursor: 'default',
  fontFamily: theme.fontMono,
  fontSize: theme.fs.xs,
  letterSpacing: '0.03em',
  padding: '0 10px',
  height: 28,
  borderRadius: 0,
  outline: 'none',
  userSelect: 'none',
  whiteSpace: 'nowrap',
}

/**
 * GX Works-style IDE menu bar — desktop only (hidden on mobile via parent condition).
 *
 * Renders: [Project][View][Online][Tools]  ···  MELSEC • KV status dots
 *
 * Height is fixed at 28px (compact, no rounding, monospace only).
 * Connection status dots mirror usePlcStore — no local state.
 */
export const MenuBar: React.FC = () => {
  const melsecStatus = usePlcStore((s) => s.connectionStatuses[MELSEC_PLC_ID] ?? 'disconnected')
  const keyenceStatus = usePlcStore((s) => s.connectionStatuses[KEYENCE_PLC_ID] ?? 'disconnected')

  return (
    <div
      style={{
        flexShrink: 0,
        height: 28,
        background: '#07080E',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px 0 0',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {/* IDE menu items */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            style={menuItemStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = theme.border
              el.style.color = theme.text
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'transparent'
              el.style.color = theme.textMuted
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* PLC connection status — compact dot + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 8 }}>
        {(
          [
            { plcId: MELSEC_PLC_ID, label: 'MELSEC', status: melsecStatus },
            { plcId: KEYENCE_PLC_ID, label: 'KV', status: keyenceStatus },
          ] as const
        ).map(({ plcId, label, status }) => (
          <span
            key={plcId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: theme.fs.xs,
              fontFamily: theme.fontMono,
              color: STATUS_COLOR[status] ?? theme.textMuted,
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: STATUS_COLOR[status] ?? theme.border,
                flexShrink: 0,
              }}
            />
            {label}&nbsp;{STATUS_LABEL[status] ?? status.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  )
}
