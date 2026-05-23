import { usePlcStore } from '../store/usePlcStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { toEngineeringValue } from '../types/branded'
import { alarmLevelColor, theme } from '../styles/theme'
import type { AlarmThreshold, AlarmLevel, ConnectionStatus } from '../types/domain'
import type { PlcRawValue } from '../types/branded'

/**
 * 現在値と設定しきい値からアラームレベルを毎回純粋算出する。
 * [公理2] 結果を保存してはならない。
 */
export function computeCurrentAlarmLevel(
  raw: PlcRawValue,
  threshold: AlarmThreshold,
): AlarmLevel | null {
  if (threshold.HH !== undefined && raw >= threshold.HH) return 'HH'
  if (threshold.H  !== undefined && raw >= threshold.H)  return 'H'
  if (threshold.LL !== undefined && raw <= threshold.LL) return 'LL'
  if (threshold.L  !== undefined && raw <= threshold.L)  return 'L'
  return null
}

const statusDotColor: Record<ConnectionStatus, string> = {
  connected:    theme.normal,
  connecting:   theme.warning,
  disconnected: theme.border,
  timeout:      theme.warning,
  error:        theme.critical,
}

interface MetricCardProps {
  label: string
  plcId: string
  address: number
  scale?: number
  unit?: string
  threshold?: AlarmThreshold
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  plcId,
  address,
  scale = 1,
  unit = '',
  threshold,
}) => {
  const raw = usePlcStore((s) => s.values[plcId]?.[address])
  const status = usePlcStore((s) => s.connectionStatuses[plcId] ?? 'disconnected')
  // しきい値がある場合は useAlarmStore から最新のしきい値を取得（変更反映のため）
  const storedThreshold = useAlarmStore((s) =>
    threshold
      ? (s.thresholds.find(
          (t) => t.plcId === threshold.plcId && t.address === threshold.address,
        ) ?? threshold)
      : undefined,
  )
  const activeThreshold = storedThreshold ?? threshold

  // [公理2] 毎回算出 — 結果を state に保存しない
  const alarmLevel =
    raw !== undefined && activeThreshold
      ? computeCurrentAlarmLevel(raw, activeThreshold)
      : null

  const valueColor = alarmLevel === null ? theme.normal : alarmLevelColor[alarmLevel]

  const displayValue =
    raw !== undefined
      ? toEngineeringValue(raw, scale).toFixed(scale < 1 ? 1 : 0)
      : '---'

  return (
    <div
      style={{
        flex: '1 1 280px',
        background: theme.bgCard,
        borderRadius: 8,
        padding: 20,
        borderLeft: `4px solid ${valueColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 11,
            color: theme.textMuted,
            fontFamily: theme.fontMono,
          }}
        >
          {plcId} D{address}
        </span>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: statusDotColor[status],
          }}
        />
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{label}</div>

      <div
        style={{
          fontSize: 40,
          fontWeight: 700,
          color: valueColor,
          fontFamily: theme.fontMono,
          letterSpacing: '-1px',
          lineHeight: 1.1,
        }}
      >
        {displayValue}
        {unit && (
          <span style={{ fontSize: 18, marginLeft: 6, fontWeight: 400, color: theme.textMuted }}>
            {unit}
          </span>
        )}
      </div>

      <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontMono }}>
        生値: {raw !== undefined ? String(raw) : '---'}
        {alarmLevel && (
          <span
            style={{
              marginLeft: 12,
              color: valueColor,
              fontWeight: 700,
            }}
          >
            ▲ ALARM [{alarmLevel}]
          </span>
        )}
      </div>
    </div>
  )
}
