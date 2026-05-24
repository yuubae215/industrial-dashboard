import { useState } from 'react'
import { usePlcStore } from '../store/usePlcStore'
import { theme } from '../styles/theme'

export interface PlcHierarchyNode {
  plcId: string
  label: string
  protocolLabel: string
  device: string
  startAddress: number
  count: number
}

interface LeftSidebarProps {
  nodes: PlcHierarchyNode[]
  /** ADR-008: control slots rendered at sidebar bottom (desktop only) */
  footer?: React.ReactNode
}

/* ── Status dot ───────────────────────────────────────── */

const statusDotColor: Record<string, string> = {
  connected:    theme.normal,
  connecting:   theme.warning,
  disconnected: theme.textMuted,
  timeout:      theme.warning,
  error:        theme.critical,
}

const StatusDot: React.FC<{ status: string }> = ({ status }) => (
  <span
    style={{
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: statusDotColor[status] ?? theme.textMuted,
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
)

/* ── Tree icons ───────────────────────────────────────── */

const ChevronDown = () => (
  <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <polyline points="1,1 5,5 9,1" />
  </svg>
)

const ChevronRight = () => (
  <svg viewBox="0 0 6 10" width="6" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <polyline points="1,1 5,5 1,9" />
  </svg>
)

/* ── PlcTreeNode ──────────────────────────────────────── */

interface PlcTreeNodeProps {
  node: PlcHierarchyNode
}

const PlcTreeNode: React.FC<PlcTreeNodeProps> = ({ node }) => {
  const [expanded, setExpanded] = useState(true)

  const status = usePlcStore((s) => s.connectionStatuses[node.plcId] ?? 'disconnected')
  const values = usePlcStore((s) => s.values[node.plcId] ?? {})
  const isConnected = status === 'connected'

  const registers = Array.from({ length: node.count }, (_, i) => ({
    address: node.startAddress + i,
    label: `${node.device}${node.startAddress + i}`,
  }))

  return (
    <div>
      {/* PLC node row */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px 5px 12px',
          cursor: 'pointer',
          userSelect: 'none',
          color: theme.text,
          fontSize: theme.fs.sm,
          fontFamily: theme.fontMono,
          fontWeight: 600,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = `${theme.border}88`
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        <span style={{ color: theme.textMuted, width: 10, display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronDown /> : <ChevronRight />}
        </span>
        <StatusDot status={status} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.label}
        </span>
      </div>

      {/* Protocol label */}
      {expanded && (
        <div
          style={{
            padding: '0 8px 4px 36px',
            fontSize: theme.fs.xs,
            color: theme.textMuted,
            fontFamily: theme.fontMono,
            letterSpacing: '0.04em',
          }}
        >
          {node.protocolLabel}
        </div>
      )}

      {/* Register leaves */}
      {expanded &&
        registers.map(({ address, label }) => {
          const raw = values[address]
          return (
            <div
              key={address}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '2px 8px 2px 36px',
                fontSize: theme.fs.xs,
                fontFamily: theme.fontMono,
                color: theme.textMuted,
              }}
            >
              <span
                style={{
                  color: theme.border,
                  marginRight: 4,
                  fontSize: 10,
                  userSelect: 'none',
                }}
              >
                L
              </span>
              <span style={{ flex: 1, color: theme.textMuted }}>{label}</span>
              <span
                style={{
                  color: isConnected && raw !== undefined ? theme.normal : theme.border,
                  fontWeight: 600,
                  minWidth: 40,
                  textAlign: 'right',
                }}
              >
                {raw !== undefined ? String(raw) : '---'}
              </span>
            </div>
          )
        })}
    </div>
  )
}

/* ── LeftSidebar ──────────────────────────────────────── */

/**
 * PLCネットワーク階層ツリー。
 * ナビゲーションペインとして機能し、接続状態とレジスタ現在値をツリー表示する。
 */
export const LeftSidebar: React.FC<LeftSidebarProps> = ({ nodes, footer }) => {
  return (
    <nav
      style={{
        width: 220,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: theme.bgHeader,
        borderRight: `1px solid ${theme.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Root: Field Network */}
      <div
        style={{
          padding: '10px 12px 6px',
          fontSize: theme.fs.xs,
          fontWeight: 700,
          color: theme.textMuted,
          letterSpacing: '0.12em',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        FIELD NETWORK
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
        {nodes.map((node) => (
          <PlcTreeNode key={node.plcId} node={node} />
        ))}
      </div>

      {footer}
    </nav>
  )
}
