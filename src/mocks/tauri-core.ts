// GitHub Pages デモ用: Tauri ランタイムなしで PLC 応答をシミュレート
// vite.config.ts の resolve.alias で GITHUB_PAGES=true 時のみ有効化される

let mitsBase = 1500
let kvBase = 500

setInterval(() => {
  mitsBase += Math.random() < 0.5 ? 5 : -5
  kvBase += Math.random() < 0.5 ? 1 : -1
}, 500)

export function isTauri(): boolean {
  return false
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const n = (args?.num_points as number) ?? 5

  // ジェネリックパラメータ T を満たすための unknown 経由キャスト。
  // Axiom 3 が禁じるブランド型キャストとは無関係 — mock の型システム上の制約のみ。
  if (cmd === 'plc_read_mitsubishi') {
    return { values: Array.from({ length: n }, (_, i) => mitsBase + i) } as unknown as T
  }
  if (cmd === 'plc_read_keyence') {
    return { values: Array.from({ length: n }, (_, i) => kvBase + i) } as unknown as T
  }
  if (cmd === 'plc_write_mitsubishi' || cmd === 'plc_write_keyence') {
    return undefined as T
  }
  if (cmd === 'config_load') {
    return {
      version: '1.0.0',
      signals: [
        {
          plcId: 'melsec-line-a',
          address: 1000,
          name: 'Mitsubishi Line A Furnace Temp',
          unit: 'degC',
          dataType: 'INT16',
          alerts: [
            { kind: 'HH', threshold: 2500, message: 'CRITICAL: Furnace temperature extremely high' },
            { kind: 'H', threshold: 2000, message: 'WARNING: Furnace temperature high' },
            { kind: 'L', threshold: 500, message: 'WARNING: Furnace temperature low' },
            { kind: 'LL', threshold: 200, message: 'CRITICAL: Furnace temperature extremely low' },
          ],
        },
      ],
    } as unknown as T
  }
  if (cmd === 'config_save') {
    return undefined as T
  }
  throw new Error(`[demo] unsupported command: ${cmd}`)
}
