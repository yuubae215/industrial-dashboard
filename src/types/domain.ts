/**
 * ドメイン型定義 — industrial-dashboard のビジネス概念を型として表現する。
 *
 * SSOT 原則（ADR-005）：
 * - このファイルの型を Zustand ストアの state 型として使用する
 * - EngineeringValue・警告フラグ・表示文字列は state に含めない（毎回算出）
 */

import type { PlcRawValue, PortNumber, TimeoutMs } from './branded'

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
