import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlcRawValue } from '../types/branded'

// ---------------------------------------------------------------------------
// SignalConfig — 閾値の唯一のオーナー (SSOT)
// ADR-010: useAlarmStore.thresholds[] から移管
// ---------------------------------------------------------------------------

export interface SignalConfig {
  plcId: string
  address: number
  label: string
  unit: string
  HH?: PlcRawValue
  H?: PlcRawValue
  L?: PlcRawValue
  LL?: PlcRawValue
}

interface SignalConfigState {
  configs: SignalConfig[]

  setSignalConfig: (config: SignalConfig) => void
  getSignalConfig: (plcId: string, address: number) => SignalConfig | undefined
}

export const useSignalConfigStore = create<SignalConfigState>()(
  persist(
    (set, get) => ({
      configs: [],

      setSignalConfig: (config) =>
        set((state) => {
          const idx = state.configs.findIndex(
            (c) => c.plcId === config.plcId && c.address === config.address,
          )
          const updated =
            idx >= 0
              ? state.configs.map((c, i) => (i === idx ? config : c))
              : [...state.configs, config]
          return { configs: updated }
        }),

      getSignalConfig: (plcId, address) =>
        get().configs.find((c) => c.plcId === plcId && c.address === address),
    }),
    { name: 'signal-configs' },
  ),
)
