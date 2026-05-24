import { useState, useEffect } from 'react'
import { usePlcPolling } from '../hooks/usePlcPolling'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAlarmMonitor } from '../store/useAlarmStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { usePlcConfigStore, MELSEC_PLC_ID, KEYENCE_PLC_ID } from '../store/usePlcConfigStore'
import { usePlcStore } from '../store/usePlcStore'
import { RealtimeTrendChart } from './RealtimeTrendChart'
import { WatchWindow } from './WatchWindow'
import { LeftSidebar } from './LeftSidebar'
import type { PlcHierarchyNode } from './LeftSidebar'
import { FixedControlSlots } from './FixedControlSlots'
import { RightSidebar } from './RightSidebar'
import { StatusBar } from './StatusBar'
import { ConnectionSettings } from './ConnectionSettings'
import { theme } from '../styles/theme'
import { asThresholdValue } from '../types/branded'
import type { AlarmThreshold } from '../types/domain'
import { POLLING_INTERVAL_MS } from '../config/plc'

const MELSEC_ID = MELSEC_PLC_ID
const KEYENCE_ID = KEYENCE_PLC_ID
const START_ADDRESS = 1000
const READ_COUNT = 5
const INTERVAL_MS = POLLING_INTERVAL_MS

const MELSEC_THRESHOLD: AlarmThreshold = {
  plcId: MELSEC_ID,
  address: START_ADDRESS,
  label: 'Mitsubishi Line A Furnace Temp',
  unit: 'degC',
  HH: asThresholdValue(2500),
  H: asThresholdValue(2000),
  L: asThresholdValue(500),
  LL: asThresholdValue(200),
}

// PLC network hierarchy for left sidebar
const PLC_NODES: PlcHierarchyNode[] = [
  {
    plcId: MELSEC_ID,
    label: 'MELSEC Q-Series',
    protocolLabel: 'MC Protocol 3E Frame',
    device: 'D',
    startAddress: START_ADDRESS,
    count: READ_COUNT,
  },
  {
    plcId: KEYENCE_ID,
    label: 'Keyence KV-8000',
    protocolLabel: 'Upper Link',
    device: 'DM',
    startAddress: START_ADDRESS,
    count: READ_COUNT,
  },
]

function useCurrentTime(): string {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  )
  useEffect(() => {
    const id = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
        ),
      1000,
    )
    return () => clearInterval(id)
  }, [])
  return time
}

const statusLabel: Record<string, string> = {
  connected: 'ONLINE',
  connecting: 'CONNECTING...',
  disconnected: 'OFFLINE',
  timeout: 'TIMEOUT',
  error: 'ERROR',
}

const statusColor: Record<string, string> = {
  connected: theme.normal,
  connecting: theme.warning,
  disconnected: theme.border,
  timeout: theme.warning,
  error: theme.critical,
}

export const Dashboard: React.FC = () => {
  const [isTrendVisible, setIsTrendVisible] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const isMobile = useIsMobile()

  const melsecConfig = usePlcConfigStore((s) => s.configs[MELSEC_ID])
  const keyenceConfig = usePlcConfigStore((s) => s.configs[KEYENCE_ID])
  const melsecStatus = usePlcStore((s) => s.connectionStatuses[MELSEC_ID] ?? 'disconnected')
  const keyenceStatus = usePlcStore((s) => s.connectionStatuses[KEYENCE_ID] ?? 'disconnected')
  const activeAlarmCount = useAlarmStore((s) => s.entries.filter((e) => e.clearedAt === null).length)

  useAlarmMonitor()

  const setThreshold = useAlarmStore((s) => s.setThreshold)
  useEffect(() => {
    setThreshold(MELSEC_THRESHOLD)
  }, [setThreshold])

  usePlcPolling({
    plcId: MELSEC_ID,
    config: melsecConfig,
    protocol: 'mitsubishi',
    device: 'D',
    startAddress: START_ADDRESS,
    count: READ_COUNT,
    intervalMs: INTERVAL_MS,
  })
  usePlcPolling({
    plcId: KEYENCE_ID,
    config: keyenceConfig,
    protocol: 'keyence',
    device: 'DM',
    startAddress: START_ADDRESS,
    count: READ_COUNT,
    intervalMs: INTERVAL_MS,
  })

  const currentTime = useCurrentTime()

  return (
    <div
      style={{
        height: '100vh',
        background: theme.bg,
        color: theme.text,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.fontMono,
        overflow: 'hidden',
      }}
    >
      {/* ── Title bar / Header ────────────────────────────────── */}
      <header
        style={{
          flexShrink: 0,
          height: 48,
          padding: '0 20px',
          background: theme.bgHeader,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* App title */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: theme.fs.md, fontWeight: 700, color: theme.text, letterSpacing: '0.06em' }}>
            INDUSTRIAL DASHBOARD
          </span>
          <span style={{ fontSize: theme.fs.xs, color: theme.textMuted, letterSpacing: '0.04em' }}>
            MC Protocol 3E &mdash; {INTERVAL_MS}ms
          </span>
        </div>

        {/* Active alarm chip */}
        {activeAlarmCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 3,
              background: `${theme.critical}20`,
              border: `1px solid ${theme.critical}`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: theme.critical,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: theme.fs.xs, fontWeight: 700, color: theme.critical, letterSpacing: '0.08em' }}>
              {activeAlarmCount} ACTIVE ALARM{activeAlarmCount !== 1 ? 'S' : ''}
            </span>
          </div>
        )}

        {/* Connection badges + clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(
              [
                { id: MELSEC_ID, label: 'MELSEC', status: melsecStatus },
                { id: KEYENCE_ID, label: 'KV', status: keyenceStatus },
              ] as const
            ).map(({ id, label, status }) => (
              <span
                key={id}
                style={{
                  fontSize: theme.fs.xs,
                  fontFamily: theme.fontMono,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 3,
                  border: `1px solid ${statusColor[status]}`,
                  color: statusColor[status],
                  letterSpacing: '0.05em',
                }}
              >
                {label}: {statusLabel[status] ?? status.toUpperCase()}
              </span>
            ))}
          </div>
          <span
            style={{
              fontSize: theme.fs.base,
              fontFamily: theme.fontMono,
              color: theme.accent,
              fontWeight: 700,
              letterSpacing: '0.04em',
              minWidth: 68,
              textAlign: 'right',
            }}
          >
            {currentTime}
          </span>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────── */}
      {/* ADR-008: desktop = 3-column row; mobile = single column */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Desktop only: left sidebar (PLC tree + fixed control slots at bottom) */}
        {!isMobile && (
          <LeftSidebar
            nodes={PLC_NODES}
            footer={
              <FixedControlSlots
                layout="vertical"
                isTrendVisible={isTrendVisible}
                onTrendToggle={() => setIsTrendVisible((v) => !v)}
                onSettingsOpen={() => setIsSettingsOpen(true)}
              />
            }
          />
        )}

        {/* Main content area */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '12px 16px' : '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {isTrendVisible && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: theme.fs.xs, fontWeight: 700, color: theme.textMuted, letterSpacing: '0.1em' }}>
                  REALTIME TREND
                </span>
                <span style={{ fontSize: theme.fs.xs, color: theme.textMuted }}>
                  {MELSEC_ID} D{START_ADDRESS} &mdash; last 60s
                </span>
                <div style={{ flex: 1, height: 1, background: theme.border }} />
              </div>
              <RealtimeTrendChart
                plcId={MELSEC_ID}
                address={START_ADDRESS}
                scale={0.1}
                unit="degC"
                threshold={MELSEC_THRESHOLD}
              />
            </section>
          )}

          <WatchWindow plcConfig={melsecConfig} defaultPlcId={MELSEC_ID} />
        </main>

        {/* Desktop only: right sidebar (alarm panel, full height) */}
        {!isMobile && <RightSidebar />}
      </div>

      {/* Mobile only: compact alarm panel above footer slots */}
      {isMobile && (
        <div
          style={{
            height: 140,
            flexShrink: 0,
            borderTop: `1px solid ${theme.border}`,
            overflowY: 'auto',
          }}
        >
          <RightSidebar />
        </div>
      )}

      {/* ── Footer / Status bar ───────────────────────────────── */}
      {/* ADR-008: mobile = horizontal 4-slot footer; desktop = slim status bar */}
      {isMobile ? (
        <FixedControlSlots
          layout="horizontal"
          isTrendVisible={isTrendVisible}
          onTrendToggle={() => setIsTrendVisible((v) => !v)}
          onSettingsOpen={() => setIsSettingsOpen(true)}
        />
      ) : (
        <StatusBar tagCount={READ_COUNT * 2} />
      )}

      {isSettingsOpen && (
        <ConnectionSettings
          plcs={[
            { plcId: MELSEC_ID, label: 'Mitsubishi MELSEC' },
            { plcId: KEYENCE_ID, label: 'Keyence KV' },
          ]}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  )
}
