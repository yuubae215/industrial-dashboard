import { create } from 'zustand'
import { asPlcRawValue, type PlcRawValue } from '../types/branded'
import type { ConnectionStatus } from '../types/domain'

interface PlcState {
  /** plcId → アドレス番号 → PlcRawValue の多重マップ（SSOT） */
  values: Record<string, Record<number, PlcRawValue>>
  connectionStatuses: Record<string, ConnectionStatus>

  updateRawValues: (plcId: string, startAddress: number, rawValues: number[]) => void
  setConnectionStatus: (plcId: string, status: ConnectionStatus) => void
}

export const usePlcStore = create<PlcState>((set) => ({
  values: {},
  connectionStatuses: {},

  updateRawValues: (plcId, startAddress, rawValues) =>
    set((state) => {
      const plcMap = { ...state.values[plcId] }
      rawValues.forEach((val, index) => {
        // [公理3] キャストはせず、必ずブランド型コンストラクタを通す
        plcMap[startAddress + index] = asPlcRawValue(val)
      })
      return { values: { ...state.values, [plcId]: plcMap } }
    }),

  setConnectionStatus: (plcId, status) =>
    set((state) => ({
      connectionStatuses: { ...state.connectionStatuses, [plcId]: status },
    })),
}))
