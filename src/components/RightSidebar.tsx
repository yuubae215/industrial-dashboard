import { useMemo } from 'react'
import { useAlarmStore } from '../store/useAlarmStore'
import { ALARM_SEVERITY } from '../types/domain'
import type { AlarmLevel } from '../types/domain'
import { theme, alarmLevelColor } from '../styles/theme'
import { TouchButton } from './TouchButton'
import { PanelHeader } from './PanelHeader'

const levelLabel: Record<AlarmLevel, string> = {
  HH: 'High-High',
  H: 'High',
  L: 'Low',
  LL: 'Low-Low',
}

interface RightSidebarProps {
  width?: number
  style?: React.CSSProperties
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ width = 260, style }) => {
  const entries = useAlarmStore((s) => s.entries)
  const acknowledgeAlarm = useAlarmStore((s) => s.acknowledgeAlarm)

  const activeAlarms = useMemo(
    () =>
      entries
        .filter((e) => e.clearedAt === null)
        .sort(
          (a, b) =>
            ALARM_SEVERITY[b.level] - ALARM_SEVERITY[a.level] ||
            a.triggeredAt - b.triggeredAt,
        ),
    [entries],
  )

  const hasAlarms = activeAlarms.length > 0

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: theme.bgCard,
        borderLeft: `1px solid ${theme.border}`,
        overflow: 'hidden',
        ...style,
      }}
    >
      <PanelHeader
        title="ACTIVE ALARMS"
        badge={activeAlarms.length}
        badgeColor={theme.critical}
      />

      {/* Alarm list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!hasAlarms ? (
          <div
            style={{
              padding: '32px 14px',
              textAlign: 'center',
              color: theme.textMuted,
              fontSize: theme.fs.sm,
              fontFamily: theme.fontMono,
              letterSpacing: '0.06em',
            }}
          >
            NO ACTIVE ALARMS
          </div>
        ) : (
          activeAlarms.map((alarm) => {
            const color = alarmLevelColor[alarm.level]
            return (
              <div
                key={alarm.id}
                style={{
                  padding: '9px 14px',
                  borderBottom: `1px solid ${theme.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      background: color,
                      color: '#0F1114',
                      fontWeight: 700,
                      fontSize: theme.fs.xs,
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontFamily: theme.fontMono,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {alarm.level}
                  </span>
                  <span
                    style={{
                      color: theme.textMuted,
                      fontSize: theme.fs.xs,
                      fontFamily: theme.fontMono,
                    }}
                  >
                    {new Date(alarm.triggeredAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })}
                  </span>
                  <div style={{ flex: 1 }} />
                  {alarm.acknowledgedAt === null ? (
                    <TouchButton
                      label="ACK"
                      variant="warning"
                      onClick={() => acknowledgeAlarm(alarm.id)}
                      style={{ minHeight: 28, minWidth: 44, fontSize: theme.fs.xs, padding: '0 8px' }}
                    />
                  ) : (
                    <span
                      style={{
                        color: theme.textMuted,
                        fontSize: theme.fs.xs,
                        fontFamily: theme.fontMono,
                        opacity: 0.6,
                      }}
                    >
                      ACK
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: theme.fs.sm,
                    fontFamily: theme.fontMono,
                    color: theme.text,
                  }}
                >
                  {alarm.plcId} D{alarm.address} = {alarm.triggerValue}
                </div>
                <div
                  style={{
                    fontSize: theme.fs.xs,
                    color: theme.textMuted,
                    fontFamily: theme.fontMono,
                  }}
                >
                  {levelLabel[alarm.level]}
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
