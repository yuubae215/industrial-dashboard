import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// TrendConfig — トレンド表示設定の唯一のオーナー (SSOT)
// ADR-010 Phase 2: useDebugStore (WatchSlot.comment / isActive) から移管
// ---------------------------------------------------------------------------

export interface TrendConfig {
  plcId: string
  address: number
  label: string
  isActive: boolean
}

interface TrendConfigState {
  configs: TrendConfig[]

  setTrendConfig: (plcId: string, address: number, patch: Partial<Omit<TrendConfig, 'plcId' | 'address'>>) => void
  getTrendConfig: (plcId: string, address: number) => TrendConfig | undefined
}

export const useTrendConfigStore = create<TrendConfigState>()(
  persist(
    (set, get) => ({
      configs: [],

      setTrendConfig: (plcId, address, patch) =>
        set((state) => {
          const idx = state.configs.findIndex(
            (c) => c.plcId === plcId && c.address === address,
          )
          if (idx >= 0) {
            return {
              configs: state.configs.map((c, i) =>
                i === idx ? { ...c, ...patch } : c,
              ),
            }
          }
          return {
            configs: [
              ...state.configs,
              { plcId, address, label: '', isActive: false, ...patch },
            ],
          }
        }),

      getTrendConfig: (plcId, address) =>
        get().configs.find((c) => c.plcId === plcId && c.address === address),
    }),
    { name: 'trend-configs' },
  ),
)
