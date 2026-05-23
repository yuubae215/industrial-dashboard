# CLAUDE.md — industrial-dashboard

産業用ダッシュボード（Tauri v2 + React + TypeScript）の開発ガイド。

> **最高規範:** すべての実装判断は [PHILOSOPHY.md](./PHILOSOPHY.md) の三大公理に従う。

---

## Linux システム依存ライブラリ（必須）

**Tauri v2 を Linux 環境でビルドするには、以下のシステムライブラリが必要。**
インストールされていないと `cargo check` / `cargo build` が `gdk-sys` のビルドで失敗する。

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev
```

インストール確認：

```bash
pkg-config --exists webkit2gtk-4.1 && echo "OK"
```

## 開発コマンド

```bash
# フロントエンド依存関係のインストール
npm install

# TypeScript の型チェック（ブランド型の混用エラーを検出）
npm run build

# Rust バックエンドのコンパイルチェック（Linux ライブラリが必要）
cd src-tauri && cargo check

# 開発サーバー起動（初回は Rust コンパイルで数分かかる）
npm run tauri dev
```

## プロジェクト構造

```
industrial-dashboard/
├── PHILOSOPHY.md               # 設計哲学（最高規範）← 必ず読むこと
├── src/                        # フロントエンド（React + TypeScript）
│   ├── App.tsx
│   └── types/
│       ├── branded.ts          # ブランド型（「混ぜるな危険」をコンパイル時に強制）
│       └── domain.ts           # ドメイン型（PLC設定・接続状態・固定スロット）
├── src-tauri/                  # バックエンド（Rust）
│   ├── Cargo.toml              # 依存: tokio, reqwest(native-tls), thiserror
│   └── src/
│       ├── lib.rs              # Tauri Command 登録
│       ├── plc/
│       │   ├── mitsubishi.rs   # 三菱 MC プロトコル 3E フレーム（バイナリ TCP）
│       │   └── keyence.rs      # キーエンス上位リンク（ASCII TCP）
│       └── mtls/
│           └── mod.rs          # パスワード付き .p12 による mTLS クライアント
└── docs/
    ├── adr/                    # アーキテクチャ意思決定記録（ADR-001〜007）
    ├── contracts/              # レイヤー別公準（禁止事項の憲法）
    └── governance/
        └── yellow-cards.md     # イエローカード追跡台帳
```

## Tauri Command 一覧

| コマンド | 説明 |
|---|---|
| `plc_read_mitsubishi` | 三菱 PLC デバイス一括読み出し（D/M/W/X/Y/B） |
| `plc_read_keyence` | キーエンス PLC デバイス一括読み出し |
| `plc_write_keyence` | キーエンス PLC デバイス書き込み |
| `mtls_get` | mTLS 認証付き GET リクエスト |
| `mtls_post` | mTLS 認証付き POST リクエスト |

---

## アーキテクチャの三層ルール（必読）

### 1. 公理 1：プロトコル層に意味論を書かない

`src-tauri/src/plc/` 内の関数は「バイト列を送受信して生値を返すだけ」。
ポーリング間隔・しきい値・デバイスの名称・意味は一切書いてはならない。

### 2. 公理 2：UI に SSOT を置かない

React コンポーネントが `useState` で PLC 生値の「前回値」を保持して差分計算するコードは書いてはならない。
PLC 生値（`PlcRawValue`）は Zustand ストアのみが保持し、表示値は毎回純粋関数で算出する。

### 3. 公理 3：ブランド型のコンストラクタ以外でキャストしない

```typescript
// 許可: branded.ts のコンストラクタ関数を使う
const val = asPlcRawValue(response.values[0])

// 禁止: 強制キャストは絶対にしない
const val = response.values[0] as PlcRawValue  // ← 🟥 レッドカード
```

---

## コードガバナンス（イエロー/レッドカード制）

> **これはランタイムのUIアラートではない。コードを統治するための開発プロセスのルール。**

危うい実装パターンを発見した場合：
1. `docs/governance/yellow-cards.md` に記録してカウントをインクリメント
2. 同一パターンが累積 3 回を超えたら `docs/contracts/` に禁止条項として追記
3. 本ファイル（CLAUDE.md）の「絶対禁止事項」に 1 行追記して永続化

詳細ルール → [ADR-006](./docs/adr/adr-006-yellow-red-card-governance.md)

---

## 絶対禁止事項

> ここに記載された事項は 🟥 レッドカード（マージ拒絶）。  
> 新たなアンチパターンが頻出した際は、このセクションに追記してフィロソフィに昇華させる。

*(現時点では contracts の禁止事項がすべて適用される。以下に頻出パターンが追記されていく)*

---

## 参照ドキュメント

| ドキュメント | 内容 |
|---|---|
| [PHILOSOPHY.md](./PHILOSOPHY.md) | 設計哲学（最高規範）|
| [docs/adr/](./docs/adr/) | アーキテクチャ意思決定記録 |
| [docs/contracts/ui-layer.md](./docs/contracts/ui-layer.md) | UI レイヤー公準 |
| [docs/contracts/domain-layer.md](./docs/contracts/domain-layer.md) | ドメインレイヤー公準 |
| [docs/contracts/plc-protocol-layer.md](./docs/contracts/plc-protocol-layer.md) | PLC プロトコルレイヤー公準 |
| [docs/contracts/async-infra-layer.md](./docs/contracts/async-infra-layer.md) | 非同期インフラレイヤー公準 |
| [docs/governance/yellow-cards.md](./docs/governance/yellow-cards.md) | イエローカード追跡台帳 |
