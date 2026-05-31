import { useState } from 'react'
import { usePlcConfigStore } from '../store/usePlcConfigStore'
import { usePlcStore } from '../store/usePlcStore'
import { asPortNumber, asTimeoutMs } from '../types/branded'
import { theme } from '../styles/theme'

export interface PlcEntry {
  plcId: string
  label: string
}

interface ConnectionSettingsProps {
  plcs: PlcEntry[]
  isMobile?: boolean
  pollingStates: Record<string, boolean>
  onConnect: (plcId: string) => void
  onDisconnect: (plcId: string) => void
  onClose: () => void
}

interface FormValues {
  host: string
  port: string
  timeoutMs: string
}

/** Minimum touch target height for glove operation (mobile only). */
const GLOVE_MIN_H = 44

export const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({
  plcs,
  isMobile = false,
  pollingStates,
  onConnect,
  onDisconnect,
  onClose,
}) => {
  const configs = usePlcConfigStore((s) => s.configs)
  const updateConfig = usePlcConfigStore((s) => s.updateConfig)
  const connectionStatuses = usePlcStore((s) => s.connectionStatuses)

  const [forms, setForms] = useState<Record<string, FormValues>>(() =>
    Object.fromEntries(
      plcs.map(({ plcId }) => [
        plcId,
        {
          host: configs[plcId]?.host ?? '',
          port: String(configs[plcId]?.port ?? ''),
          timeoutMs: String(configs[plcId]?.timeoutMs ?? ''),
        },
      ])
    )
  )

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (plcId: string, field: keyof FormValues, value: string) => {
    setForms((prev) => ({ ...prev, [plcId]: { ...prev[plcId], [field]: value } }))
  }

  const handleSave = () => {
    const newErrors: Record<string, string> = {}
    let hasError = false

    for (const { plcId } of plcs) {
      const { host, port, timeoutMs } = forms[plcId]

      if (!host.trim()) {
        newErrors[plcId] = 'Host is required'
        hasError = true
        continue
      }

      const portNum = parseInt(port, 10)
      try {
        asPortNumber(portNum)
      } catch {
        newErrors[plcId] = 'Port must be an integer between 1 and 65535'
        hasError = true
        continue
      }

      const timeoutNum = parseInt(timeoutMs, 10)
      try {
        asTimeoutMs(timeoutNum)
      } catch {
        newErrors[plcId] = 'Timeout must be a positive integer (ms)'
        hasError = true
        continue
      }

      updateConfig(plcId, host.trim(), portNum, timeoutNum)
    }

    setErrors(newErrors)
    if (!hasError) onClose()
  }

  // Desktop: compact IDE-density horizontal grid (label above, fields side-by-side)
  // Mobile: vertical stack, each input locked to GLOVE_MIN_H for glove operability
  const inputStyle: React.CSSProperties = {
    background: theme.bg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: isMobile ? `0 12px` : '8px 10px',
    fontSize: isMobile ? theme.fs.md : theme.fs.base,
    fontFamily: theme.fontMono,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    ...(isMobile ? { minHeight: GLOVE_MIN_H, height: GLOVE_MIN_H } : {}),
  }

  const labelStyle: React.CSSProperties = {
    fontSize: theme.fs.sm,
    color: theme.textMuted,
    marginBottom: isMobile ? 6 : 4,
    display: 'block',
    letterSpacing: '0.04em',
  }

  // Desktop: 3-column grid (Host wide | Port 110px | Timeout 130px)
  // Mobile: flex-column — each field full-width, stacked vertically
  const fieldRowStyle: React.CSSProperties = isMobile
    ? { display: 'flex', flexDirection: 'column', gap: 12 }
    : { display: 'grid', gridTemplateColumns: '1fr 110px 130px', gap: 12 }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: isMobile ? '12px 12px 0 0' : 8,
          padding: isMobile ? 20 : 24,
          width: isMobile ? '100%' : 520,
          maxWidth: isMobile ? '100%' : 'calc(100vw - 32px)',
          maxHeight: isMobile ? '90vh' : undefined,
          overflowY: isMobile ? 'auto' : undefined,
        }}
      >
        {/* Modal title — IDE style on desktop, larger touch target on mobile */}
        <h2
          style={{
            margin: '0 0 20px',
            fontSize: isMobile ? theme.fs.lg : theme.fs.md,
            color: theme.text,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          Connection Settings
        </h2>

        {plcs.map(({ plcId, label }) => {
          const status = connectionStatuses[plcId] ?? 'disconnected'
          const isActive = pollingStates[plcId] ?? false
          const statusColor =
            status === 'connected' ? theme.normal
            : status === 'connecting' ? theme.warning
            : status === 'error' ? theme.critical
            : theme.border

          return (
          <div key={plcId} style={{ marginBottom: isMobile ? 24 : 20 }}>
            {/* Device header: label + status badge + connect/disconnect button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: theme.fs.base,
                  color: theme.accent,
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {label}
              </h3>
              {/* Connection status badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 3,
                  border: `1px solid ${statusColor}`,
                  background: `${statusColor}15`,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: statusColor,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: theme.fs.xs,
                    color: statusColor,
                    fontFamily: theme.fontMono,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {status.toUpperCase()}
                </span>
              </div>
              {/* Per-device connect / disconnect button */}
              <button
                onClick={() => isActive ? onDisconnect(plcId) : onConnect(plcId)}
                style={{
                  padding: isMobile ? '0 16px' : '0 12px',
                  minHeight: isMobile ? GLOVE_MIN_H : 28,
                  background: isActive ? `${theme.critical}18` : `${theme.normal}18`,
                  border: `1px solid ${isActive ? theme.critical : theme.normal}`,
                  borderRadius: 4,
                  color: isActive ? theme.critical : theme.normal,
                  cursor: 'pointer',
                  fontFamily: theme.fontMono,
                  fontSize: isMobile ? theme.fs.md : theme.fs.xs,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {isActive ? 'DISCONNECT' : 'CONNECT'}
              </button>
            </div>

            {/* Form layout: 3-col grid (desktop) or vertical stack (mobile) */}
            <div style={fieldRowStyle}>
              <div>
                <label style={labelStyle}>Host / IP Address</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={forms[plcId].host}
                  onChange={(e) => handleChange(plcId, 'host', e.target.value)}
                  placeholder="192.168.0.1"
                />
              </div>
              <div>
                <label style={labelStyle}>Port</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  max={65535}
                  value={forms[plcId].port}
                  onChange={(e) => handleChange(plcId, 'port', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Timeout (ms)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={100}
                  value={forms[plcId].timeoutMs}
                  onChange={(e) => handleChange(plcId, 'timeoutMs', e.target.value)}
                />
              </div>
            </div>

            {errors[plcId] && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: theme.critical }}>
                {errors[plcId]}
              </p>
            )}
          </div>
          )
        })}

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${theme.border}`,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0 20px',
              minHeight: isMobile ? GLOVE_MIN_H : theme.touchMin,
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              color: theme.textMuted,
              cursor: 'pointer',
              fontFamily: theme.fontMono,
              fontSize: isMobile ? theme.fs.md : theme.fs.base,
              letterSpacing: '0.03em',
              order: isMobile ? 2 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0 24px',
              minHeight: isMobile ? GLOVE_MIN_H : theme.touchMin,
              background: theme.accent,
              border: 'none',
              borderRadius: 4,
              color: '#0F1114',
              cursor: 'pointer',
              fontFamily: theme.fontMono,
              fontSize: isMobile ? theme.fs.md : theme.fs.base,
              fontWeight: 700,
              letterSpacing: '0.03em',
              order: isMobile ? 1 : 2,
            }}
          >
            Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  )
}
