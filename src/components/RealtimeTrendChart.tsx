import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { usePlcStore } from '../store/usePlcStore'
import { theme, alarmLevelColor } from '../styles/theme'
import type { AlarmThreshold } from '../types/domain'

const WINDOW_SECONDS = 60

interface RealtimeTrendChartProps {
  plcId: string
  address: number
  scale?: number
  unit?: string
  threshold?: AlarmThreshold
}

export const RealtimeTrendChart: React.FC<RealtimeTrendChartProps> = ({
  plcId,
  address,
  scale = 1,
  unit = '',
  threshold,
}) => {
  const trendPoints = usePlcStore((s) => s.trendHistory[plcId]?.[address] ?? [])

  // [UI公準3] useMemo で描画用データを変換（16ms ブロック防止）
  const chartData = useMemo(
    () =>
      trendPoints.map((pt) => ({
        t: pt.timestamp,
        v: +(pt.value * scale).toFixed(scale < 1 ? 2 : 0),
      })),
    [trendPoints, scale],
  )

  // オシロスコープ: X軸を固定時間窓 [now-WINDOW, now] にピン留めして波形を左流し
  const windowMs = WINDOW_SECONDS * 1000
  const latestT = (chartData.length > 0 ? chartData[chartData.length - 1].t : null) ?? Date.now()
  const xDomain: [number, number] = [latestT - windowMs, latestT]

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

  // 相対ラベル: -60s, -45s, ..., 0s
  const formatXTick = (ts: number) => {
    const diff = Math.round((ts - latestT) / 1000)
    return `${diff}s`
  }

  if (chartData.length === 0) {
    return (
      <div
        style={{
          background: theme.bgCard,
          borderRadius: 4,
          padding: '16px 8px 8px',
          height: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: theme.textMuted, fontSize: 12, fontFamily: theme.fontMono }}>
          Waiting for data...
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        background: theme.bgCard,
        borderRadius: 4,
        padding: '12px 8px 8px',
        border: `1px solid ${theme.border}`,
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
            tickFormatter={(v) => `${v}${unit}`}
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
            formatter={(v) => [`${v}${unit}`, 'Value']}
          />
          {/* isAnimationActive=false 必須 — 500ms 更新でアニメーションが連続発火し CPU を消耗する */}
          <Line
            type="monotone"
            dataKey="v"
            stroke={theme.normal}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          {threshold?.HH !== undefined && (
            <ReferenceLine
              y={+(threshold.HH * scale).toFixed(2)}
              stroke={alarmLevelColor['HH']}
              strokeDasharray="4 2"
              label={{ value: 'HH', fill: alarmLevelColor['HH'], fontSize: 10 }}
            />
          )}
          {threshold?.H !== undefined && (
            <ReferenceLine
              y={+(threshold.H * scale).toFixed(2)}
              stroke={alarmLevelColor['H']}
              strokeDasharray="4 2"
              label={{ value: 'H', fill: alarmLevelColor['H'], fontSize: 10 }}
            />
          )}
          {threshold?.L !== undefined && (
            <ReferenceLine
              y={+(threshold.L * scale).toFixed(2)}
              stroke={alarmLevelColor['L']}
              strokeDasharray="4 2"
              label={{ value: 'L', fill: alarmLevelColor['L'], fontSize: 10 }}
            />
          )}
          {threshold?.LL !== undefined && (
            <ReferenceLine
              y={+(threshold.LL * scale).toFixed(2)}
              stroke={alarmLevelColor['LL']}
              strokeDasharray="4 2"
              label={{ value: 'LL', fill: alarmLevelColor['LL'], fontSize: 10 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
