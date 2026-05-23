import { useEffect } from 'react'
import { create } from 'zustand'
import { usePlcStore } from './usePlcStore'
import type { AlarmThreshold, AlarmEntry, AlarmLevel } from '../types/domain'
import type { PlcRawValue } from '../types/branded'

interface AlarmState {
  thresholds: AlarmThreshold[]
  entries: AlarmEntry[]

  setThreshold: (threshold: AlarmThreshold) => void
  acknowledgeAlarm: (id: string) => void
  _processNewValues: (plcId: string, addressMap: Record<number, PlcRawValue>) => void
}

function evaluateLevel(raw: PlcRawValue, threshold: AlarmThreshold): AlarmLevel | null {
  if (threshold.HH !== undefined && raw >= threshold.HH) return 'HH'
  if (threshold.H  !== undefined && raw >= threshold.H)  return 'H'
  if (threshold.LL !== undefined && raw <= threshold.LL) return 'LL'
  if (threshold.L  !== undefined && raw <= threshold.L)  return 'L'
  return null
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  thresholds: [],
  entries: [],

  setThreshold: (threshold) =>
    set((state) => {
      const idx = state.thresholds.findIndex(
        (t) => t.plcId === threshold.plcId && t.address === threshold.address
      )
      const updated = idx >= 0
        ? state.thresholds.map((t, i) => (i === idx ? threshold : t))
        : [...state.thresholds, threshold]
      return { thresholds: updated }
    }),

  acknowledgeAlarm: (id) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, acknowledgedAt: Date.now() } : e
      ),
    })),

  _processNewValues: (plcId, addressMap) => {
    const { thresholds, entries } = get()
    const now = Date.now()
    const nextEntries = [...entries]
    let changed = false

    for (const threshold of thresholds) {
      if (threshold.plcId !== plcId) continue
      const raw = addressMap[threshold.address]
      if (raw === undefined) continue

      const levels: AlarmLevel[] = ['HH', 'H', 'L', 'LL']
      for (const level of levels) {
        if (threshold[level] === undefined) continue

        const triggered = evaluateLevel(raw, threshold) === level
        const alarmKey = `${plcId}:${threshold.address}:${level}`

        // ES2020 compatible findLastIndex
        const activeIdx = (() => {
          for (let i = nextEntries.length - 1; i >= 0; i--) {
            if (nextEntries[i].id.startsWith(alarmKey) && nextEntries[i].clearedAt === null) return i
          }
          return -1
        })()

        if (triggered && activeIdx === -1) {
          nextEntries.push({
            id: `${alarmKey}:${now}`,
            plcId,
            address: threshold.address,
            level,
            triggerValue: raw,
            triggeredAt: now,
            clearedAt: null,
            acknowledgedAt: null,
          })
          changed = true
        } else if (!triggered && activeIdx >= 0) {
          nextEntries[activeIdx] = { ...nextEntries[activeIdx], clearedAt: now }
          changed = true
        }
      }
    }

    if (changed) set({ entries: nextEntries })
  },
}))

// クロスストア購読: plcStore の値変更ごとにアラーム評価を実行（Zustand 公式パターン）
// このモジュールスコープの subscribe は React レンダー外で動作し、フィードバックループを生じない。
usePlcStore.subscribe((state) => {
  const { _processNewValues } = useAlarmStore.getState()
  for (const plcId of Object.keys(state.values)) {
    _processNewValues(plcId, state.values[plcId])
  }
})

/**
 * アラーム監視フックを初期化する。
 * App.tsx でレンダーツリーのルートで一度だけ呼ぶ。
 * useAlarmStore がインポートされた時点で subscribe は登録済みだが、
 * このフックを使うことでモジュール初期化の副作用を明示的に管理できる。
 */
export function useAlarmMonitor(): void {
  useEffect(() => {
    // モジュールレベルの subscribe がすでに登録されているため、
    // ここでの追加登録は不要。このフックはモジュールの確実なロードを保証する。
  }, [])
}
