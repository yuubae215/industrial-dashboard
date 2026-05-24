import { create } from 'zustand'
import type { WatchSlot, WatchSlotIndex } from '../types/domain'

const WATCH_SLOT_COUNT = 10

const makeEmptySlot = (index: number): WatchSlot => ({
  index: index as WatchSlotIndex,
  address: null,
  deviceCode: 'D',
  plcId: null,
  comment: '',
  isActive: false,
})

interface DebugState {
  isMaintenanceMode: boolean
  /** 固定 10 スロット（ADR-004 — 長さ不変、インデックス不変） */
  slots: WatchSlot[]

  toggleMaintenanceMode: () => void
  /** スロット内容を部分更新する。インデックス自体は変更不可。address が null になる場合は isActive も false にリセットする。 */
  updateSlot: (index: WatchSlotIndex, patch: Partial<Omit<WatchSlot, 'index'>>) => void
  /** トレンドチャートへの表示 ON/OFF を切り替える。address と plcId が未設定のスロットは何もしない。 */
  toggleSlotActive: (index: WatchSlotIndex) => void
}

export const useDebugStore = create<DebugState>((set) => ({
  isMaintenanceMode: false,
  slots: Array.from({ length: WATCH_SLOT_COUNT }, (_, i) => makeEmptySlot(i)),

  toggleMaintenanceMode: () =>
    set((state) => ({ isMaintenanceMode: !state.isMaintenanceMode })),

  updateSlot: (index, patch) =>
    set((state) => ({
      slots: state.slots.map((slot) => {
        if (slot.index !== index) return slot
        // アドレスがクリアされたらトレンド表示も自動解除（孤立アクティブ防止）
        const clearActive = 'address' in patch && patch.address === null ? { isActive: false } : {}
        return { ...slot, ...patch, ...clearActive }
      }),
    })),

  toggleSlotActive: (index) =>
    set((state) => ({
      slots: state.slots.map((slot) => {
        if (slot.index !== index) return slot
        // address と plcId が確定しているスロットのみ有効化できる
        if (slot.address === null || slot.plcId === null) return slot
        return { ...slot, isActive: !slot.isActive }
      }),
    })),
}))
