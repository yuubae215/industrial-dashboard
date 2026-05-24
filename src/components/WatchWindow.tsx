import { useState, useEffect } from 'react'
import { useDebugStore } from '../store/useDebugStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { usePlcStore } from '../store/usePlcStore'
import { usePlcWrite } from '../hooks/usePlcWrite'
import { asThresholdValue } from '../types/branded'
import { theme } from '../styles/theme'
import { TouchButton } from './TouchButton'
import type { AlarmThreshold, PlcConfig, WatchSlot, WatchSlotIndex } from '../types/domain'

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

/** スロットの閾値フィールドから AlarmThreshold を組み立てる（asThresholdValue() 経由）。 */
function buildThreshold(slot: WatchSlot): AlarmThreshold {
  const threshold: AlarmThreshold = {
    plcId: slot.plcId!,
    address: slot.address!,
    label: slot.comment || `${slot.deviceCode}${slot.address}`,
    unit: '',
  }
  if (slot.thresholdHH != null) threshold.HH = asThresholdValue(slot.thresholdHH)
  if (slot.thresholdH  != null) threshold.H  = asThresholdValue(slot.thresholdH)
  if (slot.thresholdL  != null) threshold.L  = asThresholdValue(slot.thresholdL)
  if (slot.thresholdLL != null) threshold.LL = asThresholdValue(slot.thresholdLL)
  return threshold
}

function hasThreshold(slot: WatchSlot): boolean {
  return (
    slot.thresholdHH != null ||
    slot.thresholdH  != null ||
    slot.thresholdL  != null ||
    slot.thresholdLL != null
  )
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
  const toggleSlotActive = useDebugStore((s) => s.toggleSlotActive)
  const plcValues = usePlcStore((s) => s.values)
  const setThreshold = useAlarmStore((s) => s.setThreshold)
  const { writeMitsubishi } = usePlcWrite()

  // 書き込み中状態（一時的な UI インタラクション — Zustand 不要なローカル state）
  const [pendingWrite, setPendingWrite] = useState<PendingWrite | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [addressInputs, setAddressInputs] = useState<Record<number, string>>({})

  // localStorage から rehydrate されたスロット閾値を alarmStore に同期する（起動時 1 回）
  useEffect(() => {
    for (const slot of slots) {
      if (slot.plcId && slot.address !== null && hasThreshold(slot)) {
        setThreshold(buildThreshold(slot))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleThresholdChange = (
    index: WatchSlotIndex,
    level: 'HH' | 'H' | 'L' | 'LL',
    raw: string,
  ) => {
    const parsed = raw === '' ? null : parseFloat(raw)
    const val = parsed === null || isNaN(parsed) ? null : parsed
    const key = `threshold${level}` as 'thresholdHH' | 'thresholdH' | 'thresholdL' | 'thresholdLL'
    updateSlot(index, { [key]: val })

    const slot = slots[index]
    if (slot.plcId && slot.address !== null) {
      setThreshold(buildThreshold({ ...slot, [key]: val }))
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
            <th style={{ ...thStyle, color: theme.critical, textAlign: 'center' }}>HH</th>
            <th style={{ ...thStyle, color: theme.warning, textAlign: 'center' }}>H</th>
            <th style={{ ...thStyle, color: theme.warning, textAlign: 'center' }}>L</th>
            <th style={{ ...thStyle, color: theme.critical, textAlign: 'center' }}>LL</th>
            <th style={{ ...thStyle, color: theme.accent, textAlign: 'center' }}>Trend</th>
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
                style={{
                  borderBottom: `1px solid ${theme.border}`,
                  background: slot.isActive ? `${theme.accent}14` : 'transparent',
                }}
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

                {(
                  [
                    ['HH', theme.critical],
                    ['H',  theme.warning],
                    ['L',  theme.warning],
                    ['LL', theme.critical],
                  ] as const
                ).map(([level, color]) => (
                  <td key={level} style={{ ...tdStyle, padding: '4px 4px', textAlign: 'center' }}>
                    <input
                      type="number"
                      value={slot[`threshold${level}`] ?? ''}
                      onChange={(e) =>
                        handleThresholdChange(slot.index as WatchSlotIndex, level, e.target.value)
                      }
                      placeholder="—"
                      disabled={slot.address === null}
                      style={{
                        ...inputStyle,
                        width: 56,
                        color,
                        textAlign: 'center',
                        opacity: slot.address === null ? 0.3 : 1,
                      }}
                    />
                  </td>
                ))}

                <td style={{ ...tdStyle, padding: '4px 6px', textAlign: 'center' }}>
                  {slot.address !== null ? (
                    <button
                      onClick={() => toggleSlotActive(slot.index as WatchSlotIndex)}
                      title={slot.isActive ? 'Remove from trend chart' : 'Add to trend chart'}
                      style={{
                        background: 'none',
                        border: `1px solid ${slot.isActive ? theme.accent : theme.border}`,
                        borderRadius: 3,
                        cursor: 'pointer',
                        color: slot.isActive ? theme.accent : theme.textMuted,
                        fontSize: 16,
                        lineHeight: 1,
                        padding: '2px 8px',
                        fontFamily: theme.fontMono,
                        transition: 'color 0.15s, border-color 0.15s',
                      }}
                    >
                      {slot.isActive ? '●' : '○'}
                    </button>
                  ) : (
                    <span style={{ color: theme.border, fontSize: 12 }}>—</span>
                  )}
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
