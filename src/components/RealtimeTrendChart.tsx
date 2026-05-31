import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useDebugStore } from '../store/useDebugStore'
import { useSignalConfigStore } from '../store/useSignalConfigStore'
import { useTrendConfigStore } from '../store/useTrendConfigStore'
import { usePlcStore } from '../store/usePlcStore'
import { theme, alarmLevelColor } from '../styles/theme'
import { POLLING_INTERVAL_MS } from '../config/plc'
import type { WatchSlotIndex } from '../types/domain'

const WINDOW_SECONDS = 60

// ISA-101準拠: 低彩度・高識別性カラーパレット（最大10スロット分）
const LINE_COLORS = [
  '#0EA5E9', // cyan
  '#F59E0B', // amber
  '#6366F1', // indigo
  '#10B981', // emerald
  '#F43F5E', // rose
  '#8B5CF6', // violet
  '#06B6D4', // light cyan
  '#D97706', // dark amber
  '#3B82F6', // blue
  '#EC4899', // pink
]

/**
 * ウォッチウィンドウでアクティブ化された信号のマルチ信号トレンドチャート。
 * アクティブ状態は useTrendConfigStore、閾値は useSignalConfigStore から取得（ADR-010）。
 * 生値は usePlcStore の trendHistory から毎回算出する（公理2: UI に前回値を持たない）。
 */
export const RealtimeTrendChart: React.FC = () => {
  const slots = useDebugStore((s) => s.slots)
  const signalConfigs = useSignalConfigStore((s) => s.configs)
  const trendConfigs = useTrendConfigStore((s) => s.configs)
  const trendHistory = usePlcStore((s) => s.trendHistory)

  // アドレス・plcId が確定しトレンドがアクティブなスロットのみ抽出
  const activeSlots = useMemo(
    () =>
      slots.filter((s) => {
        if (s.address === null || s.plcId === null) return false
        const tc = trendConfigs.find((c) => c.plcId === s.plcId && c.address === s.address)
        return tc?.isActive ?? false
      }),
    [slots, trendConfigs],
  )

  // [UI公準3] useMemo: 全アクティブ信号のトレンドを統合タイムラインに合成
  const { chartData, signalKeys } = useMemo(() => {
    if (activeSlots.length === 0) return { chartData: [], signalKeys: [] }

    // スロットごとの信号キー（例: "D1000", "D1001"）
    const keys = activeSlots.map((s) => `${s.deviceCode}${s.address}`)

    // タイムスタンプ → 各信号の値マップを構築
    // 各アドレスは独立してポーリングされるため数ms のズレが生じる。
    // ポーリング周期単位に丸めることで複数信号を同じ行に収める。
    const bucket = (ts: number) => Math.round(ts / POLLING_INTERVAL_MS) * POLLING_INTERVAL_MS
    const tsMap = new Map<number, Record<string, number>>()
    activeSlots.forEach((slot, i) => {
      const points = trendHistory[slot.plcId!]?.[slot.address!] ?? []
      const key = keys[i]
      points.forEach((pt) => {
        const ts = bucket(pt.timestamp)
        const row = tsMap.get(ts) ?? {}
        row[key] = pt.value
        tsMap.set(ts, row)
      })
    })

    const sorted = Array.from(tsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([t, vals]) => ({ t, ...vals }))

    return { chartData: sorted, signalKeys: keys }
  }, [activeSlots, trendHistory])

  const latestT = chartData.length > 0
    ? (chartData[chartData.length - 1].t as number)
    : Date.now()
  const windowMs = WINDOW_SECONDS * 1000
  const xDomain: [number, number] = [latestT - windowMs, latestT]

  const formatXTick = (ts: number) => {
    const diff = Math.round((ts - latestT) / 1000)
    return `${diff}s`
  }

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

  if (activeSlots.length === 0) {
    return (
      <div
        style={{
          background: theme.bgCard,
          borderRadius: 4,
          padding: '16px 8px 8px',
          height: 220,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${theme.border}`,
        }}
      >
        <span style={{ color: theme.textMuted, fontSize: 12, fontFamily: theme.fontMono }}>
          No active signals — press ○ in the Watch Window to add a signal to the trend.
        </span>
      </div>
    )
  }

  // useSignalConfigStore から閾値参照線を取得（ADR-010 Phase 1）
  const referenceLines = activeSlots.flatMap((slot) => {
    const prefix = `${slot.deviceCode}${slot.address}`
    const sc = signalConfigs.find(
      (c) => c.plcId === slot.plcId && c.address === slot.address,
    )
    if (!sc) return []
    const lines: React.ReactElement[] = []
    const levelMap: Array<['HH' | 'H' | 'L' | 'LL', number | undefined]> = [
      ['HH', sc.HH],
      ['H',  sc.H],
      ['L',  sc.L],
      ['LL', sc.LL],
    ]
    for (const [level, val] of levelMap) {
      if (val === undefined) continue
      lines.push(
        <ReferenceLine
          key={`${slot.index as WatchSlotIndex}-${level}`}
          y={val}
          stroke={alarmLevelColor[level]}
          strokeDasharray="4 2"
          label={{ value: `${prefix} ${level}`, fill: alarmLevelColor[level], fontSize: 10 }}
        />,
      )
    }
    return lines
  })

  return (
    <div
      style={{
        background: theme.bgCard,
        borderRadius: 4,
        padding: '12px 8px 8px',
        border: `1px solid ${theme.border}`,
        minWidth: 0, // Flexbox/Grid直下でResponsiveContainerの無限幅計算を防御
      }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
          <XAxis
            dataKey="t"
            type="number"
            domain={xDomain}
            tickCount={7}
            tickFormatter={formatXTick}
            stroke={theme.border}
            tick={{ fontSize: 10, fontFamily: theme.fontMono, fill: theme.textMuted }}
          />
          <YAxis
            stroke={theme.border}
            tick={{ fontSize: 10, fontFamily: theme.fontMono, fill: theme.textMuted }}
          />
          <Tooltip
            contentStyle={{
              background: theme.bgHeader,
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              fontFamily: theme.fontMono,
              fontSize: 12,
              color: theme.text,
            }}
            labelFormatter={(t) => formatTime(t as number)}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: theme.fontMono, paddingTop: 4 }}
          />
          {signalKeys.map((key, i) => {
            const slot = activeSlots[i]
            const tc = trendConfigs.find(
              (c) => c.plcId === slot.plcId && c.address === slot.address,
            )
            const label = tc?.label.trim() || key
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                dot={false}
                strokeWidth={1.5}
                connectNulls
                // isAnimationActive=false 必須 — 500ms 更新でアニメーションが連続発火し CPU を消耗する
                isAnimationActive={false}
              />
            )
          })}
          {referenceLines}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
