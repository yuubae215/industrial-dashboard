# ドメインレイヤー公準

> この文書の禁止事項に違反した実装は 🟥 レッドカード（マージ拒絶）となる。

参照：[PHILOSOPHY.md](../../PHILOSOPHY.md) 公理1・2 / [ADR-005](../adr/adr-005-ssot-state-management.md) / [ADR-007](../adr/adr-007-branded-types.md)

---

## 公準 1：SSOT の厳守

**保存してよいもの（ストアの state）：**
- `PlcRawValue[]` — PLC から受信した生値
- `number`（Unix ms） — 受信タイムスタンプ
- `ConnectionStatus` — 接続状態の列挙型

**保存してはいけないもの（毎回算出すること）：**
- スケーリング済みの `EngineeringValue` ← 🟥
- 前回値との差分・変化量 ← 🟥
- 警告フラグ（しきい値比較結果）← 🟥
- フォーマット済みの表示文字列 ← 🟥

---

## 公準 2：ブランド型の使用義務

**許可：**
- `branded.ts` のコンストラクタ関数（`asPlcRawValue()` 等）を使って型付き値を生成する

**禁止：**
- `PlcRawValue` と `EngineeringValue` を算術演算で混用する ← 🟥
- `as unknown as TargetType` でブランド型を強制キャストする ← 🟥
- `number` を直接 `PlcRawValue` 型変数に代入する ← 🟥

---

## 公準 3：バリデーション境界

バリデーション（値域チェック・存在確認）は **システム境界のみ** で行う：
- Tauri コマンドの引数受け取り時（Rust 側）
- Tauri コマンドのレスポンスを受け取った直後（TS 側の `invoke()` コールバック）

**禁止：**
- ドメイン層の純粋関数（変換関数・ゲッター）内でバリデーションを行う ← 🟥
- コンポーネントの `render` 内でバリデーションエラーのフォールバック処理を書く ← 🟥

---

## 公準 4：状態遷移の原則

**ConnectionStatus の遷移：**

```
Disconnected → Connecting → Connected → Disconnecting → Disconnected
                                ↓
                            Error（リトライ待ち）
```

- 上記遷移図に存在しない直接遷移（例: `Connected → Disconnected` のスキップ）は禁止 ← 🟥
- エラー状態からの自動リトライは Rust 側（ADR-003 の exponential backoff）が担う
- フロントエンドはリトライの UI を提供するが、タイミング制御を持ってはならない ← 🟥
