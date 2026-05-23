import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
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

/**
 * 指定 PLC をポーリングし Zustand ストアへ生値を書き込むカスタムフック。
 * protocol='mitsubishi' -> plc_read_mitsubishi (MC プロトコル 3E バイナリ)
 * protocol='keyence'    -> plc_read_keyence    (上位リンク ASCII TCP)
 *
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
      try {
        const baseArgs = {
          config: {
            host: config.host,
            port: config.port,
            timeout_ms: config.timeoutMs,
          },
          device,
          head_number: startAddress,
          num_points: count,
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
