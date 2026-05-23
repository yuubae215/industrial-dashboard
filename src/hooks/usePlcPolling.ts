import { useEffect } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { usePlcStore } from '../store/usePlcStore'
import type { PlcConfig } from '../types/domain'

interface PollingConfig {
  plcId: string
  config: PlcConfig
  protocol?: 'mitsubishi' | 'keyence'
  device?: string
  startAddress: number
  count: number
  intervalMs: number
  signed?: boolean
}

interface McReadResult {
  values: number[]
}

// GitHub Pages demo: sinusoidal values centered at 1500 (150.0℃ with scale 0.1)
// Oscillation ±600 raw (±60℃) crosses the H threshold (2000 = 200℃) at peak
const mockRawValue = (now: number, address: number): number => {
  const phase = (address % 5) * (Math.PI / 5)
  const sine = Math.sin(now / 15000 + phase)
  return Math.round(1500 + sine * 600 + (Math.random() - 0.5) * 100)
}

/**
 * 指定 PLC をポーリングし Zustand ストアへ生値を書き込むカスタムフック。
 * protocol='mitsubishi' -> plc_read_mitsubishi (MC プロトコル 3E バイナリ)
 * protocol='keyence'    -> plc_read_keyence    (上位リンク ASCII TCP)
 *
 * Tauri 環境外（GitHub Pages デモ）では正弦波モックデータを生成する。
 * [非同期インフラ公準3] setInterval + 非ブロッキング invoke の組み合わせを使用。
 */
export const usePlcPolling = ({
  plcId,
  config,
  protocol = 'mitsubishi',
  device = protocol === 'keyence' ? 'DM' : 'D',
  startAddress,
  count,
  intervalMs,
  signed = false,
}: PollingConfig) => {
  const updateRawValues = usePlcStore((state) => state.updateRawValues)
  const setConnectionStatus = usePlcStore((state) => state.setConnectionStatus)

  useEffect(() => {
    setConnectionStatus(plcId, 'connecting')

    const poll = async () => {
      // GitHub Pages demo: no Tauri IPC available, generate mock values
      if (!isTauri()) {
        const now = Date.now()
        const values = Array.from({ length: count }, (_, i) => mockRawValue(now, startAddress + i))
        updateRawValues(plcId, startAddress, values)
        setConnectionStatus(plcId, 'connected')
        return
      }

      try {
        const baseArgs = {
          config: {
            host: config.host,
            port: config.port,
            timeout_ms: config.timeoutMs,
          },
          device,
          headNumber: startAddress,
          numPoints: count,
        }
        const result = await invoke<McReadResult>(
          protocol === 'keyence' ? 'plc_read_keyence' : 'plc_read_mitsubishi',
          protocol === 'keyence' ? { ...baseArgs, signed } : baseArgs,
        )
        updateRawValues(plcId, startAddress, result.values)
        setConnectionStatus(plcId, 'connected')
      } catch (error) {
        console.error(`[PLC Polling] ${plcId}:`, error)
        setConnectionStatus(plcId, 'error')
      }
    }

    poll()
    const timerId = setInterval(poll, intervalMs)
    return () => clearInterval(timerId)
  }, [plcId, config.host, config.port, config.timeoutMs, protocol, device, startAddress, count, intervalMs, signed, updateRawValues, setConnectionStatus])
}
