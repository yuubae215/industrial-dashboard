import { useDebugStore } from '../store/useDebugStore'
import { theme } from '../styles/theme'
import { TouchButton } from './TouchButton'

interface LeftSidebarProps {
  onTrendToggle: () => void
  isTrendVisible: boolean
  onSettingsOpen: () => void
}

const NavItem: React.FC<{ label: string; active?: boolean }> = ({ label, active = false }) => (
  <div
    style={{
      padding: '7px 16px',
      fontSize: theme.fs.sm,
      fontFamily: theme.fontMono,
      fontWeight: active ? 700 : 400,
      color: active ? theme.text : theme.textMuted,
      background: active ? `${theme.accent}18` : 'transparent',
      borderLeft: `2px solid ${active ? theme.accent : 'transparent'}`,
      cursor: active ? 'default' : 'not-allowed',
      letterSpacing: '0.04em',
      opacity: active ? 1 : 0.5,
      userSelect: 'none',
    }}
  >
    {label}
  </div>
)

/**
 * デスクトップ左サイドバー。
 * ADR-004 の 4 固定スロットを縦列配置で実装。
 * スロットの順序・役割はステート変化で絶対に変わらない。
 */
export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onTrendToggle,
  isTrendVisible,
  onSettingsOpen,
}) => {
  const isMaintenanceMode = useDebugStore((s) => s.isMaintenanceMode)
  const toggleMaintenance = useDebugStore((s) => s.toggleMaintenanceMode)

  return (
    <nav
      style={{
        width: 200,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: theme.bgHeader,
        borderRight: `1px solid ${theme.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Views navigation */}
      <div style={{ paddingTop: 12 }}>
        <div
          style={{
            padding: '0 16px 6px',
            fontSize: theme.fs.xs,
            fontWeight: 700,
            color: theme.textMuted,
            letterSpacing: '0.12em',
          }}
        >
          VIEWS
        </div>
        <NavItem label="Overview" active />
        <NavItem label="Trends" />
        <NavItem label="Alarms" />
        <NavItem label="Diagnostics" />
      </div>

      <div style={{ height: 1, background: theme.border, margin: '12px 0' }} />

      {/* Fixed control slots — ADR-004, vertical layout for desktop */}
      <div>
        <div
          style={{
            padding: '0 16px 6px',
            fontSize: theme.fs.xs,
            fontWeight: 700,
            color: theme.textMuted,
            letterSpacing: '0.12em',
          }}
        >
          CONTROL
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '0 12px',
          }}
        >
          {/* Slot 0: Back — always disabled in current phase */}
          <TouchButton
            label="<- Back"
            disabled
            onClick={() => {}}
            style={{ width: '100%', minWidth: 0 }}
          />
          {/* Slot 1: Connection settings */}
          <TouchButton
            label="Settings"
            variant="ghost"
            onClick={onSettingsOpen}
            style={{ width: '100%', minWidth: 0 }}
          />
          {/* Slot 2: Trend visibility toggle */}
          <TouchButton
            label={isTrendVisible ? 'Hide Trend' : 'Trend'}
            variant="accent"
            onClick={onTrendToggle}
            style={{ width: '100%', minWidth: 0 }}
          />
          {/* Slot 3: Maintenance mode toggle */}
          <TouchButton
            label={isMaintenanceMode ? 'Maint OFF' : 'Maint ON'}
            variant={isMaintenanceMode ? 'critical' : 'normal'}
            onClick={toggleMaintenance}
            style={{ width: '100%', minWidth: 0 }}
          />
        </div>
      </div>

      <div style={{ flex: 1 }} />
    </nav>
  )
}
