import { useState } from 'react'
import { useDebugStore } from '../store/useDebugStore'
import { usePlcStore } from '../store/usePlcStore'
import { usePlcWrite } from '../hooks/usePlcWrite'
import { theme } from '../styles/theme'
import { TouchButton } from './TouchButton'
import type { PlcConfig, WatchSlot, WatchSlotIndex } from '../types/domain'

interface PendingWrite {
  slotIndex: WatchSlotIndex
  inputValue: string
}

/** アドレス入力文字列（例 "D1000"）をパースして deviceCode と address を返す。 */
function parseDeviceAddress(input: string): { deviceCode: string; address: number } | null {
  const match = input.trim().toUpperCase().match(/^([DMWXYB])(\d+)$/)
  if (!match) return null
  return { deviceCode: match[1], address: parseInt(match[2], 10) }
}

interface WatchWindowProps {
  plcConfig: PlcConfig
  defaultPlcId: string
}

/**
 * GxWorks3 風デバッグウォッチウィンドウ。
 * isMaintenanceMode = true のときのみ表示される。
 * 現在値は usePlcStore から毎回取得（ADR-005 準拠 — debugStore には値を保持しない）。
 */
export const WatchWindow: React.FC<WatchWindowProps> = ({ plcConfig, defaultPlcId }) => {
  const isMaintenanceMode = useDebugStore((s) => s.isMaintenanceMode)
  const slots = useDebugStore((s) => s.slots)
  const updateSlot = useDebugStore((s) => s.updateSlot)
  const plcValues = usePlcStore((s) => s.values)
  const { writeMitsubishi } = usePlcWrite()

  // 書き込み中状態（一時的な UI インタラクション — Zustand 不要なローカル state）
  const [pendingWrite, setPendingWrite] = useState<PendingWrite | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [addressInputs, setAddressInputs] = useState<Record<number, string>>({})

  if (!isMaintenanceMode) return null

  const handleAddressChange = (index: WatchSlotIndex, raw: string) => {
    setAddressInputs((prev) => ({ ...prev, [index]: raw }))
    const parsed = parseDeviceAddress(raw)
    if (parsed) {
      updateSlot(index, {
        address: parsed.address,
        deviceCode: parsed.deviceCode,
        plcId: defaultPlcId,
      })
    } else if (raw === '') {
      updateSlot(index, { address: null, plcId: null })
    }
  }

  const handleConfirmWrite = async (slot: WatchSlot) => {
    if (!pendingWrite || slot.address === null || slot.plcId === null) return
    const numVal = parseInt(pendingWrite.inputValue, 10)
    if (isNaN(numVal)) {
      setWriteError('Please enter an integer value')
      return
    }
    try {
      await writeMitsubishi(plcConfig, slot.deviceCode, slot.address, [numVal])
      setPendingWrite(null)
      setWriteError(null)
    } catch (err) {
      setWriteError(String(err))
    }
  }

  return (
    <div
      style={{
        borderTop: `3px solid ${theme.accent}`,
        background: theme.bg,
        padding: 16,
        fontFamily: theme.fontMono,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 700, color: theme.accent, fontSize: theme.fs.base }}>
          Debug Watch Window
        </span>
        <span style={{ color: theme.textMuted, fontSize: theme.fs.sm }}>
          Target PLC: {defaultPlcId} — Enter D1000 etc. to start monitoring
        </span>
      </div>

      {writeError && (
        <div style={{ color: theme.critical, fontSize: 12, marginBottom: 8 }}>
          Write error: {writeError}
        </div>
      )}

      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: theme.fs.base }}
      >
        <thead>
          <tr style={{ background: theme.bgHeader, color: theme.textMuted }}>
            <th style={thStyle}>No.</th>
            <th style={thStyle}>Device</th>
            <th style={{ ...thStyle, color: theme.normal }}>Value</th>
            <th style={thStyle}>Comment</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            // [公理2] 現在値は usePlcStore から毎回算出 — debugStore に保持しない
            const currentRaw =
              slot.plcId !== null && slot.address !== null
                ? plcValues[slot.plcId]?.[slot.address]
                : undefined

            const isPending = pendingWrite?.slotIndex === slot.index
            const addressDisplay =
              addressInputs[slot.index] ??
              (slot.address !== null ? `${slot.deviceCode}${slot.address}` : '')

            return (
              <tr
                key={slot.index}
                style={{ borderBottom: `1px solid ${theme.border}` }}
              >
                <td style={tdStyle}>
                  <span style={{ color: theme.textMuted }}>{slot.index}</span>
                </td>

                <td style={{ ...tdStyle, padding: '4px 6px' }}>
                  <input
                    value={addressDisplay}
                    onChange={(e) =>
                      handleAddressChange(slot.index as WatchSlotIndex, e.target.value)
                    }
                    placeholder="D1000"
                    style={inputStyle}
                  />
                </td>

                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    fontSize: 16,
                    color: currentRaw !== undefined ? theme.normal : theme.textMuted,
                  }}
                >
                  {currentRaw !== undefined ? String(currentRaw) : '---'}
                </td>

                <td style={{ ...tdStyle, padding: '4px 6px' }}>
                  <input
                    value={slot.comment}
                    onChange={(e) =>
                      updateSlot(slot.index as WatchSlotIndex, { comment: e.target.value })
                    }
                    placeholder="Comment (e.g. Line A interlock)"
                    style={{ ...inputStyle, width: '95%' }}
                  />
                </td>

                <td style={{ ...tdStyle, padding: '4px 6px' }}>
                  {slot.address === null ? null : isPending ? (
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={pendingWrite.inputValue}
                        onChange={(e) =>
                          setPendingWrite({ ...pendingWrite, inputValue: e.target.value })
                        }
                        style={{ ...inputStyle, width: 70 }}
                        autoFocus
                      />
                      <TouchButton
                        label="Confirm"
                        variant="critical"
                        onClick={() => handleConfirmWrite(slot)}
                        style={{ minHeight: 32, minWidth: 48, fontSize: 12 }}
                      />
                      <TouchButton
                        label="✕"
                        onClick={() => { setPendingWrite(null); setWriteError(null) }}
                        style={{ minHeight: 32, minWidth: 32, fontSize: 12 }}
                      />
                    </span>
                  ) : (
                    <TouchButton
                      label="Write"
                      variant="warning"
                      onClick={() =>
                        setPendingWrite({
                          slotIndex: slot.index as WatchSlotIndex,
                          inputValue: currentRaw !== undefined ? String(currentRaw) : '0',
                        })
                      }
                      style={{ minHeight: 32, minWidth: 64, fontSize: 12 }}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: `1px solid ${theme.border}`,
  textAlign: 'left',
  fontSize: theme.fs.sm,
  fontWeight: 600,
  letterSpacing: '0.05em',
}

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: `1px solid ${theme.border}`,
}

const inputStyle: React.CSSProperties = {
  background: theme.bg,
  color: theme.text,
  border: `1px solid ${theme.border}`,
  borderRadius: 3,
  padding: '3px 6px',
  fontFamily: theme.fontMono,
  fontSize: theme.fs.base,
  width: '100%',
  boxSizing: 'border-box',
}
