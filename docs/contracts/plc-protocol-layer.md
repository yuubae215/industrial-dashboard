# PLC プロトコルレイヤー公準

> この文書の禁止事項に違反した実装は 🟥 レッドカード（マージ拒絶）となる。

参照：[PHILOSOPHY.md](../../PHILOSOPHY.md) 公理1 / [ADR-003](../adr/adr-003-plc-connection.md)

---

## 公準 1：プロトコル純粋性

`src-tauri/src/plc/mitsubishi.rs` および `src-tauri/src/plc/keyence.rs` は、  
**「バイト列 / ASCII テキストを送受信して生値を返すだけの純粋な変換機」でなければならない。**

**許可：**
- フレームの組み立て（デバイスコード・先頭番号・点数 → バイト列）
- レスポンスのパース（バイト列 / ASCII → `Vec<i32>`）
- プロトコルレベルのエラー検出（エンドコード・`!` プレフィックス等）

**禁止：**
- ポーリング間隔・リトライ間隔の条件分岐をプロトコル実装内に書く ← 🟥
- 特定のデバイスアドレス（例：D1000 が温度計だから…）に関するビジネスロジック ← 🟥
- `println!` / `log::info!` でデバイス値の意味（「温度が高い」等）をログ出力する ← 🟥
- `PlcConfig` の `host` フィールドを IP か FQDN かで分岐させる（バリデーション境界で処理すること） ← 🟥

---

## 公準 2：Tauri コマンドとプロトコル層の契約

`lib.rs` の Tauri コマンドは以下の役割のみを持つ：

1. フロントエンドから受け取った引数を構造体（`PlcConfig`）にマッピング
2. プロトコル実装関数を呼び出す
3. 結果（`ReadResult` or `PlcError`）をそのままシリアライズして返す

**禁止：**
- Tauri コマンド内でリトライループを書く（Rust の接続プールまたは別タスクで行うこと） ← 🟥
- Tauri コマンド内でデバイス値のしきい値チェックを行う ← 🟥
- `PlcError` を握り潰して `Ok(vec![0])` のようなフォールバック値を返す ← 🟥

---

## 公準 3：エラーの透明性

`PlcError` のすべてのバリアントはフロントエンドに **そのまま** 伝搬しなければならない。

```
Connection(io::Error)  →  フロントエンドの ConnectionStatus::Error へ
Protocol(String)       →  フロントエンドの AlertState::ProtocolError へ
Timeout                →  フロントエンドの ConnectionStatus::Timeout へ
```

**禁止：**
- エラーを `unwrap_or_default()` で無音に処理する ← 🟥
- `Protocol` エラーを `Connection` エラーとして返す（種別を偽る）← 🟥

---

## 公準 4：プロトコル実装の独立性

三菱とキーエンスのプロトコル実装は **互いに依存してはならない**。

- 共通の型（`PlcConfig`, `ReadResult`, `PlcError`）は `plc/mod.rs` にのみ定義する
- `mitsubishi.rs` が `keyence.rs` を `use` することは禁止 ← 🟥
- `keyence.rs` が `mitsubishi.rs` を `use` することは禁止 ← 🟥
