import { useState } from 'react'
import { usePlcConfigStore } from '../store/usePlcConfigStore'
import { asPortNumber, asTimeoutMs } from '../types/branded'
import { theme } from '../styles/theme'

export interface PlcEntry {
  plcId: string
  label: string
}

interface ConnectionSettingsProps {
  plcs: PlcEntry[]
  onClose: () => void
}

interface FormValues {
  host: string
  port: string
  timeoutMs: string
}

export const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({ plcs, onClose }) => {
  const configs = usePlcConfigStore((s) => s.configs)
  const updateConfig = usePlcConfigStore((s) => s.updateConfig)

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

  const inputStyle: React.CSSProperties = {
    background: theme.bg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: '8px 10px',
    fontSize: theme.fs.base,
    fontFamily: theme.fontMono,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: theme.fs.sm,
    color: theme.textMuted,
    marginBottom: 4,
    display: 'block',
    letterSpacing: '0.04em',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          padding: 24,
          width: 520,
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: theme.fs.md, color: theme.text, fontWeight: 700, letterSpacing: '0.04em' }}>
          Connection Settings
        </h2>

        {plcs.map(({ plcId, label }) => (
          <div key={plcId} style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: theme.fs.base, color: theme.accent, fontWeight: 600, letterSpacing: '0.03em' }}>
              {label}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px', gap: 12 }}>
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
        ))}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
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
              minHeight: theme.touchMin,
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              color: theme.textMuted,
              cursor: 'pointer',
              fontFamily: theme.fontMono,
              fontSize: theme.fs.base,
              letterSpacing: '0.03em',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0 24px',
              minHeight: theme.touchMin,
              background: theme.accent,
              border: 'none',
              borderRadius: 4,
              color: '#0F1114',
              cursor: 'pointer',
              fontFamily: theme.fontMono,
              fontSize: theme.fs.base,
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  )
}
