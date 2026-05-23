import { useMemo } from 'react'
import { useAlarmStore } from '../store/useAlarmStore'
import { ALARM_SEVERITY } from '../types/domain'
import type { AlarmLevel } from '../types/domain'
import { theme, alarmLevelColor } from '../styles/theme'
import { TouchButton } from './TouchButton'

const levelLabel: Record<AlarmLevel, string> = {
  HH: '上限限界', H: '上限', L: '下限', LL: '下限限界',
}

export const AlarmPanel: React.FC = () => {
  const entries = useAlarmStore((s) => s.entries)
  const acknowledgeAlarm = useAlarmStore((s) => s.acknowledgeAlarm)

  // 発生中（未復旧）のアラームを重篤度順にソート（毎回純粋算出 — [公理2]）
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

  if (activeAlarms.length === 0) return null

  return (
    <div
      style={{
        background: theme.bgHeader,
        borderBottom: `3px solid ${theme.critical}`,
        padding: '8px 16px',
      }}
    >
      {activeAlarms.map((alarm) => {
        const color = alarmLevelColor[alarm.level]
        return (
          <div
            key={alarm.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '4px 0',
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <span
              style={{
                background: color,
                color: '#0F1114',
                fontWeight: 700,
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 3,
                fontFamily: theme.fontMono,
                minWidth: 30,
                textAlign: 'center',
              }}
            >
              {alarm.level}
            </span>
            <span style={{ color: theme.textMuted, fontSize: 12, fontFamily: theme.fontMono }}>
              {new Date(alarm.triggeredAt).toLocaleTimeString()}
            </span>
            <span style={{ color: theme.text, flex: 1, fontFamily: theme.fontMono, fontSize: 13 }}>
              {alarm.plcId} D{alarm.address} = {alarm.triggerValue}
              <span style={{ color: theme.textMuted, marginLeft: 8 }}>
                [{levelLabel[alarm.level]}]
              </span>
            </span>
            {alarm.acknowledgedAt === null ? (
              <TouchButton
                label="確認"
                variant="warning"
                onClick={() => acknowledgeAlarm(alarm.id)}
                style={{ minHeight: 36, minWidth: 60, fontSize: 12 }}
              />
            ) : (
              <span style={{ color: theme.textMuted, fontSize: 11, fontFamily: theme.fontMono }}>
                確認済
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
