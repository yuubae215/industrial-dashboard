import { usePlcStore } from '../store/usePlcStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { toEngineeringValue } from '../types/branded'
import { alarmLevelColor, theme } from '../styles/theme'
import type { AlarmThreshold, AlarmLevel, ConnectionStatus } from '../types/domain'
import type { PlcRawValue } from '../types/branded'

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

export type QuantityType = 'temp' | 'press' | 'flow' | 'generic'

interface MetricCardProps {
  label: string
  plcId: string
  address: number
  scale?: number
  unit?: string
  quantityType?: QuantityType
  threshold?: AlarmThreshold
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  plcId,
  address,
  scale = 1,
  unit = '',
  quantityType = 'generic',
  threshold,
}) => {
  const raw = usePlcStore((s) => s.values[plcId]?.[address])
  const status = usePlcStore((s) => s.connectionStatuses[plcId] ?? 'disconnected')
  const storedThreshold = useAlarmStore((s) =>
    threshold
      ? (s.thresholds.find(
          (t) => t.plcId === threshold.plcId && t.address === threshold.address,
        ) ?? threshold)
      : undefined,
  )
  const activeThreshold = storedThreshold ?? threshold

  // [Axiom 2] forward-computed each render — never stored in state
  const alarmLevel =
    raw !== undefined && activeThreshold
      ? computeCurrentAlarmLevel(raw, activeThreshold)
      : null

  const isAlarm = alarmLevel !== null
  const alertColor = isAlarm ? alarmLevelColor[alarmLevel] : theme.quantity[quantityType]

  const displayValue =
    raw !== undefined
      ? toEngineeringValue(raw, scale).toFixed(scale < 1 ? 1 : 0)
      : '---'

  return (
    <div
      style={{
        flex: '1 1 320px',
        background: theme.bgCard,
        border: `1px solid ${isAlarm ? alertColor : theme.border}`,
        borderRadius: 4,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        // [Axiom 3] fixed height — zero layout jitter regardless of content or alarm state
        height: 150,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isAlarm ? `0 0 15px ${alertColor}20` : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* left accent bar: quantity color in normal state, alarm color on fault */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: alertColor,
        }}
      />

      {/* row 1: address metadata + connection status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: theme.textMuted,
              fontFamily: theme.fontMono,
              background: '#1E293B',
              padding: '2px 6px',
              borderRadius: 2,
            }}
          >
            {plcId}
          </span>
          <span style={{ fontSize: 11, fontFamily: theme.fontMono, color: theme.text, opacity: 0.8 }}>
            D{address}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, fontFamily: theme.fontMono, color: theme.textMuted }}>
            {status.toUpperCase()}
          </span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: statusDotColor[status],
              boxShadow: status === 'connected' ? `0 0 6px ${theme.normal}` : 'none',
            }}
          />
        </div>
      </div>

      {/* row 2: primary value + label — maximum jump rate */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            // ISA-101: white in normal state, alarm color only on fault
            color: isAlarm ? alertColor : theme.text,
            fontFamily: theme.fontMono,
            letterSpacing: '-2px',
            lineHeight: 1,
          }}
        >
          {displayValue}
          {unit && (
            <span
              style={{
                fontSize: 14,
                marginLeft: 4,
                fontWeight: 500,
                color: theme.textMuted,
                fontFamily: 'sans-serif',
              }}
            >
              {unit}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.text,
            opacity: 0.7,
            textAlign: 'right',
            maxWidth: 140,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={label}
        >
          {label}
        </div>
      </div>

      {/* row 3: raw value + alarm badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${theme.border}`,
          paddingTop: 8,
          fontSize: 10,
          fontFamily: theme.fontMono,
          color: theme.textMuted,
        }}
      >
        <div>
          RAW_VAL: <span style={{ color: theme.text, fontWeight: 600 }}>{raw !== undefined ? String(raw) : '---'}</span>
        </div>
        {isAlarm ? (
          <span
            style={{
              background: `${alertColor}15`,
              color: alertColor,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 2,
              border: `1px solid ${alertColor}30`,
              letterSpacing: '0.5px',
            }}
          >
            ! STATE: {alarmLevel}
          </span>
        ) : (
          <span style={{ color: theme.textMuted, opacity: 0.5 }}>* STATUS_OK</span>
        )}
      </div>
    </div>
  )
}
