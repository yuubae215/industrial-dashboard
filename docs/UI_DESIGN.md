# UI 設計書 — Industrial Dashboard

> 最終更新: 2026-05-31
> 対象読者: 開発者・AI エージェント・デザインレビュアー
> 上位規範: [PHILOSOPHY.md](../PHILOSOPHY.md) / [ARCHITECTURE.md](./ARCHITECTURE.md) / [ADR-008](./adr/adr-008-mobile-layout-and-slot-refinement.md) / [ADR-009](./adr/adr-009-form-layout-adaptation.md)

---

## 1. レイアウト全体像

### 1-1. デスクトップ (幅 ≥ 768px)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ MenuBar (28px)  File | Edit | PLC | View | Tools | Help                 │  ← [P1] プレースホルダー
├─────────────────────────────────────────────────────────────────────────┤
│ Toolbar (28px)  ▶CONNECT  ◼DISCONNECT │ 📈TREND  ⚙SETTINGS │ POLLING…  │  ← [D1] CONNECT/DISCONNECT
├────────┬────────────────────────────────────────────────┬───────────────┤
│ Acti-  │ LeftSidebar (220px, resizable)                 │ RightSidebar  │
│ vity   │  FIELD NETWORK                                 │ (260px, res.) │
│ Bar    │  ┌─ ⬅/▶ ⚙ 📈 🔧 ──────────────────────────┐ │               │
│ (40px) │  │ Slot0  Slot1  Slot2  Slot3              │ │  ACTIVE       │
│  📁    │  └────────────────────────────────────────┘ │  ALARMS       │
│  🔗    │  ┌─ MELSEC Q-Series ────────────────────┐   │  (scrollable) │
│  🔔    │  │  ● Protocol / IP / Port / Poll       │   │               │
│        │  └──────────────────────────────────────┘   │               │
│ [P2]   │  ┌─ Keyence KV-8000 ────────────────────┐   │               │
│        │  │  ● Protocol / IP / Port / Poll       │   │               │
│        │  └──────────────────────────────────────┘   │               │
│        ├────────────────────────────────────────────────┤               │
│        │  Main Content (flex: 1)                        │               │
│        │  RealtimeTrendChart (isTrendVisible=true 時)   │               │
│        │  DiagnosticPane (WatchWindow)                  │               │
├────────┴────────────────────────────────────────────────┴───────────────┤
│ StatusBar (20px)  MODE | POLLING | TAG COUNT                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1-2. モバイル (幅 < 768px)

```
┌─────────────────────────────────────────────────────────────┐
│ Header (48px)  INDUSTRIAL DASHBOARD    [⚡ API TEST]  HH:MM  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Main Content (flex: 1, overflow-y: auto)                   │
│  RealtimeTrendChart (isTrendVisible=true 時)                │
│  DiagnosticPane (WatchWindow)                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ FixedControlSlots — 横並びフッター (64px, 4-column grid)    │
│  [CONNECT]  [Settings]  [Trend]  [Maint. ON]                │
│   Slot 0     Slot 1     Slot 2    Slot 3                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. コンポーネント一覧と役割

| コンポーネント | ファイル | 表示条件 | 役割 |
|--------------|---------|---------|------|
| `MenuBar` | `MenuBar.tsx` | デスクトップのみ | GX Works 風メニューバー |
| `Toolbar` | `Toolbar.tsx` | デスクトップのみ | CONNECT/DISCONNECT/TREND/SETTINGS |
| `ActivityBar` | `ActivityBar.tsx` | デスクトップのみ | ビュー切り替えスイッチャー (縦アイコン列) |
| `LeftSidebar` | `LeftSidebar.tsx` | デスクトップのみ | FIELD NETWORK ツリー + FixedControlSlots vertical |
| `RightSidebar` | `RightSidebar.tsx` | デスクトップのみ | アクティブアラーム一覧 |
| `FixedControlSlots` | `FixedControlSlots.tsx` | 常時 (レイアウト可変) | 4 固定スロット操作面 |
| `DiagnosticPane` | `DiagnosticPane.tsx` | 常時 | WatchWindow + デバイス値表示 |
| `StatusBar` | `StatusBar.tsx` | デスクトップのみ | タグ数・モード表示 |
| `ConnectionSettings` | `ConnectionSettings.tsx` | モーダル | PLC 接続設定 (Host/Port/Timeout/per-device 接続) |
| `RealtimeTrendChart` | `RealtimeTrendChart.tsx` | `isTrendVisible=true` 時 | リアルタイムトレンドチャート |

---

## 3. FixedControlSlots — 4 固定スロット詳細

ADR-008 により、スロット番号・役割・順序は **レイアウト (横/縦) に関係なく不変**。

| スロット | 役割 | 横 (モバイルフッター) | 縦 (デスクトップサイドバー) |
|--------|------|-------------------|----------------------|
| Slot 0 | **CONNECT / DISCONNECT** | TouchButton "CONNECT" / "DISCONN" | IconButton ▶ / ◼ |
| Slot 1 | **SETTINGS** | TouchButton "Settings" | IconButton ⚙ |
| Slot 2 | **TREND** | TouchButton "Trend" / "Hide Trend" | IconButton 📈 |
| Slot 3 | **MAINTENANCE** | TouchButton "Maint. ON" / "Maint. OFF" | IconButton 🔧 |

### 禁止事項 (ADR-008)
- スロットを `isMobile` で追加/削除/並び替えしてはならない
- `display: none` でスロットを隠してはならない
- 2 箇所同時にレンダリングしてはならない

---

## 4. 複数箇所から同じ操作ができるアイコン (意図的な冗長性)

デスクトップでは同じ機能を複数の場所から操作できる。これはデスクトップ IDE のアクセシビリティ設計であり、意図的な冗長性。

| 機能 | 操作場所 A | 操作場所 B |
|------|-----------|-----------|
| **CONNECT / DISCONNECT** | `Toolbar` の CONNECT / DISCONNECT ボタン | `LeftSidebar` 内 FixedControlSlots vertical Slot 0 |
| **TREND チャート表示切替** | `Toolbar` の TREND ボタン | `LeftSidebar` 内 FixedControlSlots vertical Slot 2 |
| **Connection Settings を開く** | `Toolbar` の SETTINGS ボタン | `LeftSidebar` 内 FixedControlSlots vertical Slot 1 |

- **モバイルでは冗長性なし**: `Toolbar` / `LeftSidebar` が非表示のため、フッターの `FixedControlSlots horizontal` が唯一の操作面となる。

---

## 5. プレースホルダー箇所一覧

以下は現時点で **視覚的に存在するが機能が未実装** のプレースホルダー UI。将来の機能拡張のために予約されている。

### [P1] MenuBar のメニュー項目

- **ファイル**: `src/components/MenuBar.tsx`
- **表示**: File / Edit / PLC / View / Tools / Help のメニュー項目
- **現状**: クリックしても何も起きない。`onClick` ハンドラが未実装
- **将来**: PLC 設定ファイルのインポート/エクスポート、ビュー切り替え、ツール起動 等を割り当て予定

### [P2] ActivityBar のビュー切り替えアイコン

- **ファイル**: `src/components/ActivityBar.tsx`
- **表示**: 一番左の縦方向アイコン列 (📁 Explorer / 🔗 Network / 🔔 Alarms)
- **現状**: クリックすると `activityView` state が更新されアイコンのアクティブ色は変わるが、`LeftSidebar` のコンテンツが変わらないため視覚上は何も起きないように見える
- **将来**: 各ビューに応じて LeftSidebar に異なるコンテンツ (ファイルツリー / ネットワーク構成 / アラーム一覧) を表示予定

### [P3] RightSidebar (モバイルでは非表示)

- **現状**: モバイルでは `{!isMobile && <RightSidebar />}` で完全に非表示
- **ADR-008 §5 記載**: モバイルでは "compact fixed-height (140px) scrollable panel above the footer" として表示する予定が、現時点では未実装
- **将来**: アクティブアラーム一覧をモバイルでも表示予定

---

## 6. ConnectionSettings モーダル

### 6-1. レイアウト適応 (ADR-009)

| 要素 | デスクトップ | モバイル |
|------|-----------|---------|
| 位置 | 画面中央, width 520px | 画面下部から上, full-width, borderRadius 12px 12px 0 0 |
| フォームレイアウト | 3 カラムグリッド (Host wide / Port 110px / Timeout 130px) | 縦スタック, 各フィールド full-width |
| 入力フィールド高さ | デフォルト padding | minHeight 44px (グローブ操作対応) |
| ボタン順序 | Cancel (左) → Save & Apply (右) | Save & Apply (上, CSS order:1) → Cancel (下) |

### 6-2. per-device 接続制御 (実装予定)

各デバイスセクションのヘッダに接続状態バッジ + Connect/Disconnect ボタンを追加予定:

```
┌─ Mitsubishi MELSEC ────────────── ● CONNECTED  [DISCONNECT] ─┐
│  Host / IP Address    Port    Timeout (ms)                    │
└───────────────────────────────────────────────────────────────┘
┌─ Keyence KV ──────────────────── ○ DISCONNECTED  [CONNECT] ──┐
│  Host / IP Address    Port    Timeout (ms)                    │
└───────────────────────────────────────────────────────────────┘
```

接続状態バッジは `usePlcStore.connectionStatuses[plcId]` を参照 (SSOT 準拠、Axiom 2)。

---

## 7. モバイル操作フロー

```
起動
  │
  ├─ フッター [CONNECT] タップ → 全 PLC ポーリング開始
  │
  ├─ フッター [Settings] タップ
  │    └─ ConnectionSettings モーダル (下から出現)
  │         ├─ Host / Port / Timeout を入力
  │         ├─ [CONNECT] / [DISCONNECT] (per-device)
  │         └─ [Save & Apply] → 設定保存 + モーダル閉じる
  │
  ├─ フッター [Trend] タップ → RealtimeTrendChart 表示/非表示
  │
  └─ フッター [Maint. ON] タップ → メンテナンスモード ON/OFF
```

---

## 8. ブレークポイント

| 定数 | 値 | 定義場所 |
|------|-----|---------|
| `MOBILE_BREAKPOINT` | `768` (px) | `src/hooks/useIsMobile.ts` |

768px 未満 = モバイル。768px 以上 = デスクトップ。中間状態はなし。
