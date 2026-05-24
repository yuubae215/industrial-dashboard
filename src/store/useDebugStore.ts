import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchSlot, WatchSlotIndex } from '../types/domain'

const WATCH_SLOT_COUNT = 10

const makeEmptySlot = (index: number): WatchSlot => ({
  index: index as WatchSlotIndex,
  address: null,
  deviceCode: 'D',
  plcId: null,
})

interface DebugState {
  isMaintenanceMode: boolean
  /** 固定 10 スロット（ADR-004 — 長さ不変、インデックス不変） */
  slots: WatchSlot[]

  toggleMaintenanceMode: () => void
  /** スロット内容を部分更新する。インデックス自体は変更不可。 */
  updateSlot: (index: WatchSlotIndex, patch: Partial<Omit<WatchSlot, 'index'>>) => void
}

export const useDebugStore = create<DebugState>()(
  persist(
    (set) => ({
      isMaintenanceMode: false,
      slots: Array.from({ length: WATCH_SLOT_COUNT }, (_, i) => makeEmptySlot(i)),

      toggleMaintenanceMode: () =>
        set((state) => ({ isMaintenanceMode: !state.isMaintenanceMode })),

      updateSlot: (index, patch) =>
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.index !== index ? slot : { ...slot, ...patch },
          ),
        })),
    }),
    { name: 'watch-slots' }
  )
)
