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
      {/* Slot 0: 予約（戻る） — 現フェーズでは常に disabled */}
      <TouchButton label="← 戻る" disabled onClick={() => {}} />

      {/* Slot 1: 接続設定モーダルを開く */}
      <TouchButton label="接続設定" onClick={onSettingsOpen} />

      {/* Slot 2: トレンド表示切替 */}
      <TouchButton
        label={isTrendVisible ? 'トレンド非表示' : 'トレンド表示'}
        variant="accent"
        onClick={onTrendToggle}
      />

      {/* Slot 3: 保守モード切替 */}
      <TouchButton
        label={isMaintenanceMode ? '保守モード OFF' : '保守モード ON'}
        variant={isMaintenanceMode ? 'critical' : 'normal'}
        onClick={toggleMaintenance}
      />
    </footer>
  )
}
