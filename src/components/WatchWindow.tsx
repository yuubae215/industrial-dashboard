import { useState } from 'react'
import { useDebugStore } from '../store/useDebugStore'
import { useSignalConfigStore } from '../store/useSignalConfigStore'
import { useTrendConfigStore } from '../store/useTrendConfigStore'
import { usePlcStore } from '../store/usePlcStore'
import { usePlcWrite } from '../hooks/usePlcWrite'
import { asThresholdValue } from '../types/branded'
import { theme } from '../styles/theme'
import { TouchButton } from './TouchButton'
import type { PlcConfig, WatchSlotIndex } from '../types/domain'
import { usePlcConfigStore, MELSEC_PLC_ID, KEYENCE_PLC_ID } from '../store/usePlcConfigStore'

interface PendingWrite {
  slotIndex: WatchSlotIndex
  inputValue: string
}

/** 
 * アドレス入力文字列（例 "D1000", "DM3000"）をパースして
 * デバイスコード、アドレス、および対応するPLC IDを自動判定して返す。
 */
function parseDeviceAddress(input: string): { deviceCode: string; address: number; plcId: string } | null {
  const clean = input.trim().toUpperCase()

  // 2文字のデバイス（Keyence: DM, CM, TM）
  const match2 = clean.match(/^(DM|CM|TM)(\d+)$/)
  if (match2) {
    return {
      deviceCode: match2[1],
      address: parseInt(match2[2], 10),
      plcId: KEYENCE_PLC_ID, // 自動的にキーエンスPLCにマッピング
    }
  }

  // 1文字のデバイス（Mitsubishi: D, M, W, X, Y, B）
  const match1 = clean.match(/^([DMWXYB])(\d+)$/)
  if (match1) {
    return {
      deviceCode: match1[1],
      address: parseInt(match1[2], 10),
      plcId: MELSEC_PLC_ID, // 自動的に三菱PLCにマッピング
    }
  }

  return null
}

interface WatchWindowProps {
  plcConfig: PlcConfig
  defaultPlcId: string
}

/**
 * デバッグウォッチウィンドウ。
 * 2文字のキーエンスデバイス名 (DM/CM/TM) にもネイティブ対応。
 */
export const WatchWindow: React.FC<WatchWindowProps> = ({ defaultPlcId }) => {
  const isMaintenanceMode = useDebugStore((s) => s.isMaintenanceMode)
  const slots = useDebugStore((s) => s.slots)
  const updateSlot = useDebugStore((s) => s.updateSlot)
  const signalConfigs = useSignalConfigStore((s) => s.configs)
  const setSignalConfig = useSignalConfigStore((s) => s.setSignalConfig)
  const trendConfigs = useTrendConfigStore((s) => s.configs)
  const setTrendConfig = useTrendConfigStore((s) => s.setTrendConfig)
  const plcValues = usePlcStore((s) => s.values)

  // グローバルなストアから両方のPLC設定を取得
  const melsecConfig = usePlcConfigStore((s) => s.configs[MELSEC_PLC_ID])
  const keyenceConfig = usePlcConfigStore((s) => s.configs[KEYENCE_PLC_ID])
  const { writeMitsubishi, writeKeyence } = usePlcWrite()

  const [pendingWrite, setPendingWrite] = useState<PendingWrite | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [addressInputs, setAddressInputs] = useState<Record<number, string>>({})

  if (!isMaintenanceMode) return null

  const handleAddressChange = (index: WatchSlotIndex, raw: string) => {
    setAddressInputs((prev) => ({ ...prev, [index]: raw }))
    const parsed = parseDeviceAddress(raw)
    if (parsed) {
      const prevSlot = slots.find((s) => s.index === index)
      if (prevSlot?.plcId && prevSlot.address !== null && prevSlot.address !== parsed.address) {
        setTrendConfig(prevSlot.plcId, prevSlot.address, { isActive: false })
      }
      updateSlot(index, {
        address: parsed.address,
        deviceCode: parsed.deviceCode,
        plcId: parsed.plcId, // 判定された正しいPLC IDをストアに保存
      })
    } else if (raw === '') {
      const prevSlot = slots.find((s) => s.index === index)
      if (prevSlot?.plcId && prevSlot.address !== null) {
        setTrendConfig(prevSlot.plcId, prevSlot.address, { isActive: false })
      }
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

    const slot = slots[index]
    if (!slot.plcId || slot.address === null) return

    const existing = signalConfigs.find(
      (c) => c.plcId === slot.plcId && c.address === slot.address,
    )
    const base = existing ?? {
      plcId: slot.plcId,
      address: slot.address,
      label: `${slot.deviceCode}${slot.address}`,
      unit: '',
    }
    const updated = { ...base }
    if (val !== null) {
      updated[level] = asThresholdValue(val)
    } else {
      delete updated[level]
    }
    setSignalConfig(updated)
  }

  const handleConfirmWrite = async (slotIndex: WatchSlotIndex) => {
    if (!pendingWrite) return
    const slot = slots.find((s) => s.index === slotIndex)
    if (!slot || slot.address === null || slot.plcId === null) return
    const numVal = parseInt(pendingWrite.inputValue, 10)
    if (isNaN(numVal)) {
      setWriteError('Please enter an integer value')
      return
    }
    try {
      // 接続先PLCに応じて書き込み先・設定・APIコマンドを動的選択
      if (slot.plcId === MELSEC_PLC_ID) {
        await writeMitsubishi(melsecConfig, slot.deviceCode, slot.address, [numVal])
      } else if (slot.plcId === KEYENCE_PLC_ID) {
        await writeKeyence(keyenceConfig, slot.deviceCode, slot.address, [numVal])
      }
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
          Enter Mitsubishi (e.g. D1000) or Keyence (e.g. DM1000) to start monitoring
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
            const currentRaw =
              slot.plcId !== null && slot.address !== null
                ? plcValues[slot.plcId]?.[slot.address]
                : undefined

            const isPending = pendingWrite?.slotIndex === slot.index
            const addressDisplay =
              addressInputs[slot.index] ??
              (slot.address !== null ? `${slot.deviceCode}${slot.address}` : '')

            const signalConfig =
              slot.plcId && slot.address !== null
                ? signalConfigs.find(
                    (c) => c.plcId === slot.plcId && c.address === slot.address,
                  )
                : undefined

            const trendConfig =
              slot.plcId && slot.address !== null
                ? trendConfigs.find(
                    (c) => c.plcId === slot.plcId && c.address === slot.address,
                  )
                : undefined

            const isActive = trendConfig?.isActive ?? false

            return (
              <tr
                key={slot.index}
                style={{
                  borderBottom: `1px solid ${theme.border}`,
                  background: isActive ? `${theme.accent}14` : 'transparent',
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
                    placeholder="e.g. DM1000"
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
                      value={signalConfig?.[level] ?? ''}
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
                      onClick={() => {
                        if (slot.plcId && slot.address !== null) {
                          setTrendConfig(slot.plcId, slot.address, { isActive: !isActive })
                        }
                      }}
                      title={isActive ? 'Remove from trend chart' : 'Add to trend chart'}
                      style={{
                        background: 'none',
                        border: `1px solid ${isActive ? theme.accent : theme.border}`,
                        borderRadius: 3,
                        cursor: 'pointer',
                        color: isActive ? theme.accent : theme.textMuted,
                        fontSize: 16,
                        lineHeight: 1,
                        padding: '2px 8px',
                        fontFamily: theme.fontMono,
                        transition: 'color 0.15s, border-color 0.15s',
                      }}
                    >
                      {isActive ? '●' : '○'}
                    </button>
                  ) : (
                    <span style={{ color: theme.border, fontSize: 12 }}>—</span>
                  )}
                </td>

                <td style={{ ...tdStyle, padding: '4px 6px' }}>
                  <input
                    value={trendConfig?.label ?? ''}
                    onChange={(e) => {
                      if (slot.plcId && slot.address !== null) {
                        setTrendConfig(slot.plcId, slot.address, { label: e.target.value })
                      }
                    }}
                    placeholder="Comment"
                    disabled={slot.address === null}
                    style={{
                      ...inputStyle,
                      width: '95%',
                      opacity: slot.address === null ? 0.3 : 1,
                    }}
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
                        onClick={() => handleConfirmWrite(slot.index as WatchSlotIndex)}
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