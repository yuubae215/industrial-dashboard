import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { usePlcStore } from '../store/usePlcStore'

interface PollingConfig {
  plcId: string
  startAddress: number
  count: number
  intervalMs: number
}

/** Tauri コマンド `plc_read_mitsubishi` の戻り値に対応する型 */
interface McReadResult {
  values: number[]
}

/**
 * MC プロトコル（3E フレーム）で指定 PLC をポーリングし、
 * Zustand ストアへ生値を書き込むカスタムフック。
 *
 * [非同期インフラ公準3] setInterval + 非ブロッキング invoke の組み合わせを使用。
 */
export const usePlcPolling = ({ plcId, startAddress, count, intervalMs }: PollingConfig) => {
  const updateRawValues = usePlcStore((state) => state.updateRawValues)
  const setConnectionStatus = usePlcStore((state) => state.setConnectionStatus)

  useEffect(() => {
    setConnectionStatus(plcId, 'connecting')

    const poll = async () => {
      try {
        const result = await invoke<McReadResult>('plc_read_mitsubishi', {
          plcId,
          startAddress,
          count,
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
  }, [plcId, startAddress, count, intervalMs, updateRawValues, setConnectionStatus])
}
