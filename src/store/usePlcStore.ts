import { create } from 'zustand'
import { asPlcRawValue, type PlcRawValue } from '../types/branded'
import type { ConnectionStatus, TrendPoint } from '../types/domain'

const TREND_MAX_POINTS = 300 // ~2.5 分 @ 500ms

interface PlcState {
  /** plcId → アドレス → PlcRawValue（SSOT） */
  values: Record<string, Record<number, PlcRawValue>>
  connectionStatuses: Record<string, ConnectionStatus>
  /** plcId → アドレス → TrendPoint[] リングバッファ（PlcRawValue + タイムスタンプ） */
  trendHistory: Record<string, Record<number, TrendPoint[]>>

  updateRawValues: (plcId: string, startAddress: number, rawValues: number[]) => void
  setConnectionStatus: (plcId: string, status: ConnectionStatus) => void
}

export const usePlcStore = create<PlcState>((set) => ({
  values: {},
  connectionStatuses: {},
  trendHistory: {},

  updateRawValues: (plcId, startAddress, rawValues) =>
    set((state) => {
      const now = Date.now()
      const plcMap = { ...state.values[plcId] }
      const plcTrend = { ...state.trendHistory[plcId] }

      rawValues.forEach((val, index) => {
        const address = startAddress + index
        // [公理3] キャストはせず、必ずブランド型コンストラクタを通す
        const branded = asPlcRawValue(val)
        plcMap[address] = branded

        // リングバッファ: TrendPoint は PlcRawValue + タイムスタンプ（ADR-005 保存許可）
        const existing = plcTrend[address] ?? []
        const point: TrendPoint = { timestamp: now, value: branded }
        const updated = existing.length >= TREND_MAX_POINTS
          ? [...existing.slice(1), point]
          : [...existing, point]
        plcTrend[address] = updated
      })

      return {
        values: { ...state.values, [plcId]: plcMap },
        trendHistory: { ...state.trendHistory, [plcId]: plcTrend },
      }
    }),

  setConnectionStatus: (plcId, status) =>
    set((state) => ({
      connectionStatuses: { ...state.connectionStatuses, [plcId]: status },
    })),
}))
