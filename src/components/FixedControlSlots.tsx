import { useDebugStore } from '../store/useDebugStore'
import { theme } from '../styles/theme'
import { TouchButton } from './TouchButton'

/**
 * ADR-008: layout-agnostic 4-slot control surface.
 *
 * layout="horizontal"  → mobile footer (4-column CSS grid, sticky bottom)
 * layout="vertical"    → desktop sidebar bottom (flex-column stack)
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
  onTrendToggle: () => void
  onSettingsOpen: () => void
}

export const FixedControlSlots: React.FC<FixedControlSlotsProps> = ({
  layout,
  isTrendVisible,
  onTrendToggle,
  onSettingsOpen,
}) => {
  const isMaintenanceMode = useDebugStore((s) => s.isMaintenanceMode)
  const toggleMaintenance = useDebugStore((s) => s.toggleMaintenanceMode)

  const containerStyle: React.CSSProperties =
    layout === 'horizontal'
      ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          padding: '8px 16px',
          background: theme.bgHeader,
          borderTop: `1px solid ${theme.border}`,
          flexShrink: 0,
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '10px 10px 12px',
          borderTop: `1px solid ${theme.border}`,
          flexShrink: 0,
        }

  return (
    <div style={containerStyle} data-slot-layout={layout}>
      {/* Slot 0: BACK — reserved, always disabled */}
      <TouchButton label="<- Back" disabled onClick={() => {}} />

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
