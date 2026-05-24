import { useEffect } from 'react'
import { create } from 'zustand'
import { usePlcStore } from './usePlcStore'
import { useDebugStore } from './useDebugStore'
import { useSignalConfigStore } from './useSignalConfigStore'
import type { AlarmEntry, AlarmLevel } from '../types/domain'
import type { PlcRawValue } from '../types/branded'
import type { SignalConfig } from './useSignalConfigStore'

interface AlarmState {
  entries: AlarmEntry[]

  acknowledgeAlarm: (id: string) => void
  _processNewValues: (plcId: string, addressMap: Record<number, PlcRawValue>) => void
}

function evaluateLevel(raw: PlcRawValue, config: SignalConfig): AlarmLevel | null {
  if (config.HH !== undefined && raw >= config.HH) return 'HH'
  if (config.H  !== undefined && raw >= config.H)  return 'H'
  if (config.LL !== undefined && raw <= config.LL) return 'LL'
  if (config.L  !== undefined && raw <= config.L)  return 'L'
  return null
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  entries: [],

  acknowledgeAlarm: (id) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, acknowledgedAt: Date.now() } : e
      ),
    })),

  _processNewValues: (plcId, addressMap) => {
    const { entries } = get()
    const { slots } = useDebugStore.getState()
    const { configs } = useSignalConfigStore.getState()
    const now = Date.now()

    // WatchSlot に登録済みのアドレスのみアラームを評価する
    const watchedAddresses = new Set(
      slots.filter(s => s.plcId === plcId && s.address !== null).map(s => s.address as number)
    )

    const nextEntries = [...entries]
    let changed = false

    for (const config of configs) {
      if (config.plcId !== plcId) continue
      const raw = addressMap[config.address]
      if (raw === undefined) continue

      const levels: AlarmLevel[] = ['HH', 'H', 'L', 'LL']
      for (const level of levels) {
        if (config[level] === undefined) continue

        const alarmKey = `${plcId}:${config.address}:${level}`

        // ES2020 compatible findLastIndex
        const activeIdx = (() => {
          for (let i = nextEntries.length - 1; i >= 0; i--) {
            if (nextEntries[i].id.startsWith(alarmKey) && nextEntries[i].clearedAt === null) return i
          }
          return -1
        })()

        // WatchSlot 未登録アドレス: アクティブアラームがあれば解除してスキップ
        if (!watchedAddresses.has(config.address)) {
          if (activeIdx >= 0) {
            nextEntries[activeIdx] = { ...nextEntries[activeIdx], clearedAt: now }
            changed = true
          }
          continue
        }

        const triggered = evaluateLevel(raw, config) === level

        if (triggered && activeIdx === -1) {
          nextEntries.push({
            id: `${alarmKey}:${now}`,
            plcId,
            address: config.address,
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
usePlcStore.subscribe((state) => {
  const { _processNewValues } = useAlarmStore.getState()
  for (const plcId of Object.keys(state.values)) {
    _processNewValues(plcId, state.values[plcId])
  }
})

/**
 * アラーム監視フックを初期化する。
 * App.tsx でレンダーツリーのルートで一度だけ呼ぶ。
 */
export function useAlarmMonitor(): void {
  useEffect(() => {
    // モジュールレベルの subscribe がすでに登録されているため、
    // このフックはモジュールの確実なロードを保証する。
  }, [])
}
