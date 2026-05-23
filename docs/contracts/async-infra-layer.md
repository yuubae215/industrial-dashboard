# 非同期インフラレイヤー公準

> この文書の禁止事項に違発した実装は 🟥 レッドカード（マージ拒絶）となる。

参照：[PHILOSOPHY.md](../../PHILOSOPHY.md) 公理3 / [ADR-003](../adr/adr-003-plc-connection.md)

---

## 公準 1：UIスレッドの絶対死守

フロントエンドのメインスレッド（React の同期的な処理）を 16ms（60fps 相当）以上ブロックする処理は禁止。

**許可：**
- PLC 通信を `invoke()` 経由の Tauri コマンド（Rust の tokio ランタイム）で実行する
- 重い純粋計算を `useMemo` でキャッシュする

**禁止：**
- `await invoke()` をレンダリングの同期フロー内（`render` 関数本体）で呼ぶ ← 🟥
- `useEffect` 内で同期的な重いループを走らせる ← 🟥
- 500ms ポーリングを `setInterval` + 同期処理の組み合わせで実装する ← 🟥

---

## 公準 2：Tauri コマンドの責務

Tauri コマンド（`invoke()`）は **単一責務** を持つ。

| コマンド | 責務 |
|---------|------|
| `plc_read_mitsubishi` | 1回の読み出しのみ |
| `plc_read_keyence` | 1回の読み出しのみ |
| `plc_write_keyence` | 1回の書き込みのみ |
| `mtls_get` | 1回の HTTP GET のみ |
| `mtls_post` | 1回の HTTP POST のみ |

**禁止：**
- コマンド内でポーリングループを回す（フロントエンド側または Rust の別タスクで管理する） ← 🟥
- 1つのコマンドが複数 PLC に連続してアクセスする ← 🟥

---

## 公準 3：ポーリング管理

500ms ポーリングは以下のパターンで実装する：

```typescript
// 許可パターン: useEffect で間隔管理、invoke は非同期で投げる
useEffect(() => {
  const id = setInterval(async () => {
    const result = await invoke<ReadResult>('plc_read_mitsubishi', { ... })
    store.updateRawValues(plcId, result.values, Date.now())
  }, 500)
  return () => clearInterval(id)
}, [plcId])
```

**禁止：**
- `await` でポーリングをブロッキングに変える（前の応答を待ってから次を送信するパターン） ← 🟥
  - 理由：PLC の応答遅延がダッシュボードの更新頻度を直接低下させる
- ポーリング間隔をフロントエンドのコンポーネント Props で制御する ← 🟥
  - 理由：ポーリング設定は `PlcConfig`（Rust 側の SSOT）が持つ

---

## 公準 4：エラー時のリトライ

リトライの指数バックオフ（ADR-003）は **Rust 側のタスク** で実装する。

**禁止：**
- フロントエンドの `useEffect` 内で `setTimeout` を使って接続リトライを実装する ← 🟥
- リトライ回数をフロントエンドの状態（`useState`）で管理する ← 🟥
