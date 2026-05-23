import { usePlcStore } from '../store/usePlcStore'
import { usePlcPolling } from '../hooks/usePlcPolling'
import type { PlcRawValue } from '../types/branded'
import type { ConnectionStatus } from '../types/domain'

// ---------------------------------------------------------------------------
// 純粋関数：生値 → 表示文字列（[公理2] 毎回算出、ストアには保存しない）
// ---------------------------------------------------------------------------

const formatTemperature = (raw: PlcRawValue | undefined): string =>
  raw === undefined ? '---' : `${(raw / 10).toFixed(1)} ℃`

const formatRaw = (raw: PlcRawValue | undefined): string =>
  raw === undefined ? '---' : String(raw)

const statusColor: Record<ConnectionStatus, string> = {
  connected: '#22c55e',
  connecting: '#f59e0b',
  disconnected: '#94a3b8',
  timeout: '#f97316',
  error: '#ef4444',
}

// ---------------------------------------------------------------------------
// サブコンポーネント
// ---------------------------------------------------------------------------

interface PlcCardProps {
  label: string
  plcId: string
  address: number
}

const PlcCard: React.FC<PlcCardProps> = ({ label, plcId, address }) => {
  const raw = usePlcStore((s) => s.values[plcId]?.[address])
  const status = usePlcStore((s) => s.connectionStatuses[plcId] ?? 'disconnected')

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 12px' }}>{label}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: statusColor[status],
          }}
        />
        <span style={{ fontSize: 13, color: '#64748b' }}>{status}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
        {formatTemperature(raw)}
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>
        D{address} 生値: {formatRaw(raw)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

const MELSEC_ID = 'melsec-line-a'
const KEYENCE_ID = 'kv-line-b'
const START_ADDRESS = 1000
const READ_COUNT = 5
const INTERVAL_MS = 500

export const Dashboard: React.FC = () => {
  // MCプロトコル一本化 — メーカー問わず同じフックで処理が完結する
  usePlcPolling({ plcId: MELSEC_ID, startAddress: START_ADDRESS, count: READ_COUNT, intervalMs: INTERVAL_MS })
  usePlcPolling({ plcId: KEYENCE_ID, startAddress: START_ADDRESS, count: READ_COUNT, intervalMs: INTERVAL_MS })

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
        産業用リアルタイムダッシュボード
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>
        MCプロトコル（3E フレーム）統一 — 500 ms ポーリング
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PlcCard label="三菱 MELSEC (Line A)" plcId={MELSEC_ID} address={START_ADDRESS} />
        <PlcCard label="キーエンス KV (Line B / MC互換)" plcId={KEYENCE_ID} address={START_ADDRESS} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// スタイル定数（インライン — CSS-in-JS モジュール未導入のため）
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: '40px auto',
  padding: '0 20px',
  fontFamily: 'system-ui, sans-serif',
}

const cardStyle: React.CSSProperties = {
  flex: '1 1 280px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 20,
  background: '#fff',
  boxShadow: '0 1px 3px rgba(0,0,0,.08)',
}
