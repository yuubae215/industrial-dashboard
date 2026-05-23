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

  // [UI 公準3] useMemo で描画用データを変換（16ms ブロック防止）
  // PlcRawValue * number → number（ブランドは消えるが保存しない表示専用値）
  const chartData = useMemo(
    () =>
      trendPoints.map((pt) => ({
        t: pt.timestamp,
        v: +(pt.value * scale).toFixed(scale < 1 ? 2 : 0),
      })),
    [trendPoints, scale],
  )

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{ background: theme.bgCard, borderRadius: 8, padding: '16px 8px 8px' }}>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
          <XAxis
            dataKey="t"
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={formatTime}
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
            formatter={(v) => [`${v}${unit}`, '現在値']}
          />
          {/* isAnimationActive={false} は必須 — 500ms 更新でアニメーションが連続発火し CPU を消耗するため */}
          <Line
            type="monotone"
            dataKey="v"
            stroke={theme.accent}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          {threshold?.HH !== undefined && (
            <ReferenceLine
              y={threshold.HH * scale}
              stroke={alarmLevelColor['HH']}
              strokeDasharray="4 2"
              label={{ value: 'HH', fill: alarmLevelColor['HH'], fontSize: 10 }}
            />
          )}
          {threshold?.H !== undefined && (
            <ReferenceLine
              y={threshold.H * scale}
              stroke={alarmLevelColor['H']}
              strokeDasharray="4 2"
              label={{ value: 'H', fill: alarmLevelColor['H'], fontSize: 10 }}
            />
          )}
          {threshold?.L !== undefined && (
            <ReferenceLine
              y={threshold.L * scale}
              stroke={alarmLevelColor['L']}
              strokeDasharray="4 2"
              label={{ value: 'L', fill: alarmLevelColor['L'], fontSize: 10 }}
            />
          )}
          {threshold?.LL !== undefined && (
            <ReferenceLine
              y={threshold.LL * scale}
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
