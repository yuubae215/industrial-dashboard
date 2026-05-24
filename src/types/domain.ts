/**
 * ドメイン型定義 — industrial-dashboard のビジネス概念を型として表現する。
 *
 * SSOT 原則（ADR-005）：
 * - このファイルの型を Zustand ストアの state 型として使用する
 * - EngineeringValue・警告フラグ・表示文字列は state に含めない（毎回算出）
 */

import type { PlcRawValue, PortNumber, TimeoutMs } from './branded'

// ---------------------------------------------------------------------------
// アラーム管理（ADR-005 準拠: アラームイベントは保存可能な domain state）
// ---------------------------------------------------------------------------

/** アラームレベル。HH > H > L > LL の順で重篤度が高い。 */
export type AlarmLevel = 'HH' | 'H' | 'L' | 'LL'

/** 重篤度マップ（ソート・比較用） */
export const ALARM_SEVERITY: Record<AlarmLevel, number> = {
  HH: 4, H: 3, L: 2, LL: 1,
}

/** デバイスごとのアラームしきい値設定（PlcRawValue 単位）。 */
export interface AlarmThreshold {
  plcId: string
  address: number
  label: string
  unit: string
  HH?: PlcRawValue
  H?: PlcRawValue
  L?: PlcRawValue
  LL?: PlcRawValue
}

/**
 * アラームイベント記録（発生〜復旧〜確認のライフサイクル）。
 * これは "警告フラグ"（ADR-005 で禁止）ではなく、タイムスタンプ付きの domain state。
 */
export interface AlarmEntry {
  id: string
  plcId: string
  address: number
  level: AlarmLevel
  triggerValue: PlcRawValue
  triggeredAt: number
  clearedAt: number | null
  acknowledgedAt: number | null
}

// ---------------------------------------------------------------------------
// トレンド履歴（ADR-005 準拠: PlcRawValue + タイムスタンプ — 保存許可済み）
// ---------------------------------------------------------------------------

/** リングバッファの 1 ポイント。EngineeringValue ではなく PlcRawValue のまま保存。 */
export interface TrendPoint {
  timestamp: number
  value: PlcRawValue
}

// ---------------------------------------------------------------------------
// Watch Window 固定スロット（ADR-004 準拠）
// ---------------------------------------------------------------------------

/** Watch Window の固定スロットインデックス（0–9、不変）。 */
export type WatchSlotIndex = 0|1|2|3|4|5|6|7|8|9

export interface WatchSlot {
  index: WatchSlotIndex
  address: number | null
  deviceCode: string
  plcId: string | null
  comment: string
  /** true のとき、このスロットの信号をトレンドチャートに表示する */
  isActive: boolean
}

// ---------------------------------------------------------------------------
// PLC 接続設定
// ---------------------------------------------------------------------------

export interface PlcConfig {
  host: string
  port: PortNumber
  timeoutMs: TimeoutMs
}

// ---------------------------------------------------------------------------
// PLC 読み取り結果（SSOT として保存する型）
// ---------------------------------------------------------------------------

export interface PlcReadResult {
  /** PLC から受信した生値の配列（SSOT）。 */
  values: PlcRawValue[]
  /** 受信タイムスタンプ（Unix ミリ秒）。 */
  timestamp: number
}

// ---------------------------------------------------------------------------
// 接続状態
// ---------------------------------------------------------------------------

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'timeout'
  | 'error'

// ---------------------------------------------------------------------------
// コードガバナンス：イエロー/レッドカード（ADR-006）
// ---------------------------------------------------------------------------

/**
 * ガバナンス上の違反グレード。
 * これはランタイムのUIアラートではなく、開発プロセスの違反分類。
 */
export type GovernanceGrade = 'yellow' | 'red'

/**
 * イエローカードの記録エントリ（docs/governance/yellow-cards.md に対応）。
 * カウントが 3 を超えるとレッドカード化し、contracts への昇華トリガーになる。
 */
export interface YellowCardEntry {
  id: string
  pattern: string
  locations: string[]
  count: number
  detectedAt: string
}

// ---------------------------------------------------------------------------
// UI レイヤー：固定スロット（ADR-004）
// ---------------------------------------------------------------------------

/** フッターの 4 固定スロットのインデックス。入れ替えは禁止（ADR-004）。 */
export type FooterSlotIndex = 0 | 1 | 2 | 3

export interface FooterSlot {
  index: FooterSlotIndex
  label: string
  disabled: boolean
  onClick: () => void
}
