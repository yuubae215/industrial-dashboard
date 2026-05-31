import { useEffect } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { usePlcStore } from '../store/usePlcStore'
import { useDebugStore } from '../store/useDebugStore' // 👈 追加（ウォッチウィンドウのスロット監視用）
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
  enabled?: boolean
}

interface McReadResult {
  values: number[]
}

// デモ環境（GitHub Pages等）用のダミー値生成
const mockRawValue = (now: number, address: number): number => {
  const phase = (address % 5) * (Math.PI / 5)
  const sine = Math.sin(now / 15000 + phase)
  return Math.round(1500 + sine * 600 + (Math.random() - 0.5) * 100)
}

/**
 * 指定 PLC から、ウォッチウィンドウに登録されたアドレスを動的に検出して
 * 500msごとに自動ポーリングする超強力なカスタムフック。
 * 
 * [非同期インフラ公準3] setInterval + 非ブロッキング invoke の組み合わせを使用。
 */
export const usePlcPolling = ({
  plcId,
  config,
  protocol = 'mitsubishi',
  intervalMs,
  signed = false,
  enabled = false,
}: PollingConfig) => {
  const updateRawValues = usePlcStore((state) => state.updateRawValues)
  const setConnectionStatus = usePlcStore((state) => state.setConnectionStatus)

  useEffect(() => {
    if (!enabled) {
      setConnectionStatus(plcId, 'disconnected')
      return
    }

    setConnectionStatus(plcId, 'connecting')

    const poll = async () => {
      // 1. ウォッチウィンドウ（useDebugStore）から、このPLC(plcId)に紐づく有効なアドレスをすべて抽出
      const slots = useDebugStore.getState().slots
      const activeTargets = slots
        .filter((s) => s.plcId === plcId && s.address !== null)
        .map((s) => ({ device: s.deviceCode, address: s.address as number }))

      // 重複するアドレスを排除
      const uniqueTargets = activeTargets.filter((v, i, a) =>
        a.findIndex((t) => t.device === v.device && t.address === v.address) === i
      )

      // もしウォッチウィンドウが完全に空の場合、接続状態灯を維持するためにデフォルトとして1000番地をポーリング
      const targetsToPoll = uniqueTargets.length > 0 
        ? uniqueTargets 
        : [{ device: protocol === 'keyence' ? 'DM' : 'D', address: 1000 }]

      // 🌐 デモ環境（Tauri外）の場合はモックデータを流し込む
      if (!isTauri()) {
        const now = Date.now()
        targetsToPoll.forEach((target) => {
          const mockVal = mockRawValue(now, target.address)
          updateRawValues(plcId, target.address, [mockVal])
        })
        setConnectionStatus(plcId, 'connected')
        return
      }

      let hasError = false

      // ⚡ 全ターゲット（アドレス）に対して、並列で非ブロッキングにPLC読出要求（invoke）を送信
      await Promise.all(
        targetsToPoll.map(async (target) => {
          try {
            const baseArgs = {
              config: {
                host: config.host,
                port: config.port,
                timeout_ms: config.timeoutMs,
              },
              device: target.device,
              headNumber: target.address,
              numPoints: 1, // 各アドレス1点ずつ精密に読み出す
            }

            const result = await invoke<McReadResult>(
              protocol === 'keyence' ? 'plc_read_keyence' : 'plc_read_mitsubishi',
              protocol === 'keyence' ? { ...baseArgs, signed } : baseArgs,
            )

            // 取得した値をストアの単一アドレスマップに保存
            updateRawValues(plcId, target.address, result.values)
          } catch (error) {
            console.error(`[PLC Dynamic Polling Error] ${plcId} ${target.device}${target.address}:`, error)
            hasError = true
          }
        })
      )

      // 通信エラーが1件でもあれば「エラー」、全件成功なら「接続完了」ステータスにする
      setConnectionStatus(plcId, hasError ? 'error' : 'connected')
    }

    // 初回実行と定期実行のセットアップ
    poll()
    const timerId = setInterval(poll, intervalMs)
    return () => clearInterval(timerId)
  }, [
    plcId,
    config.host,
    config.port,
    config.timeoutMs,
    protocol,
    intervalMs,
    signed,
    enabled,
    updateRawValues,
    setConnectionStatus,
  ])
}