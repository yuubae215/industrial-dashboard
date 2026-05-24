import { useState, useEffect } from 'react'
import { usePlcPolling } from '../hooks/usePlcPolling'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAlarmMonitor } from '../store/useAlarmStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { usePlcConfigStore, MELSEC_PLC_ID, KEYENCE_PLC_ID } from '../store/usePlcConfigStore'
import { useDeviceConfig } from '../hooks/useDeviceConfig'
import { RealtimeTrendChart } from './RealtimeTrendChart'
import { WatchWindow } from './WatchWindow'
import { LeftSidebar } from './LeftSidebar'
import type { PlcHierarchyNode } from './LeftSidebar'
import { FixedControlSlots } from './FixedControlSlots'
import { DiagnosticPane } from './DiagnosticPane'
import { StatusBar } from './StatusBar'
import { ConnectionSettings } from './ConnectionSettings'
import { MenuBar } from './MenuBar'
import { theme } from '../styles/theme'
import { POLLING_INTERVAL_MS } from '../config/plc'

const MELSEC_ID = MELSEC_PLC_ID
const KEYENCE_ID = KEYENCE_PLC_ID
const START_ADDRESS = 1000
const READ_COUNT = 5
const INTERVAL_MS = POLLING_INTERVAL_MS

// PLC network hierarchy for left sidebar
const PLC_NODES: PlcHierarchyNode[] = [
  {
    plcId: MELSEC_ID,
    label: 'MELSEC Q-Series',
    protocolLabel: 'MC Protocol 3E Frame',
  },
  {
    plcId: KEYENCE_ID,
    label: 'Keyence KV-8000',
    protocolLabel: 'Upper Link',
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

export const Dashboard: React.FC = () => {
  const [isTrendVisible, setIsTrendVisible] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const isMobile = useIsMobile()

  const melsecConfig = usePlcConfigStore((s) => s.configs[MELSEC_ID])
  const keyenceConfig = usePlcConfigStore((s) => s.configs[KEYENCE_ID])
  const activeAlarmCount = useAlarmStore((s) => s.entries.filter((e) => e.clearedAt === null).length)

  useAlarmMonitor()
  useDeviceConfig()

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
      className="viewport-lock"
      style={{
        background: theme.bg,
        color: theme.text,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.fontMono,
        overflow: 'hidden',
      }}
    >
      {/* ── GX Works-style IDE menu bar — desktop only (28px) ─── */}
      {!isMobile && <MenuBar />}

      {/* ── Title bar / Header ───────────────────────────────── */}
      <header
        style={{
          flexShrink: 0,
          height: isMobile ? 48 : 36,
          padding: isMobile ? '0 12px' : '0 20px',
          background: theme.bgHeader,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 8 : 16,
          minWidth: 0,
        }}
      >
        {/* App title — mobile: full title; desktop: compact subtitle only (window title bar has app name) */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0, flexShrink: 1 }}>
          <span
            style={{
              fontSize: isMobile ? theme.fs.sm : theme.fs.xs,
              fontWeight: isMobile ? 700 : 400,
              color: isMobile ? theme.text : theme.textMuted,
              letterSpacing: isMobile ? '0.06em' : '0.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isMobile ? 'INDUSTRIAL DASHBOARD' : `MC Protocol 3E — ${INTERVAL_MS}ms`}
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
              flexShrink: 0,
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
            <span style={{ fontSize: theme.fs.xs, fontWeight: 700, color: theme.critical, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              {activeAlarmCount} ALARM{activeAlarmCount !== 1 ? 'S' : ''}
            </span>
          </div>
        )}

        {/* Clock — mobile: clock only; desktop: clock (status moved to MenuBar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span
            style={{
              fontSize: isMobile ? theme.fs.sm : theme.fs.base,
              fontFamily: theme.fontMono,
              color: theme.accent,
              fontWeight: 700,
              letterSpacing: '0.04em',
              minWidth: isMobile ? 56 : 68,
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
        {/* Desktop only: left sidebar (PLC tree + icon toolbar at top) */}
        {!isMobile && (
          <LeftSidebar
            nodes={PLC_NODES}
            toolbar={
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
            <section style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: theme.fs.xs, fontWeight: 700, color: theme.textMuted, letterSpacing: '0.1em' }}>
                  REALTIME TREND
                </span>
                <span style={{ fontSize: theme.fs.xs, color: theme.textMuted }}>
                  Watch Window active signals &mdash; last 60s
                </span>
                <div style={{ flex: 1, height: 1, background: theme.border }} />
              </div>
              <RealtimeTrendChart />
            </section>
          )}

          <WatchWindow plcConfig={melsecConfig} defaultPlcId={MELSEC_ID} />
        </main>

      </div>

      {/* ── Diagnostic pane — IDE-style bottom Output / Alarms window ─── */}
      <DiagnosticPane isMobile={isMobile} />

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
          isMobile={isMobile}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  )
}
