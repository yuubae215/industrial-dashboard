/**
 * ブランド型定義 — 「混ぜるな危険」をコンパイルタイムで強制する。
 *
 * 使用ルール（ADR-007）：
 * - ブランド型の生成はこのファイルのコンストラクタ関数のみ許可
 * - `as unknown as TargetType` による強制キャストは禁止
 * - ブランドが異なる型の算術演算はコンパイルエラーになる
 */

// ---------------------------------------------------------------------------
// ブランド型の基底パターン
// ---------------------------------------------------------------------------

type Brand<T, B extends string> = T & { readonly _brand: B }

// ---------------------------------------------------------------------------
// PLC データ値
// ---------------------------------------------------------------------------

/** PLC から受信した生の整数値（スケーリング前・変換前）。SSOT として扱う。 */
export type PlcRawValue = Brand<number, 'PlcRawValue'>

/** スケーリング・単位換算済みの工学値。SSOT に保存してはならない（毎回算出）。 */
export type EngineeringValue = Brand<number, 'EngineeringValue'>

// ---------------------------------------------------------------------------
// PLC アドレス情報
// ---------------------------------------------------------------------------

/** PLC デバイス先頭番号（例：D1000 の 1000 の部分）。検証済みの正の整数。 */
export type DeviceAddress = Brand<number, 'DeviceAddress'>

/** TCP ポート番号（1–65535 の整数）。 */
export type PortNumber = Brand<number, 'PortNumber'>

/** タイムアウト値（ミリ秒、正の整数）。 */
export type TimeoutMs = Brand<number, 'TimeoutMs'>

// ---------------------------------------------------------------------------
// 通信 URL
// ---------------------------------------------------------------------------

/** `URL` コンストラクタで検証済みの URL 文字列。未検証の文字列と混用禁止。 */
export type SanitizedUrl = Brand<string, 'SanitizedUrl'>

// ---------------------------------------------------------------------------
// コンストラクタ関数（システム境界でのみ使用すること）
// ---------------------------------------------------------------------------

/** Tauri コマンドのレスポンスを PlcRawValue に変換する。境界でのみ呼ぶこと。 */
export function asPlcRawValue(n: number): PlcRawValue {
  return n as PlcRawValue
}

/** PlcRawValue にスケール係数を掛けて EngineeringValue に変換する。 */
export function toEngineeringValue(raw: PlcRawValue, scale: number): EngineeringValue {
  return (raw * scale) as EngineeringValue
}

/** デバイス先頭番号を検証して DeviceAddress に変換する。 */
export function asDeviceAddress(n: number): DeviceAddress {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`Invalid device address: ${n}`)
  }
  return n as DeviceAddress
}

/** ポート番号を検証して PortNumber に変換する。 */
export function asPortNumber(n: number): PortNumber {
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new RangeError(`Invalid port number: ${n}`)
  }
  return n as PortNumber
}

/** タイムアウト値を検証して TimeoutMs に変換する。 */
export function asTimeoutMs(n: number): TimeoutMs {
  if (!Number.isInteger(n) || n <= 0) {
    throw new RangeError(`Invalid timeout: ${n}`)
  }
  return n as TimeoutMs
}

/** URL 文字列を検証して SanitizedUrl に変換する。 */
export function asSanitizedUrl(raw: string): SanitizedUrl {
  new URL(raw) // 無効な場合は TypeError をスロー
  return raw as SanitizedUrl
}

/**
 * 設定フォームから受け取った整数をアラームしきい値（PlcRawValue）に変換する。
 * 設定境界（ユーザー入力）でのみ呼ぶこと。
 */
export function asThresholdValue(n: number): PlcRawValue {
  if (!Number.isInteger(n)) {
    throw new RangeError(`Threshold must be an integer: ${n}`)
  }
  return n as PlcRawValue
}
