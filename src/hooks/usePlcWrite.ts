import { invoke } from '@tauri-apps/api/core'
import type { PlcConfig } from '../types/domain'

/**
 * PLC デバイスへの書き込みを invoke するカスタムフック。
 * [UI 公準4] コンポーネントが直接 invoke を呼ばないようにこのフックで隠蔽する。
 */
export function usePlcWrite() {
  // 三菱PLCへの書き込み
  const writeMitsubishi = async (
    config: PlcConfig,
    device: string,
    headNumber: number,
    values: number[],
  ): Promise<void> => {
    await invoke('plc_write_mitsubishi', {
      config: {
        host: config.host,
        port: config.port,
        timeout_ms: config.timeoutMs,
      },
      device,
      headNumber,
      values,
    })
  }

  // キーエンスPLCへの書き込み（必須パラメータ signed を追加）
  const writeKeyence = async (
    config: PlcConfig,
    device: string,
    headNumber: number,
    values: number[],
    signed: boolean = false, // 👈 signed引数をオプションで追加（デフォルトは false）
  ): Promise<void> => {
    await invoke('plc_write_keyence', {
      config: {
        host: config.host,
        port: config.port,
        timeout_ms: config.timeoutMs,
      },
      device,
      number: headNumber,
      headNumber: headNumber,
      value: values[0],
      values: values,
      signed: signed, // 👈 必須キー `signed` をペイロードに追加して送信
    })
  }

  return { writeMitsubishi, writeKeyence }
}