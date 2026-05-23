import { invoke } from '@tauri-apps/api/core'
import type { PlcConfig } from '../types/domain'

/**
 * 三菱 MCプロトコル 一括書き込みを invoke するカスタムフック。
 * [UI 公準4] コンポーネントが直接 invoke を呼ばないようにこのフックで隠蔽する。
 */
export function usePlcWrite() {
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
      head_number: headNumber,
      values,
    })
  }

  return { writeMitsubishi }
}
