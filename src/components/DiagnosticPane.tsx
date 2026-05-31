import { useMemo, useState } from 'react'
import { useAlarmStore } from '../store/useAlarmStore'
import { ALARM_SEVERITY } from '../types/domain'
import type { AlarmLevel, PlcConfig } from '../types/domain'
import { theme, alarmLevelColor } from '../styles/theme'
import { TouchButton } from './TouchButton'
import { PanelHeader } from './PanelHeader'
import { WatchWindow } from './WatchWindow'

type PaneTab = 'ALARMS' | 'OUTPUT' | 'WATCH'

const levelLabel: Record<AlarmLevel, string> = {
  HH: 'High-High',
  H: 'High',
  L: 'Low',
  LL: 'Low-Low',
}

interface DiagnosticPaneProps {
  isMobile?: boolean
  height?: number
  plcConfig?: PlcConfig
  defaultPlcId?: string
}

export const DiagnosticPane: React.FC<DiagnosticPaneProps> = ({
  isMobile,
  height,
  plcConfig,
  defaultPlcId,
}) => {
  const [activeTab, setActiveTab] = useState<PaneTab>('ALARMS')
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

  const paneHeight = height ?? (isMobile ? 160 : 200)
  const hasAlarms = activeAlarms.length > 0

  return (
    <div
      style={{
        height: paneHeight,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: theme.bgCard,
        borderTop: `1px solid ${theme.border}`,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <PanelHeader title="PROBLEMS" isMobile={isMobile} />

      {/* IDE-style tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
          height: 28,
          paddingLeft: 8,
          background: theme.bg,
        }}
      >
        {(['ALARMS', 'OUTPUT', 'WATCH'] as PaneTab[]).map((tab) => {
          const isActive = activeTab === tab
          const tabAccent =
            tab === 'ALARMS' && hasAlarms ? theme.critical : theme.accent
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? `2px solid ${tabAccent}`
                  : '2px solid transparent',
                color: isActive ? theme.text : theme.textMuted,
                cursor: 'pointer',
                fontSize: theme.fs.xs,
                fontFamily: theme.fontMono,
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: '100%',
              }}
            >
              {tab}
              {tab === 'ALARMS' && hasAlarms && (
                <span
                  style={{
                    background: theme.critical,
                    color: '#0F1114',
                    fontSize: theme.fs.xs,
                    fontWeight: 700,
                    padding: '0 5px',
                    borderRadius: 10,
                    minWidth: 16,
                    height: 16,
                    lineHeight: '16px',
                    textAlign: 'center',
                    display: 'inline-block',
                  }}
                >
                  {activeAlarms.length}
                </span>
              )}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: theme.fs.xs,
            color: theme.textMuted,
            alignSelf: 'center',
            paddingRight: 12,
            fontFamily: theme.fontMono,
          }}
        >
          {hasAlarms ? `${activeAlarms.length} active` : 'No active alarms'}
        </span>
      </div>

      {/* Pane content */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {activeTab === 'ALARMS' &&
          (!hasAlarms ? (
            <div
              style={{
                padding: '0 16px',
                color: theme.textMuted,
                fontSize: theme.fs.xs,
                fontFamily: theme.fontMono,
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                gap: 8,
              }}
            >
              <span style={{ color: theme.normal }}>&#10003;</span>
              No active alarms
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: theme.fs.xs,
                fontFamily: theme.fontMono,
              }}
            >
              <tbody>
                {activeAlarms.map((alarm) => {
                  const color = alarmLevelColor[alarm.level]
                  return (
                    <tr
                      key={alarm.id}
                      style={{
                        borderBottom: `1px solid ${theme.border}`,
                        background: `${color}0A`,
                      }}
                    >
                      <td style={{ padding: '5px 8px', width: 36 }}>
                        <span
                          style={{
                            background: color,
                            color: '#0F1114',
                            fontWeight: 700,
                            fontSize: theme.fs.xs,
                            padding: '1px 5px',
                            borderRadius: 2,
                            display: 'inline-block',
                          }}
                        >
                          {alarm.level}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          color: theme.textMuted,
                          whiteSpace: 'nowrap',
                          width: 76,
                        }}
                      >
                        {new Date(alarm.triggeredAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false,
                        })}
                      </td>
                      <td style={{ padding: '5px 8px', color: theme.text }}>
                        {alarm.plcId} D{alarm.address} = {alarm.triggerValue}{' '}
                        &mdash; {levelLabel[alarm.level]}
                      </td>
                      <td
                        style={{ padding: '5px 8px', textAlign: 'right', width: 56 }}
                      >
                        {alarm.acknowledgedAt === null ? (
                          <TouchButton
                            label="ACK"
                            variant="warning"
                            onClick={() => acknowledgeAlarm(alarm.id)}
                            style={{
                              minHeight: 22,
                              minWidth: 40,
                              fontSize: theme.fs.xs,
                              padding: '0 6px',
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              color: theme.textMuted,
                              opacity: 0.5,
                            }}
                          >
                            ACK
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ))}

        {activeTab === 'OUTPUT' && (
          <div
            style={{
              padding: '8px 16px',
              color: theme.textMuted,
              fontSize: theme.fs.xs,
              fontFamily: theme.fontMono,
              lineHeight: 1.8,
            }}
          >
            <div>
              <span style={{ color: theme.accent }}>{'>'}</span>{' '}
              <span style={{ color: theme.normal }}>
                Device configuration loaded from ~/.plc-telemetry/devices.config.json
              </span>
            </div>
            <div>
              <span style={{ color: theme.accent }}>{'>'}</span> PLC polling
              active &mdash; MELSEC MC Protocol 3E / Keyence Upper Link
            </div>
          </div>
        )}

        {activeTab === 'WATCH' && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            {plcConfig && defaultPlcId ? (
              <WatchWindow plcConfig={plcConfig} defaultPlcId={defaultPlcId} />
            ) : (
              <div
                style={{
                  padding: '16px',
                  color: theme.textMuted,
                  fontSize: theme.fs.xs,
                  fontFamily: theme.fontMono,
                }}
              >
                No PLC configuration available.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
