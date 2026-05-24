# ADR-010: ストア責務の分離 — シグナル設定ストアとトレンド表示ストアの導入

## Status

Proposed (2026-05-24)

## Context

WatchWindow はもともと「デバイスアドレスの現在値を監視するデバッグウィンドウ」として設計された。
その後、トレンドグラフ表示機能（`isActive`, `comment`）とアラーム閾値設定（`thresholdHH/H/L/LL`）が
`WatchSlot` に順次追加された結果、1 つのエンティティが 3 つの異なる関心事を抱えることになった。

```
WatchSlot（現状）
├─ address, deviceCode, plcId  ← (A) 画面レイアウト情報（「どのスロットがどのアドレスを表示するか」）
├─ comment, isActive           ← (B) トレンド表示設定（「グラフに出すか・ラベルは何か」）
└─ thresholdHH/H/L/LL         ← (C) アラーム閾値（デバイスのドメイン設定）
```

(A)〜(C) はライフサイクル・永続化戦略・オーナーがそれぞれ異なる関心事であるにもかかわらず、
同一エンティティに混在していた。これにより以下の問題が顕在化した。

**直接のバグ（SSOT 違反）:**  
`useDeviceConfig` フックが非同期で `config_load` から閾値を `useAlarmStore.thresholds` に書き込む一方、
`WatchSlot.threshold*`（localStorage 由来）は別経路で管理されていた。  
- 参照元: `src/store/useAlarmStore.ts:47–110`（`_processNewValues`）
- 参照元: `src/hooks/useDeviceConfig.ts:9–25`（`configToThresholds`）
- 参照元: `src/components/WatchWindow.tsx:72–79`（mount useEffect）

非同期ロードのタイミングに依存して「実際にアラーム評価に使われる閾値」と
「WatchWindow の閾値列に表示される値」が乖離し、閾値を設定していないのにアラームが発火する現象が生じた。

**構造的問題:**  
- `useAlarmStore` が `thresholds: AlarmThreshold[]` と `entries: AlarmEntry[]` を同居させており、
  「設定」と「イベントログ」という性質が異なるデータが同一ストアに存在する
- `useDebugStore` の `WatchSlot` が (A)(B)(C) を混在させているため、ストア名が「監視設定」とも
  「シグナル設定」とも言い切れず、責務境界が曖昧になっている

## Options Considered

| Option | 説明 | 問題点 |
|--------|------|--------|
| A. WatchSlot に閾値ソース優先順位を付与 | `source: 'config' \| 'user'` フラグを追加し、user 設定が config より優先されるようにする | 根本的な二重管理を温存したまま複雑性だけが増す |
| B. useAlarmStore に persist を付与 | alarmStore を localStorage に永続化し WatchSlot の threshold* を廃止する | AlarmEntry（イベントログ）まで永続化され、起動時に過去のアラーム状態が復元される意図せぬ副作用が生じる |
| C. ストアを責務で分離（採用） | 閾値のオーナーを独立した `useSignalConfigStore` に移管し、各ストアを単一関心事に限定する | — |

## Decision

**Option C を採用する。** ストアを以下の 4 つの関心事に明確に分離する。

```
┌──────────────────────────────────────────────────────────────────────┐
│                   【 Zustand ストア責務境界 (目標状態) 】              │
└──────────────────────────────────────────────────────────────────────┘

 ✦ useSignalConfigStore  (新規, persist あり)
 ┌─────────────────────────────────────────────────────────────┐
 │ SignalConfig                                                 │
 │  plcId + address  ← 複合キー                                │
 │  label, unit      ← シグナルのメタデータ                    │
 │  HH / H / L / LL ← 閾値の唯一のオーナー（SSOT）            │
 └──────────────────────────────┬──────────────────────────────┘
                                │ 閾値を参照
                    ┌───────────┴────────────────┐
                    ▼                            ▼
 ✦ useAlarmStore (縮小, no-persist)   ✦ WatchWindow (UI)
 ┌──────────────────────────────┐       閾値列は useSignalConfigStore
 │ AlarmEntry (イベントログのみ) │       を直接読み書きする
 │  id, level                   │
 │  triggeredAt / clearedAt     │
 │  ※ thresholds[] は削除       │
 └──────────────────────────────┘

 ✦ useDebugStore (縮小, persist あり)
 ┌──────────────────────────────────────────────────────────────┐
 │ WatchSlot (画面レイアウト情報のみ)                           │
 │  index, address, deviceCode, plcId                           │
 │  isActive  ← トレンドグラフ表示 ON/OFF                       │
 │  comment   ← 表示ラベル（将来 useTrendConfigStore へ移管）   │
 │  ※ thresholdHH/H/L/LL は削除                                │
 └──────────────────────────────────────────────────────────────┘

 ✦ useTrendConfigStore  (将来フェーズ, persist あり)           ← Phase 2
 ┌─────────────────────────────────────────────────────────────┐
 │ TrendConfig                                                  │
 │  address ← キー                                             │
 │  label, unit, color, scale                                  │
 │  ※ WatchSlot.comment / isActive の移管先                    │
 └─────────────────────────────────────────────────────────────┘
```

### データフロー（閾値）

```
[devices.config.json]
        │
        │ config_load (Tauri IPC)
        ▼
useDeviceConfig フック
        │
        │ setSignalConfig()
        ▼
useSignalConfigStore  ←── setSignalConfig() ── WatchWindow (ユーザー入力)
        │
        │ getSignalConfig(plcId, address)
        ▼
useAlarmStore._processNewValues()  → AlarmEntry を生成
```

### Phase 1（今回の ADR の実装スコープ）

1. `useSignalConfigStore` を新規作成し、`SignalConfig` エンティティと CRUD を定義する
2. `useDeviceConfig` フックの書き込み先を `useAlarmStore.setThreshold` から `useSignalConfigStore.setSignalConfig` に変更する
3. `useAlarmStore` から `thresholds: AlarmThreshold[]` と `setThreshold` を削除し、アラーム評価時は `useSignalConfigStore.getState()` を参照する
4. `WatchSlot` から `thresholdHH / thresholdH / thresholdL / thresholdLL` フィールドを削除する
5. `WatchWindow` の閾値列 UI を `useSignalConfigStore` に対して直接読み書きするよう修正する
6. `domain.ts` の `AlarmThreshold` 型を `SignalConfig` に改名する（またはそのまま `useSignalConfigStore` 内部に閉じ込める）

### Phase 2（次期 ADR で決定）

- `WatchSlot.comment` と `WatchSlot.isActive` を `useTrendConfigStore` に移管する
- `WatchSlot` を「スロット番号とアドレスの対応表」のみに縮小する

## Implementation Prohibitions

- **`WatchSlot` に閾値フィールドを再追加することを禁止する。** 閾値に関するいかなるフィールドも `useSignalConfigStore` のみに配置しなければならない。🟥 Red Card
- **`useAlarmStore` に設定データ（閾値・シグナルメタデータ）を持たせることを禁止する。** `useAlarmStore` はイベントログ（AlarmEntry）専用とする。🟥 Red Card
- **コンポーネントが `useAlarmStore.thresholds` を直接参照することを禁止する。** 閾値の読み取りは `useSignalConfigStore` 経由のみとする。🟥 Red Card
- **`useSignalConfigStore` と `useDebugStore` を単一ストアにまとめることを禁止する。** 「画面レイアウト」と「ドメイン設定」は異なるライフサイクルを持つ。🟥 Red Card

## Yellow Card Resolution

該当なし（新規パターンの予防的設計）

## Consequences

### 更新が必要なファイル（Phase 1）

| ファイル | 変更内容 |
|---------|---------|
| `src/types/domain.ts` | `WatchSlot` の `threshold*` フィールド削除。`AlarmThreshold` 型を `SignalConfig` に改名または `useSignalConfigStore` 内部に移動 |
| `src/store/useAlarmStore.ts` | `thresholds: AlarmThreshold[]`・`setThreshold` を削除。`_processNewValues` の閾値参照を `useSignalConfigStore.getState()` に変更 |
| `src/store/useSignalConfigStore.ts` | **新規作成**。`SignalConfig` 型・`setSignalConfig`・`getSignalConfig` を定義 |
| `src/hooks/useDeviceConfig.ts` | `setThreshold` 呼び出しを `setSignalConfig` に変更 |
| `src/components/WatchWindow.tsx` | `buildThreshold`・`hasThreshold` を削除。閾値の読み書きを `useSignalConfigStore` に変更 |
| `src/components/MetricCard.tsx` | `threshold` prop / alarmStore 参照を `useSignalConfigStore` 参照に変更 |
| `docs/STATE_TRANSITIONS.md` | ストアフィールドの変更を反映 |
| `docs/ARCHITECTURE.md` | ストア責務境界図を更新 |

### 既存の挙動への影響

- アラーム閾値は `useSignalConfigStore`（persist あり）に保存されるため、アプリ再起動後も保持される
- `useAlarmStore`（no-persist）はイベントログのみを持つため、再起動時にアラーム履歴はリセットされる（既存挙動と同じ）
- `WatchSlot` に直接閾値を入力していたユーザーのデータは localStorage から移行されない（初回は再入力が必要）

## Related ADRs

- [PHILOSOPHY.md](../../PHILOSOPHY.md) — 三公理（Axiom 2: No SSOT in UI）
- [ADR-005](./adr-005-ssot-state-management.md) — SSOT 状態管理戦略（本 ADR の精神的基盤）
- [ADR-004](./adr-004-ux-fixed-slot-policy.md) — 固定スロットポリシー（WatchSlot の不変インデックス）
- [docs/contracts/domain-layer.md](../contracts/domain-layer.md) — ドメイン層契約
- [docs/STATE_TRANSITIONS.md](../STATE_TRANSITIONS.md) — 状態遷移図（Phase 1 完了後に更新必須）
