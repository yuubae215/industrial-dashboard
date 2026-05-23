# ADR-007: ブランド型戦略（TypeScript + Rust）

## ステータス

承認済み（Accepted: 2026-05-23）

## コンテキスト（背景）

産業用ダッシュボードでは、同じプリミティブ型（`number` / `string`）であっても、**絶対に混ぜてはいけないドメイン概念**が複数存在する：

- `PlcRawValue`（PLC から受信した生の整数値）vs `EngineeringValue`（スケーリング済み工学値）
- `DeviceAddress`（PLC デバイス番号）vs 一般の `number`
- `SanitizedUrl`（検証済み URL）vs 生の文字列

ランタイムではすべて同じ型（`number` や `string`）なので、誤った混用はテスト実行時か本番環境でしか発覚しない。「混ぜるな危険」をコンパイル時に自動で検出する仕組みが必要。

## TypeScript：ブランド型

TypeScript の構造的型システムに「目印（Brand）」を付与し、コンパイルタイムで混用を検出する。

採用パターン（intersection 型）：

```typescript
type PlcRawValue = number & { readonly _brand: 'PlcRawValue' }
type EngineeringValue = number & { readonly _brand: 'EngineeringValue' }
```

- コンストラクタ関数（`asPlcRawValue()`）経由でのみ型付き値を生成できる
- ブランドが違う型の算術演算はコンパイルエラーになる
- `tsconfig.json` の `strict: true` が既に有効なため、追加設定は不要

詳細は `src/types/branded.ts` を参照。

## Rust：ニュータイプパターン

Rust では「ニュータイプ（newtype）」で同等の安全性を実現できる：

```rust
struct DeviceAddress(u32);
struct PortNumber(u16);
struct TimeoutMs(u64);
```

**Rust 側のブランド型化は今後のタスクとし、本 ADR は指針の策定に留める。**  
理由：現時点でのバックエンド（`plc/mod.rs`）はプリミティブ型で機能しており、  
ニュータイプへの移行は Tauri コマンドのシリアライズ（serde）にも影響するため、  
フロントエンドの SSOT 実装と並行して段階的に行う。

## 適用範囲

| カテゴリ | ブランド型 | 対応ファイル |
|---------|-----------|------------|
| PLC 生値 | `PlcRawValue` | `src/types/branded.ts` |
| 工学値 | `EngineeringValue` | `src/types/branded.ts` |
| デバイスアドレス | `DeviceAddress` | `src/types/branded.ts` |
| 検証済み URL | `SanitizedUrl` | `src/types/branded.ts` |
| ポート番号 | `PortNumber` | `src/types/branded.ts` |

## 禁止事項

- ブランド型を `as unknown as TargetType` で強制キャストしてはならない（キャストは `branded.ts` のコンストラクタ関数のみ許可）
- ブランド型と生のプリミティブを算術演算で混用してはならない
- Rust のニュータイプを `.0` で unwrap して生の値として扱ってはならない（将来実装時）

## 根拠

1. **コンパイルタイム安全:** バグがランタイムに到達する前に `tsc` が自動で弾く
2. **ドキュメントとしての型:** `PlcRawValue` という型名が、コードを読む全員（AI 含む）に「これは生値であり変換前」を伝える
3. **ゼロコスト:** ランタイムでは単なる `number`/`string` なので実行時オーバーヘッドなし

## 関連 ADR

- [PHILOSOPHY.md](../../PHILOSOPHY.md) — 公理2（SSOT）
- [ADR-005](./adr-005-ssot-state-management.md) — SSOT 状態管理
- [src/types/branded.ts](../../src/types/branded.ts) — 実装
- [docs/contracts/domain-layer.md](../contracts/domain-layer.md) — ドメインレイヤー公準
