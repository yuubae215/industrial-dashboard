// GitHub Pages デモ用: Tauri ランタイムなしで PLC 応答をシミュレート
// vite.config.ts の resolve.alias で GITHUB_PAGES=true 時のみ有効化される

let mitsBase = 1500
let kvBase = 500

setInterval(() => {
  mitsBase += Math.random() < 0.5 ? 5 : -5
  kvBase += Math.random() < 0.5 ? 1 : -1
}, 500)

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
  throw new Error(`[demo] unsupported command: ${cmd}`)
}
