# ADR-005: SSOT 状態管理戦略

## ステータス

承認済み（Accepted: 2026-05-23）

## コンテキスト（背景）

産業用ダッシュボードでは複数 PLC から 500ms ごとにデータが流れ込む。このデータをどう保持するかの選択が、バグの温床になるかどうかを決定する。

過去に類似システムで発生したバグのパターン：
- PLC 生値をUIコンポーネントが受け取り、そのコンポーネント内で「前回値との差分」を加算して表示値を更新
- 通信エラー後の再接続時に前回値が残留し、誤った差分が加算され続ける
- 結果として表示値が現実と乖離し、オペレーターが誤判断する

この問題の根本原因は「差分の積み重ね（デルタ計算）」が状態として保存されることにある。

## 検討した選択肢

| 選択肢 | 説明 | 問題点 |
|--------|------|--------|
| A. 差分更新（コンポーネントローカル） | 各コンポーネントが前回値を保持して差分計算 | 状態が分散し自己増幅バグが発生する |
| B. グローバルストア（差分更新） | Redux 等でグローバルに前回値を保持して差分更新 | 差分積み重ねの問題は解決しない |
| C. SSOT + フォワード算出（採用） | PLC 生値のみを保存し、表示値は毎回純粋関数で算出 | 計算コストが毎フレーム発生するが、PLC データ量では無視できる |

## 意思決定

**SSOT + フォワード算出（選択肢 C）を採用する。**

状態管理の原則：

```
【保存してよいもの（SSOT）】
  - PLC から受信した生値: PlcRawValue[]
  - タイムスタンプ: number (Unix ms)
  - 接続状態: ConnectionStatus

【保存してはいけないもの（派生値）】
  - スケーリング済みの工学値（毎回算出すること）
  - 前回値との差分
  - 警告フラグ（しきい値との比較結果）
  - UI の表示用文字列（フォーマット済み値）
```

状態管理ライブラリは **Zustand** を採用する：
- 最小限の API でSSOT原則を強制しやすい
- React の外からも状態を読める（Tauri イベントリスナーとの親和性が高い）
- Redux より設定が少なく、Coding Agent が正しく扱いやすい

## ストアの構造（概要）

```typescript
interface PlcStore {
  // SSOT: PLC 生値のみ保存
  rawValues: Map<string, PlcRawValue[]>
  timestamps: Map<string, number>
  connectionStatus: Map<string, ConnectionStatus>

  // アクション（Tauri イベントから呼ばれる）
  updateRawValues: (plcId: string, values: PlcRawValue[], ts: number) => void
  setConnectionStatus: (plcId: string, status: ConnectionStatus) => void
}

// 表示値は derived（ゲッター）で毎回算出する
const engineeringValue = (raw: PlcRawValue, scale: number): EngineeringValue =>
  (raw * scale) as EngineeringValue
```

## 根拠

1. **バグの自己増幅を根絶:** 差分が蓄積されないため、通信エラー後の再接続で状態が自動的にクリーンになる
2. **予測可能性:** 同じ SSOT から同じ関数を通せば必ず同じ表示値になる（純粋関数の性質）
3. **AI 生成コードの安全性:** 「差分を加算する」という誘惑的なパターンをアーキテクチャレベルで禁じることで、Coding Agent が誤ったコードを生成しにくくなる

## 影響

- ブランド型（ADR-007）と組み合わせ：`PlcRawValue` と `EngineeringValue` を混ぜた計算はコンパイルエラーになる
- イエロー/レッドカード（ADR-006）との連動：差分計算パターンを発見したらイエローカードを発行する

## 関連 ADR

- [PHILOSOPHY.md](../../PHILOSOPHY.md) — 公理2（SSOT）
- [ADR-007](./adr-007-branded-types.md) — ブランド型
- [docs/contracts/domain-layer.md](../contracts/domain-layer.md) — ドメインレイヤー公準
