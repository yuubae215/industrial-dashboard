import { useState, useEffect } from 'react'
import { usePlcPolling } from '../hooks/usePlcPolling'
import { useAlarmMonitor } from '../store/useAlarmStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { usePlcConfigStore, MELSEC_PLC_ID, KEYENCE_PLC_ID } from '../store/usePlcConfigStore'
import { usePlcStore } from '../store/usePlcStore'
import { AlarmPanel } from './AlarmPanel'
import { MetricCard } from './MetricCard'
import { RealtimeTrendChart } from './RealtimeTrendChart'
import { WatchWindow } from './WatchWindow'
import { Footer } from './Footer'
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

function useCurrentTime(): string {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  )
  useEffect(() => {
    const id = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        ),
      1000,
    )
    return () => clearInterval(id)
  }, [])
  return time
}

const statusLabel: Record<string, string> = {
  connected: 'ONLINE',
  connecting: 'CONNECTING',
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

  const melsecConfig = usePlcConfigStore((s) => s.configs[MELSEC_ID])
  const keyenceConfig = usePlcConfigStore((s) => s.configs[KEYENCE_ID])
  const melsecStatus = usePlcStore((s) => s.connectionStatuses[MELSEC_ID] ?? 'disconnected')
  const keyenceStatus = usePlcStore((s) => s.connectionStatuses[KEYENCE_ID] ?? 'disconnected')

  useAlarmMonitor()

  const setThreshold = useAlarmStore((s) => s.setThreshold)
  useEffect(() => { setThreshold(MELSEC_THRESHOLD) }, [setThreshold])

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
        minHeight: '100vh',
        background: theme.bg,
        color: theme.text,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.fontMono,
      }}
    >
      <AlarmPanel />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          style={{
            padding: '12px 24px',
            background: theme.bgHeader,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: theme.fs.md, fontWeight: 700, color: theme.text, letterSpacing: '0.06em' }}>
                INDUSTRIAL REALTIME DASHBOARD
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: theme.fs.sm, color: theme.textMuted, letterSpacing: '0.02em' }}>
                MC Protocol 3E Frame &mdash; {INTERVAL_MS}ms polling
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: theme.sp[1] }}>
              <span style={{ fontSize: theme.fs.lg, fontFamily: theme.fontMono, color: theme.accent, fontWeight: 700, letterSpacing: '0.04em' }}>
                {currentTime}
              </span>
              {/* Connection status badges */}
              <div style={{ display: 'flex', gap: theme.sp[2] }}>
                {([
                  { id: MELSEC_ID, label: 'MELSEC', status: melsecStatus },
                  { id: KEYENCE_ID, label: 'KV', status: keyenceStatus },
                ] as const).map(({ id, label, status }) => (
                  <span
                    key={id}
                    style={{
                      fontSize: theme.fs.xs,
                      fontFamily: theme.fontMono,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 3,
                      border: `1px solid ${statusColor[status]}`,
                      color: statusColor[status],
                      letterSpacing: '0.06em',
                    }}
                  >
                    {label}: {statusLabel[status] ?? status.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Metrics */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: theme.fs.xs, fontWeight: 700, color: theme.textMuted, letterSpacing: '0.1em' }}>
                LIVE METRICS
              </span>
              <div style={{ flex: 1, height: 1, background: theme.border }} />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              <MetricCard
                label="Mitsubishi MELSEC — Line A Furnace"
                plcId={MELSEC_ID}
                address={START_ADDRESS}
                scale={0.1}
                unit="degC"
                quantityType="temp"
                threshold={MELSEC_THRESHOLD}
              />
              <MetricCard
                label="Keyence KV — Line B"
                plcId={KEYENCE_ID}
                address={START_ADDRESS}
                scale={1}
                quantityType="generic"
              />
            </div>
          </section>

          {/* Trend chart */}
          {isTrendVisible && (
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: theme.fs.xs, fontWeight: 700, color: theme.textMuted, letterSpacing: '0.1em' }}>
                  REALTIME TREND
                </span>
                <span style={{ fontSize: 10, color: theme.textMuted }}>
                  {MELSEC_ID} D{START_ADDRESS}
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

          {/* Debug watch window (maintenance mode only) */}
          <WatchWindow plcConfig={melsecConfig} defaultPlcId={MELSEC_ID} />
        </div>
      </main>

      <Footer
        onTrendToggle={() => setIsTrendVisible((v) => !v)}
        isTrendVisible={isTrendVisible}
        onSettingsOpen={() => setIsSettingsOpen(true)}
      />

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
