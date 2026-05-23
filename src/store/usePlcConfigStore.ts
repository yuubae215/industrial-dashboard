import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { asPortNumber, asTimeoutMs } from '../types/branded'
import type { PlcConfig } from '../types/domain'
import { MELSEC_CONFIG, KEYENCE_CONFIG } from '../config/plc'

export const MELSEC_PLC_ID = 'melsec-line-a'
export const KEYENCE_PLC_ID = 'kv-line-b'

interface PlcConfigState {
  configs: Record<string, PlcConfig>
  updateConfig: (plcId: string, host: string, port: number, timeoutMs: number) => void
}

export const usePlcConfigStore = create<PlcConfigState>()(
  persist(
    (set) => ({
      configs: {
        [MELSEC_PLC_ID]: MELSEC_CONFIG,
        [KEYENCE_PLC_ID]: KEYENCE_CONFIG,
      },
      updateConfig: (plcId, host, port, timeoutMs) =>
        set((state) => ({
          configs: {
            ...state.configs,
            [plcId]: {
              host,
              port: asPortNumber(port),
              timeoutMs: asTimeoutMs(timeoutMs),
            },
          },
        })),
    }),
    { name: 'plc-config' }
  )
)
