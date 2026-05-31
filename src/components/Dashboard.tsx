import { useState, useCallback, useEffect, useRef } from 'react'
import { usePlcPolling } from '../hooks/usePlcPolling'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAlarmMonitor } from '../store/useAlarmStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { usePlcConfigStore, MELSEC_PLC_ID, KEYENCE_PLC_ID } from '../store/usePlcConfigStore'
import { useDeviceConfig } from '../hooks/useDeviceConfig'
import { RealtimeTrendChart } from './RealtimeTrendChart'
import { LeftSidebar } from './LeftSidebar'
import type { PlcHierarchyNode } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { FixedControlSlots } from './FixedControlSlots'
import { DiagnosticPane } from './DiagnosticPane'
import { StatusBar } from './StatusBar'
import { ConnectionSettings } from './ConnectionSettings'
import { MenuBar } from './MenuBar'
import { ActivityBar } from './ActivityBar'
import { Toolbar } from './Toolbar'
import { ResizableSplitter } from './ResizableSplitter'
import { theme } from '../styles/theme'
import { POLLING_INTERVAL_MS } from '../config/plc'

// 設定自動記憶とファイル選択用インポート
import { useApiTestStore, ApiEndpoint } from '../store/useApiTestStore'
import { open as openDialog } from '@tauri-apps/plugin-dialog'

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
  const [isApiTestOpen, setIsApiTestOpen] = useState(false)
  const [isPollingActive, setIsPollingActive] = useState(false)
  const [activityView, setActivityView] = useState('explorer')
  const [leftWidth, setLeftWidth] = useState(220)
  const [rightWidth, setRightWidth] = useState(260)
  const [diagHeight, setDiagHeight] = useState(200)
  const isMobile = useIsMobile()

  const handleResizeLeft = useCallback((delta: number) => {
    setLeftWidth((w) => Math.max(120, Math.min(400, w + delta)))
  }, [])

  const handleResizeRight = useCallback((delta: number) => {
    setRightWidth((w) => Math.max(160, Math.min(500, w - delta)))
  }, [])

  const handleResizeDiag = useCallback((delta: number) => {
    setDiagHeight((h) => Math.max(80, Math.min(400, h - delta)))
  }, [])

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
    enabled: isPollingActive,
  })
  usePlcPolling({
    plcId: KEYENCE_ID,
    config: keyenceConfig,
    protocol: 'keyence',
    device: 'DM',
    startAddress: START_ADDRESS,
    count: READ_COUNT,
    intervalMs: INTERVAL_MS,
    enabled: isPollingActive,
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

      {/* ── Toolbar — desktop only (28px) ───────────────────── */}
      {!isMobile && (
        <Toolbar
          isPollingActive={isPollingActive}
          onConnect={() => setIsPollingActive(true)}
          onDisconnect={() => setIsPollingActive(false)}
          onSettingsOpen={() => setIsSettingsOpen(true)}
          isTrendVisible={isTrendVisible}
          onTrendToggle={() => setIsTrendVisible((v) => !v)}
        />
      )}

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
        {/* App title */}
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

        {/* Clock & API TEST triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* APIテスト起動ボタン */}
          <button
            onClick={() => setIsApiTestOpen(true)}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.accent}`,
              borderRadius: 3,
              color: theme.accent,
              padding: '2px 8px',
              fontSize: theme.fs.xs,
              fontFamily: theme.fontMono,
              cursor: 'pointer',
              fontWeight: 'bold',
              letterSpacing: '0.04em',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${theme.accent}22`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ⚡ API TEST
          </button>

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

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {!isMobile && (
          <ActivityBar activeView={activityView} onViewChange={setActivityView} />
        )}

        {!isMobile && (
          <LeftSidebar
            nodes={PLC_NODES}
            width={leftWidth}
            isMobile={isMobile}
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

        {!isMobile && (
          <ResizableSplitter
            orientation="vertical"
            onResize={handleResizeLeft}
            isMobile={isMobile}
          />
        )}

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '12px 16px' : '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minWidth: 0,
          }}
        >
          {isTrendVisible && (
            <section style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: theme.fs.xs, fontWeight: 700, color: theme.textMuted, letterSpacing: '0.1em' }}>
                  REALTIME TREND
                </span>
                <span style={{ fontSize: theme.fs.xs, color: theme.textMuted }}>
                  Active signals — last 60s
                </span>
                <div style={{ flex: 1, height: 1, background: theme.border }} />
              </div>
              <RealtimeTrendChart />
            </section>
          )}

          {!isTrendVisible && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
                color: theme.textMuted,
                fontSize: theme.fs.sm,
                fontFamily: theme.fontMono,
                letterSpacing: '0.06em',
              }}
            >
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={0.3}>
                <polyline points="2,18 8,10 13,14 20,4" />
                <line x1="2" y1="22" x2="22" y2="22" />
              </svg>
              <span style={{ opacity: 0.5 }}>Click TREND in the toolbar to show realtime chart</span>
            </div>
          )}
        </main>

        {!isMobile && (
          <ResizableSplitter
            orientation="vertical"
            onResize={handleResizeRight}
            isMobile={isMobile}
          />
        )}

        {!isMobile && (
          <RightSidebar width={rightWidth} />
        )}
      </div>

      {/* ── Diagnostic pane ─── */}
      {!isMobile && (
        <ResizableSplitter
          orientation="horizontal"
          onResize={handleResizeDiag}
          isMobile={isMobile}
        />
      )}
      <DiagnosticPane
        isMobile={isMobile}
        height={isMobile ? undefined : diagHeight}
        plcConfig={melsecConfig}
        defaultPlcId={MELSEC_ID}
      />

      {/* ── Footer / Status bar ── */}
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

      {/* 接続テストモーダル */}
      {isApiTestOpen && (
        <ApiTestModal 
          isMobile={isMobile} 
          onClose={() => setIsApiTestOpen(false)} 
        />
      )}
    </div>
  )
}

// ── 接続テストモーダルコンポーネント（動的構造解析可視化搭載） ──

interface ApiTestModalProps {
  isMobile: boolean
  onClose: () => void
}

const ApiTestModal: React.FC<ApiTestModalProps> = ({ onClose }) => {
  const p12Path = useApiTestStore((s) => s.p12Path)
  const setP12Path = useApiTestStore((s) => s.setP12Path)
  const url = useApiTestStore((s) => s.url)
  const setUrl = useApiTestStore((s) => s.setUrl)

  const endpoints = useApiTestStore((s) => s.endpoints)
  const setEndpoints = useApiTestStore((s) => s.setEndpoints)
  const addEndpoint = useApiTestStore((s) => s.addEndpoint)
  const removeEndpoint = useApiTestStore((s) => s.removeEndpoint)
  const selectedApiPath = useApiTestStore((s) => s.selectedApiPath)
  const setSelectedApiPath = useApiTestStore((s) => s.setSelectedApiPath)
  const resetEndpoints = useApiTestStore((s) => s.resetEndpoints)

  const [isRunning, setIsRunning] = useState(false)
  const [logOutput, setLogOutput] = useState<string>('Ready to test connection...')
  const [parsedData, setParsedData] = useState<any | null>(null)
  const [outputTab, setOutputTab] = useState<'VISUAL' | 'RAW'>('VISUAL')

  const [certPassword, setCertPassword] = useState('')
  const [newPath, setNewPath] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [isAddingCustom, setIsAddingCustom] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectP12 = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'PKCS#12 Certificate', extensions: ['p12'] }]
      })
      if (selected && typeof selected === 'string') {
        setP12Path(selected)
        setLogOutput(`📁 Selected Certificate:\n${selected}`)
      }
    } catch (err) {
      console.error('Failed to open dialog:', err)
    }
  }

  const handleSchemaImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const spec = JSON.parse(text)
        const parsed: ApiEndpoint[] = []

        if (spec && typeof spec.paths === 'object') {
          for (const [path, methods] of Object.entries(spec.paths)) {
            if (methods && typeof methods === 'object') {
              if ('get' in methods) {
                const getObj = (methods as any).get
                const summary = getObj.summary || getObj.description || path
                parsed.push({ path, label: `${summary} (${path})` })
              }
            }
          }
        }

        if (parsed.length > 0) {
          setEndpoints(parsed)
          setLogOutput(`✅ Imported OpenAPI schema successfully!\nFound ${parsed.length} GET endpoints.`)
        } else {
          setLogOutput('⚠️ OpenAPI schema parsed, but no GET endpoints were found.')
        }
      } catch (err: any) {
        setLogOutput(`❌ Failed to parse OpenAPI JSON schema:\n${err.message}`)
      }
    }
    reader.readAsText(file)
  }

  const handleAddCustomPath = () => {
    const cleanPath = newPath.trim()
    if (!cleanPath.startsWith('/')) {
      alert('API Path must start with a slash (/)')
      return
    }
    const label = newLabel.trim() || `Path: ${cleanPath}`
    addEndpoint({ path: cleanPath, label })
    setSelectedApiPath(cleanPath)
    setNewPath('')
    setNewLabel('')
    setIsAddingCustom(false)
    setLogOutput(`✅ Added custom path successfully:\n${cleanPath}`)
  }

  const handleRunTest = async () => {
    if (!p12Path.trim()) {
      setLogOutput('❌ Error: Please select a .p12 certificate file.')
      return
    }
    if (!url.trim()) {
      setLogOutput('❌ Error: Please enter the Target Gateway URL.')
      return
    }
    if (!selectedApiPath) {
      setLogOutput('❌ Error: Please select or enter an API Path.')
      return
    }

    setIsRunning(true)
    setParsedData(null)
    const targetUrl = `${url.trim().replace(/\/$/, '')}${selectedApiPath}`
    setLogOutput(`⏳ Connecting to API Gateway:\n${targetUrl}\nUsing Cert: ${p12Path}`)

    try {
      const responseString = await (window as any).__TAURI_INTERNALS__.invoke('mtls_get', {
        url: targetUrl,
        certPath: p12Path.trim(),
        certPassword: certPassword,
        acceptInvalidCerts: true,
      })

      setIsRunning(false)
      setLogOutput(responseString)
      try {
        const parsed = JSON.parse(responseString)
        setParsedData(parsed)
        setOutputTab('VISUAL')
      } catch {
        setParsedData(null)
        setOutputTab('RAW')
      }
    } catch (err: any) {
      setIsRunning(false)
      setParsedData(null)
      setOutputTab('RAW')
      setLogOutput(`❌ CONNECTION FAILED\n\n[Error Detail]\n${err}`)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 16,
      }}
    >
      <style>{`
        @keyframes api-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bgCard,
          border: `1px solid ${theme.accent}`,
          borderRadius: 8,
          padding: 24,
          width: 680,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: `0 0 20px ${theme.accent}30`,
          height: '85vh',
          overflow: 'hidden',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: theme.fs.md, fontWeight: 'bold', color: theme.accent, letterSpacing: '0.05em' }}>
            ⚙️ API GATEWAY CONNECTION TEST (mTLS GET)
          </span>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
          {/* Target Host URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 'bold' }}>TARGET GATEWAY URL</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://127.0.0.1:8443"
              style={modalInputStyle}
            />
          </div>

          {/* Certificate Selection (.p12) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 'bold' }}>PKCS#12 CERTIFICATE</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={p12Path}
                placeholder="Click 'Browse...' to select .p12 file"
                style={{ ...modalInputStyle, flex: 1, background: '#07080e', cursor: 'pointer' }}
                onClick={handleSelectP12}
              />
              <button
                onClick={handleSelectP12}
                style={{
                  padding: '0 16px',
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 3,
                  color: theme.text,
                  cursor: 'pointer',
                  fontSize: theme.fs.xs,
                  fontFamily: theme.fontMono,
                }}
              >
                Browse...
              </button>
            </div>
          </div>

          {/* Certificate Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 'bold' }}>CERTIFICATE PASSWORD</span>
            <input
              type="password"
              value={certPassword}
              onChange={(e) => setCertPassword(e.target.value)}
              placeholder="Enter .p12 certificate password"
              style={modalInputStyle}
            />
          </div>

          {/* API Path with OpenAPI Importer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 'bold' }}>TARGET API PATH</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  onChange={handleSchemaImport} 
                  style={{ display: 'none' }} 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={linkButtonStyle}
                >
                  📥 Import OpenAPI...
                </button>
                {endpoints.length > 0 && (
                  <button onClick={resetEndpoints} style={linkButtonStyle}>
                    🔄 Clear List
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {endpoints.length > 0 ? (
                <select
                  value={selectedApiPath}
                  onChange={(e) => setSelectedApiPath(e.target.value)}
                  style={{ ...modalInputStyle, flex: 1 }}
                >
                  {endpoints.map((ep) => (
                    <option key={ep.path} value={ep.path}>
                      {ep.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedApiPath}
                  onChange={(e) => setSelectedApiPath(e.target.value)}
                  placeholder="e.g. /api/v1/status  (or click below to add targets)"
                  style={{ ...modalInputStyle, flex: 1 }}
                />
              )}
              {endpoints.length > 0 && (
                <button
                  onClick={() => removeEndpoint(selectedApiPath)}
                  style={{
                    padding: '0 12px',
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 3,
                    color: theme.critical,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Add custom path collapsible block */}
          <div style={{ background: '#07080e', padding: '6px 12px', borderRadius: 4, border: `1px solid ${theme.border}` }}>
            {!isAddingCustom ? (
              <button
                onClick={() => setIsAddingCustom(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.accent,
                  cursor: 'pointer',
                  fontFamily: theme.fontMono,
                  fontSize: 11,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ＋ Add Custom Target Path...
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder="Path: /api/v1/health"
                    style={{ ...modalInputStyle, background: '#0b0d13', fontSize: 11, padding: '4px 8px' }}
                  />
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Label: Health Check"
                    style={{ ...modalInputStyle, background: '#0b0d13', fontSize: 11, padding: '4px 8px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={() => setIsAddingCustom(false)}
                    style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: 11, fontFamily: theme.fontMono }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomPath}
                    style={{ background: theme.accent, border: 'none', color: '#000', borderRadius: 2, padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold', fontSize: 11, fontFamily: theme.fontMono }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Console / Output visualization area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0 }}>
          {/* Tab Selection */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, gap: 12, flexShrink: 0 }}>
            <button
              onClick={() => setOutputTab('VISUAL')}
              style={{
                ...tabHeaderStyle,
                borderBottom: outputTab === 'VISUAL' ? `2px solid ${theme.accent}` : '2px solid transparent',
                color: outputTab === 'VISUAL' ? theme.text : theme.textMuted,
              }}
            >
              📊 STRUCTURED PREVIEW (VISUAL)
            </button>
            <button
              onClick={() => setOutputTab('RAW')}
              style={{
                ...tabHeaderStyle,
                borderBottom: outputTab === 'RAW' ? `2px solid ${theme.accent}` : '2px solid transparent',
                color: outputTab === 'RAW' ? theme.text : theme.textMuted,
              }}
            >
              📄 RAW TEXT OUTPUT
            </button>
          </div>

          <div style={{ flex: 1, background: '#07080e', borderRadius: 4, border: `1px solid ${theme.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* ⏳ 通信中（ローディングスピナー）表示 */}
            {isRunning ? (
              <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  border: `3px solid ${theme.border}`,
                  borderTop: `3px solid ${theme.accent}`,
                  borderRadius: '50%',
                  animation: 'api-spin 0.8s linear infinite',
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: theme.accent, fontWeight: 'bold', letterSpacing: '0.04em' }}>
                    ESTABLISHING SECURE mTLS CONNECTION...
                  </span>
                  <span style={{ fontSize: 9, color: theme.textMuted }}>
                    Target Host: {url}
                  </span>
                </div>
              </div>
            ) : outputTab === 'RAW' ? (
              <pre
                style={{
                  padding: 12,
                  margin: 0,
                  fontSize: 11,
                  fontFamily: theme.fontMono,
                  color: logOutput.startsWith('❌') ? theme.critical : logOutput.startsWith('✅') ? theme.normal : theme.text,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                {logOutput}
              </pre>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {parsedData ? (
                  <ApiResponseVisualizer data={parsedData} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.textMuted, fontSize: 12, flexDirection: 'column', gap: 8 }}>
                    <span>⚡ No parsed data available yet.</span>
                    <span>Please enter setup and click "RUN GET REQUEST" to execute.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: `1px solid ${theme.border}`, paddingTop: 16, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 3,
              color: theme.textMuted,
              cursor: 'pointer',
              fontFamily: theme.fontMono,
              fontSize: theme.fs.xs,
            }}
          >
            Close
          </button>
          <button
            onClick={handleRunTest}
            disabled={isRunning}
            style={{
              padding: '6px 20px',
              background: isRunning ? theme.border : theme.accent,
              color: isRunning ? theme.textMuted : '#000',
              border: 'none',
              borderRadius: 3,
              fontWeight: 'bold',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontFamily: theme.fontMono,
              fontSize: theme.fs.xs,
            }}
          >
            {isRunning ? 'CONNECTING...' : 'RUN GET REQUEST'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 汎用レスポンスデータ自動構造解析（ApiResponseVisualizer） ──

const ApiResponseVisualizer: React.FC<{ data: any }> = ({ data }) => {
  // ① もしレスポンスデータそのものが配列（[ { ... }, { ... } ]）の場合
  if (data && Array.isArray(data)) {
    return <DynamicTableVisualizer list={data} title="ARRAY RESPONSE" />
  }

  // ② レスポンスがオブジェクトの場合、第1階層のプロパティをスキャンする
  if (data && typeof data === 'object') {
    const keys = Object.keys(data)

    // オブジェクトの中に「オブジェクトの配列」となるキーが1つだけ存在する場合、
    // それをメインのテーブルデータと判定して自動テーブル可視化する（例: data.skills: [] などの構造）
    const arrayKeys = keys.filter(k => Array.isArray(data[k]))
    if (arrayKeys.length === 1) {
      const mainArrayKey = arrayKeys[0]
      const label = mainArrayKey.toUpperCase()
      return <DynamicTableVisualizer list={data[mainArrayKey]} title={`${label} LIST`} />
    }

    // オブジェクトの全プロパティがプリミティブ（文字列・数値・真偽値）、
    // またはシンプルなフラット構造（キー: バリュー）の場合、プロパティ一覧テーブルとして可視化
    const isFlatObject = keys.every(k => {
      const t = typeof data[k]
      return t === 'string' || t === 'number' || t === 'boolean' || data[k] === null
    })
    if (isFlatObject) {
      return <DynamicKeyValueVisualizer obj={data} title="PROPERTIES SUMMARY" />
    }
  }

  // ③ それ以外の構造、または非常に複雑なネストの場合は自動フォールバックツリー
  return (
    <div style={{ fontFamily: theme.fontMono, fontSize: 11 }}>
      <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 8, color: theme.accent, fontWeight: 'bold' }}>
        GENERIC STRUCTURED DATA
      </div>
      <JsonTreeView value={data} />
    </div>
  )
}

// ── 📂 動的自動テーブルジェネレータ（DynamicTableVisualizer） ──
// レスポンスのJSON構造からオブジェクト配列のキー（列）をランタイムに自動抽出して表を作成します
const DynamicTableVisualizer: React.FC<{ list: any[]; title: string }> = ({ list, title }) => {
  const [filterText, setFilterText] = useState('')

  if (list.length === 0) {
    return <div style={{ fontSize: 11, color: theme.textMuted }}>⚠️ List is empty.</div>
  }

  // 配列内の先頭数件のデータから、存在するすべてのオブジェクトキー（列名）を動的に自動抽出する
  const columnKeys = Array.from(
    new Set(list.slice(0, 5).flatMap(item => (item && typeof item === 'object' ? Object.keys(item) : [])))
  ).filter(k => k !== 'raw_data') // 不要な巨大デバッグプロパティを除外

  // フィルタリング対象のデータ行（配列内のいずれかの値に部分一致するかで検索）
  const filteredList = list.filter(item => {
    if (!item) return false
    return Object.values(item).some(val => 
      String(val).toLowerCase().includes(filterText.toLowerCase())
    )
  })

  // セルの値を適切にインライン文字列化する関数
  const renderCellValue = (val: any) => {
    if (val === null || val === undefined) return <span style={{ color: theme.textMuted }}>---</span>
    if (typeof val === 'boolean') {
      return (
        <span style={{ 
          background: val ? '#15803d44' : '#64748b22', 
          color: val ? '#22c55e' : theme.textMuted, 
          padding: '1px 5px', 
          borderRadius: 2, 
          fontWeight: 'bold', 
          fontSize: 9 
        }}>
          {val ? 'TRUE' : 'FALSE'}
        </span>
      )
    }
    if (typeof val === 'object') {
      return (
        <span style={{ color: theme.accent, fontSize: 10, fontFamily: theme.fontMono }}>
          {Array.isArray(val) ? `[Array(${val.length})]` : '{Object}'}
        </span>
      )
    }
    return <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 200 }} title={String(val)}>{String(val)}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6 }}>
        <span style={{ fontSize: 12, color: theme.accent, fontWeight: 'bold' }}>{title} ({filteredList.length} items)</span>
        <input 
          type="text" 
          placeholder="Filter table content..." 
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ background: '#0b0d13', color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 3, padding: '2px 8px', fontSize: 10, fontFamily: theme.fontMono, outline: 'none' }}
        />
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${theme.border}44`, borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: theme.fontMono }}>
          <thead>
            <tr style={{ background: '#0b0d13', color: theme.textMuted, borderBottom: `1px solid ${theme.border}` }}>
              {columnKeys.map(k => (
                <th key={k} style={tableHeaderStyle}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredList.map((row, idx) => (
              <tr 
                key={idx} 
                style={{ borderBottom: `1px solid ${theme.border}33`, transition: 'background 0.12s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {columnKeys.map(colKey => (
                  <td key={colKey} style={tableCellStyle}>
                    {renderCellValue(row[colKey])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 📦 動的キーバリュー一覧ジェネレータ（DynamicKeyValueVisualizer） ──
// シンプルなオブジェクト構造のキー/バリュー一覧を見やすく表示します
const DynamicKeyValueVisualizer: React.FC<{ obj: Record<string, any>; title: string }> = ({ obj, title }) => {
  const keys = Object.keys(obj)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: theme.accent, fontWeight: 'bold', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {keys.map((key) => {
          const val = obj[key]
          return (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#0b0d13', border: `1px solid ${theme.border}33`, borderRadius: 4, fontSize: 11 }}>
              <span style={{ color: theme.normal, fontWeight: 'bold' }}>{key}</span>
              <span style={{ color: typeof val === 'boolean' ? (val ? '#22c55e' : theme.textMuted) : theme.text, fontFamily: theme.fontMono }}>
                {typeof val === 'boolean' ? (val ? 'TRUE' : 'FALSE') : String(val)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── ④ 汎用 JSON フォルダツリー ──
const JsonTreeView: React.FC<{ value: any }> = ({ value }) => {
  return (
    <div style={{ fontFamily: theme.fontMono, fontSize: 11, color: theme.text }}>
      <JsonNode value={value} depth={0} />
    </div>
  )
}

const JsonNode: React.FC<{ value: any; depth: number }> = ({ value, depth }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  if (value === null) return <span style={{ color: theme.textMuted }}>null</span>
  if (value === undefined) return <span style={{ color: theme.textMuted }}>undefined</span>

  if (typeof value === 'object') {
    const isArray = Array.isArray(value)
    const keys = Object.keys(value)
    const bracketOpen = isArray ? '[' : '{'
    const bracketClose = isArray ? ']' : '}'

    if (keys.length === 0) {
      return <span style={{ color: theme.textMuted }}>{bracketOpen}{bracketClose}</span>
    }

    return (
      <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        <span 
          onClick={() => setIsExpanded(!isExpanded)} 
          style={{ cursor: 'pointer', color: theme.accent, fontWeight: 'bold', userSelect: 'none' }}
        >
          {isExpanded ? '▼' : '▶'} {bracketOpen} <span style={{ fontSize: 9, color: theme.textMuted }}>{keys.length} items</span>
        </span>

        {isExpanded && (
          <div style={{ borderLeft: `1px solid ${theme.border}88`, paddingLeft: 8, margin: '2px 0' }}>
            {keys.map((key) => (
              <div key={key} style={{ margin: '2px 0', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <span style={{ color: theme.normal, fontWeight: 'bold' }}>"{key}":</span>
                <JsonNode value={value[key]} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}

        <span style={{ color: theme.accent, fontWeight: 'bold' }}>{bracketClose}</span>
      </div>
    )
  }

  if (typeof value === 'string') {
    return <span style={{ color: '#22c55e' }}>"{value}"</span>
  }
  if (typeof value === 'number') {
    return <span style={{ color: '#38bdf8' }}>{value}</span>
  }
  if (typeof value === 'boolean') {
    return <span style={{ color: '#ec4899', fontWeight: 'bold' }}>{value ? 'true' : 'false'}</span>
  }

  return <span>{String(value)}</span>
}

// ── インライン・共通スタイル設定 ──

const modalInputStyle: React.CSSProperties = {
  background: '#07080e',
  color: theme.text,
  border: `1px solid ${theme.border}`,
  borderRadius: 4,
  padding: '8px 12px',
  fontFamily: theme.fontMono,
  fontSize: theme.fs.base,
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: theme.accent,
  cursor: 'pointer',
  fontSize: 10,
  fontFamily: theme.fontMono,
  padding: 0,
  fontWeight: 'bold',
  letterSpacing: '0.04em',
}

const tabHeaderStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '6px 8px 4px',
  cursor: 'pointer',
  fontFamily: theme.fontMono,
  fontSize: 10,
  fontWeight: 'bold',
  letterSpacing: '0.04em',
  transition: 'color 0.15s',
  outline: 'none',
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '8px',
  textAlign: 'left',
  borderBottom: `1px solid ${theme.border}`,
}

const tableCellStyle: React.CSSProperties = {
  padding: '8px',
  textAlign: 'left',
  verticalAlign: 'middle',
}