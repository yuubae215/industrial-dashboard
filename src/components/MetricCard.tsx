import { usePlcStore } from '../store/usePlcStore'
import { useSignalConfigStore } from '../store/useSignalConfigStore'
import { toEngineeringValue } from '../types/branded'
import { alarmLevelColor, theme } from '../styles/theme'
import type { AlarmLevel, ConnectionStatus } from '../types/domain'
import type { SignalConfig } from '../store/useSignalConfigStore'
import type { PlcRawValue } from '../types/branded'

export function computeCurrentAlarmLevel(
  raw: PlcRawValue,
  config: SignalConfig,
): AlarmLevel | null {
  if (config.HH !== undefined && raw >= config.HH) return 'HH'
  if (config.H  !== undefined && raw >= config.H)  return 'H'
  if (config.LL !== undefined && raw <= config.LL) return 'LL'
  if (config.L  !== undefined && raw <= config.L)  return 'L'
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
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  plcId,
  address,
  scale = 1,
  unit = '',
  quantityType = 'generic',
}) => {
  const raw = usePlcStore((s) => s.values[plcId]?.[address])
  const status = usePlcStore((s) => s.connectionStatuses[plcId] ?? 'disconnected')
  const signalConfig = useSignalConfigStore(
    (s) => s.configs.find((c) => c.plcId === plcId && c.address === address),
  )

  // [Axiom 2] forward-computed each render — never stored in state
  const alarmLevel =
    raw !== undefined && signalConfig
      ? computeCurrentAlarmLevel(raw, signalConfig)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.sp[2] }}>
          <span
            style={{
              fontSize: theme.fs.xs,
              fontWeight: 700,
              color: theme.textMuted,
              fontFamily: theme.fontMono,
              background: theme.border,
              padding: '2px 6px',
              borderRadius: 2,
              letterSpacing: '0.04em',
            }}
          >
            {plcId}
          </span>
          <span style={{ fontSize: theme.fs.sm, fontFamily: theme.fontMono, color: theme.text, opacity: 0.7 }}>
            D{address}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: theme.fs.xs, fontFamily: theme.fontMono, color: theme.textMuted, letterSpacing: '0.06em' }}>
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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.sp[2] }}>
        <div
          style={{
            fontSize: theme.fs.xl,
            fontWeight: 700,
            // ISA-101: white in normal state, alarm color only on fault
            color: isAlarm ? alertColor : theme.text,
            fontFamily: theme.fontMono,
            letterSpacing: '-0.5px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {displayValue}
          {unit && (
            <span
              style={{
                fontSize: theme.fs.base,
                marginLeft: 6,
                fontWeight: 400,
                color: theme.textMuted,
                fontFamily: theme.fontMono,
                letterSpacing: 0,
              }}
            >
              {unit}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: theme.fs.base,
            fontWeight: 500,
            color: theme.text,
            opacity: 0.6,
            textAlign: 'right',
            minWidth: 0,
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
          paddingTop: theme.sp[2],
          fontSize: theme.fs.xs,
          fontFamily: theme.fontMono,
          color: theme.textMuted,
        }}
      >
        <div>
          RAW <span style={{ color: theme.text, fontWeight: 600 }}>{raw !== undefined ? String(raw) : '---'}</span>
        </div>
        {isAlarm ? (
          <span
            style={{
              background: `${alertColor}18`,
              color: alertColor,
              fontWeight: 700,
              fontSize: theme.fs.xs,
              padding: '2px 6px',
              borderRadius: 2,
              border: `1px solid ${alertColor}40`,
              letterSpacing: '0.06em',
            }}
          >
            {alarmLevel}
          </span>
        ) : (
          <span style={{ color: theme.textMuted, opacity: 0.4 }}>OK</span>
        )}
      </div>
    </div>
  )
}
