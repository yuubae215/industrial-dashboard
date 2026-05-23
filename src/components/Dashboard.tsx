import { useState, useEffect } from 'react'
import { usePlcPolling } from '../hooks/usePlcPolling'
import { useAlarmMonitor } from '../store/useAlarmStore'
import { useAlarmStore } from '../store/useAlarmStore'
import { usePlcConfigStore, MELSEC_PLC_ID, KEYENCE_PLC_ID } from '../store/usePlcConfigStore'
import { AlarmPanel } from './AlarmPanel'
import { MetricCard } from './MetricCard'
import { RealtimeTrendChart } from './RealtimeTrendChart'
import { WatchWindow } from './WatchWindow'
import { Footer } from './Footer'
import { ConnectionSettings } from './ConnectionSettings'
import { theme } from '../styles/theme'
import { asThresholdValue } from '../types/branded'
import type { AlarmThreshold } from '../types/domain'
import { POLLING_INTERVAL_MS } from '../config/plc'

const MELSEC_ID = MELSEC_PLC_ID
const KEYENCE_ID = KEYENCE_PLC_ID
const START_ADDRESS = 1000
const READ_COUNT = 5
const INTERVAL_MS = POLLING_INTERVAL_MS

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const melsecConfig = usePlcConfigStore((s) => s.configs[MELSEC_ID])
  const keyenceConfig = usePlcConfigStore((s) => s.configs[KEYENCE_ID])

  // アラーム監視フックを明示的に初期化（モジュールロードの保証）
  useAlarmMonitor()

  // しきい値を起動時に登録（設定 UI が実装されるまでの初期値）
  const setThreshold = useAlarmStore((s) => s.setThreshold)
  useEffect(() => { setThreshold(MELSEC_THRESHOLD) }, [setThreshold])

  // PLC ポーリング開始
  usePlcPolling({
    plcId: MELSEC_ID,
    config: melsecConfig,
    protocol: 'mitsubishi',
    device: 'D',
    startAddress: START_ADDRESS,
    count: READ_COUNT,
    intervalMs: INTERVAL_MS,
  })
  usePlcPolling({
    plcId: KEYENCE_ID,
    config: keyenceConfig,
    protocol: 'keyence',
    device: 'DM',
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
        <WatchWindow plcConfig={melsecConfig} defaultPlcId={MELSEC_ID} />
      </main>

      {/* フッター — 4 固定スロット（ADR-004） */}
      <Footer
        onTrendToggle={() => setIsTrendVisible((v) => !v)}
        isTrendVisible={isTrendVisible}
        onSettingsOpen={() => setIsSettingsOpen(true)}
      />

      {/* 接続設定モーダル */}
      {isSettingsOpen && (
        <ConnectionSettings
          plcs={[
            { plcId: MELSEC_ID, label: '三菱 MELSEC (mitsubishi)' },
            { plcId: KEYENCE_ID, label: 'キーエンス KV (keyence)' },
          ]}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  )
}
