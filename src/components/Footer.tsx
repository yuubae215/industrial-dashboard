import { useDebugStore } from '../store/useDebugStore'
import { theme } from '../styles/theme'
import { TouchButton } from './TouchButton'

interface FooterProps {
  onTrendToggle: () => void
  isTrendVisible: boolean
  onSettingsOpen: () => void
}

/**
 * フッター — 4 固定スロット（ADR-004）。
 * スロット位置は決して変わらない。disabled 時は grayout 表示のみ（display:none 禁止）。
 *
 * Slot 0 (left): 予約（将来の戻る操作用）
 * Slot 1:        設定（未実装 — disabled）
 * Slot 2:        トレンド表示切替
 * Slot 3 (right): 保守モード ON/OFF
 */
export const Footer: React.FC<FooterProps> = ({ onTrendToggle, isTrendVisible, onSettingsOpen }) => {
  const isMaintenanceMode = useDebugStore((s) => s.isMaintenanceMode)
  const toggleMaintenance = useDebugStore((s) => s.toggleMaintenanceMode)

  return (
    <footer
      style={{
        position: 'sticky',
        bottom: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        padding: '8px 16px',
        background: theme.bgHeader,
        borderTop: `1px solid ${theme.border}`,
        zIndex: 100,
      }}
    >
      {/* Slot 0: reserved (back) — always disabled in this phase */}
      <TouchButton label="<- Back" disabled onClick={() => {}} />

      {/* Slot 1: open connection settings modal */}
      <TouchButton label="Settings" onClick={onSettingsOpen} />

      {/* Slot 2: trend visibility toggle */}
      <TouchButton
        label={isTrendVisible ? 'Hide Trend' : 'Trend'}
        variant="accent"
        onClick={onTrendToggle}
      />

      {/* Slot 3: maintenance mode toggle */}
      <TouchButton
        label={isMaintenanceMode ? 'Maintenance OFF' : 'Maintenance ON'}
        variant={isMaintenanceMode ? 'critical' : 'normal'}
        onClick={toggleMaintenance}
      />
    </footer>
  )
}
