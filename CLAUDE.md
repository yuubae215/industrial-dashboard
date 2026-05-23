# CLAUDE.md — industrial-dashboard

産業用ダッシュボード（Tauri v2 + React + TypeScript）の開発ガイド。

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

# Rust バックエンドのコンパイルチェック（Linux ライブラリが必要）
cd src-tauri && cargo check

# 開発サーバー起動（初回は Rust コンパイルで数分かかる）
npm run tauri dev
```

## プロジェクト構造

```
industrial-dashboard/
├── src/                        # フロントエンド（React + TypeScript）
│   └── App.tsx
├── src-tauri/                  # バックエンド（Rust）
│   ├── Cargo.toml              # 依存: tokio, reqwest(native-tls), thiserror
│   └── src/
│       ├── lib.rs              # Tauri Command 登録
│       ├── plc/
│       │   ├── mitsubishi.rs   # 三菱 MC プロトコル 3E フレーム（バイナリ TCP）
│       │   └── keyence.rs      # キーエンス上位リンク（ASCII TCP）
│       └── mtls/
│           └── mod.rs          # パスワード付き .p12 による mTLS クライアント
└── docs/adr/                   # アーキテクチャ意思決定記録
    ├── adr-001-framework.md
    ├── adr-002-mtls-cert-management.md
    └── adr-003-plc-connection.md
```

## Tauri Command 一覧

| コマンド | 説明 |
|---|---|
| `plc_read_mitsubishi` | 三菱 PLC デバイス一括読み出し（D/M/W/X/Y/B） |
| `plc_read_keyence` | キーエンス PLC デバイス一括読み出し |
| `plc_write_keyence` | キーエンス PLC デバイス書き込み |
| `mtls_get` | mTLS 認証付き GET リクエスト |
| `mtls_post` | mTLS 認証付き POST リクエスト |
