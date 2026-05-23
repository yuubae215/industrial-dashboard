import { useState, useEffect } from 'react'
import { usePlcPolling } from '../hooks/usePlcPolling'
import { useAlarmMonitor } from '../store/useAlarmStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { AlarmPanel } from './AlarmPanel'
import { MetricCard } from './MetricCard'
import { RealtimeTrendChart } from './RealtimeTrendChart'
import { WatchWindow } from './WatchWindow'
import { Footer } from './Footer'
import { theme } from '../styles/theme'
import { asPortNumber, asTimeoutMs, asThresholdValue } from '../types/branded'
import type { PlcConfig, AlarmThreshold } from '../types/domain'

// ---------------------------------------------------------------------------
// 接続設定（設定ファイル/設定 UI から読み込む将来形を見据えて定数として集約）
// ---------------------------------------------------------------------------

const MELSEC_ID = 'melsec-line-a'
const KEYENCE_ID = 'kv-line-b'
const START_ADDRESS = 1000
const READ_COUNT = 5
const INTERVAL_MS = 500

const MELSEC_CONFIG: PlcConfig = {
  host: '127.0.0.1',
  port: asPortNumber(8502),
  timeoutMs: asTimeoutMs(3000),
}

const KEYENCE_CONFIG: PlcConfig = {
  host: '127.0.0.1',
  port: asPortNumber(8503),
  timeoutMs: asTimeoutMs(3000),
}

const MELSEC_THRESHOLD: AlarmThreshold = {
  plcId: MELSEC_ID,
  address: START_ADDRESS,
  label: '三菱 Line A 炉温',
  unit: '℃',
  HH: asThresholdValue(2500), // 250.0 ℃
  H: asThresholdValue(2000),  // 200.0 ℃
  L: asThresholdValue(500),   //  50.0 ℃
  LL: asThresholdValue(200),  //  20.0 ℃
}

// ---------------------------------------------------------------------------
// 現在時刻表示（純粋関数 — state に保存しない）
// ---------------------------------------------------------------------------

function useCurrentTime(): string {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('ja-JP'))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('ja-JP')), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

export const Dashboard: React.FC = () => {
  const [isTrendVisible, setIsTrendVisible] = useState(false)

  // アラーム監視フックを明示的に初期化（モジュールロードの保証）
  useAlarmMonitor()

  // しきい値を起動時に登録（設定 UI が実装されるまでの初期値）
  const setThreshold = useAlarmStore((s) => s.setThreshold)
  useEffect(() => { setThreshold(MELSEC_THRESHOLD) }, [setThreshold])

  // PLC ポーリング開始
  usePlcPolling({
    plcId: MELSEC_ID,
    config: MELSEC_CONFIG,
    device: 'D',
    startAddress: START_ADDRESS,
    count: READ_COUNT,
    intervalMs: INTERVAL_MS,
  })
  usePlcPolling({
    plcId: KEYENCE_ID,
    config: KEYENCE_CONFIG,
    device: 'D',
    startAddress: START_ADDRESS,
    count: READ_COUNT,
    intervalMs: INTERVAL_MS,
  })

  const currentTime = useCurrentTime()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.bg,
        color: theme.text,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.fontMono,
      }}
    >
      {/* アラームパネル（発生中アラームがある場合のみ表示） */}
      <AlarmPanel />

      {/* メインコンテンツ */}
      <main style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ヘッダ */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.border}`,
            paddingBottom: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: theme.text,
              }}
            >
              産業用リアルタイムダッシュボード
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: theme.textMuted }}>
              MC プロトコル 3E フレーム — {INTERVAL_MS}ms ポーリング
            </p>
          </div>
          <span
            style={{
              fontSize: 18,
              fontFamily: theme.fontMono,
              color: theme.accent,
              fontWeight: 600,
            }}
          >
            {currentTime}
          </span>
        </header>

        {/* メトリクスグリッド */}
        <section style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <MetricCard
            label="三菱 MELSEC (Line A) — 炉温"
            plcId={MELSEC_ID}
            address={START_ADDRESS}
            scale={0.1}
            unit="℃"
            threshold={MELSEC_THRESHOLD}
          />
          <MetricCard
            label="キーエンス KV (Line B)"
            plcId={KEYENCE_ID}
            address={START_ADDRESS}
            scale={1}
          />
        </section>

        {/* トレンドグラフ（フッター Slot 2 でトグル） */}
        {isTrendVisible && (
          <section>
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: 14,
                fontWeight: 600,
                color: theme.textMuted,
              }}
            >
              リアルタイムトレンド — {MELSEC_ID} D{START_ADDRESS}
            </h2>
            <RealtimeTrendChart
              plcId={MELSEC_ID}
              address={START_ADDRESS}
              scale={0.1}
              unit="℃"
              threshold={MELSEC_THRESHOLD}
            />
          </section>
        )}

        {/* デバッグ Watch Window（保守モード時のみ表示） */}
        <WatchWindow plcConfig={MELSEC_CONFIG} defaultPlcId={MELSEC_ID} />
      </main>

      {/* フッター — 4 固定スロット（ADR-004） */}
      <Footer
        onTrendToggle={() => setIsTrendVisible((v) => !v)}
        isTrendVisible={isTrendVisible}
      />
    </div>
  )
}
