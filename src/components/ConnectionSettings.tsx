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
        newErrors[plcId] = 'ホストを入力してください'
        hasError = true
        continue
      }

      const portNum = parseInt(port, 10)
      try {
        asPortNumber(portNum)
      } catch {
        newErrors[plcId] = 'ポートは 1–65535 の整数を入力してください'
        hasError = true
        continue
      }

      const timeoutNum = parseInt(timeoutMs, 10)
      try {
        asTimeoutMs(timeoutNum)
      } catch {
        newErrors[plcId] = 'タイムアウトは正の整数 (ms) を入力してください'
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
    fontSize: 14,
    fontFamily: theme.fontMono,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 4,
    display: 'block',
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
        <h2 style={{ margin: '0 0 20px', fontSize: 16, color: theme.text, fontWeight: 700 }}>
          接続設定
        </h2>

        {plcs.map(({ plcId, label }) => (
          <div key={plcId} style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: theme.accent, fontWeight: 600 }}>
              {label}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px', gap: 12 }}>
              <div>
                <label style={labelStyle}>ホスト / IP アドレス</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={forms[plcId].host}
                  onChange={(e) => handleChange(plcId, 'host', e.target.value)}
                  placeholder="192.168.0.1"
                />
              </div>
              <div>
                <label style={labelStyle}>ポート</label>
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
                <label style={labelStyle}>タイムアウト (ms)</label>
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
              borderRadius: 6,
              color: theme.textMuted,
              cursor: 'pointer',
              fontFamily: theme.fontMono,
              fontSize: 14,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0 24px',
              minHeight: theme.touchMin,
              background: theme.accent,
              border: 'none',
              borderRadius: 6,
              color: '#1A1D20',
              cursor: 'pointer',
              fontFamily: theme.fontMono,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            保存して適用
          </button>
        </div>
      </div>
    </div>
  )
}
