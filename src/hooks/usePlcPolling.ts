import { useEffect } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { usePlcStore } from '../store/usePlcStore'
import type { PlcConfig } from '../types/domain'

interface PollingConfig {
  plcId: string
  config: PlcConfig
  device?: string
  startAddress: number
  count: number
  intervalMs: number
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
 * MC プロトコル（3E フレーム）で指定 PLC をポーリングし、
 * Zustand ストアへ生値を書き込むカスタムフック。
 *
 * Tauri 環境外（GitHub Pages デモ）では正弦波モックデータを生成する。
 * [非同期インフラ公準3] setInterval + 非ブロッキング invoke の組み合わせを使用。
 */
export const usePlcPolling = ({
  plcId,
  config,
  device = 'D',
  startAddress,
  count,
  intervalMs,
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
        // Rust PlcConfig のフィールド名は snake_case のため timeout_ms を使用
        const result = await invoke<McReadResult>('plc_read_mitsubishi', {
          config: {
            host: config.host,
            port: config.port,
            timeout_ms: config.timeoutMs,
          },
          device,
          head_number: startAddress,
          num_points: count,
        })
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
  }, [plcId, config.host, config.port, config.timeoutMs, device, startAddress, count, intervalMs, updateRawValues, setConnectionStatus])
}
