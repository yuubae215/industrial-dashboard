# industrial-dashboard 🏭

産業用機器の監視・制御を行うリアルタイムダッシュボード（Tauri v2 + React 19 + TypeScript）。

> **最高規範:** すべての実装判断は [PHILOSOPHY.md](./PHILOSOPHY.md) の三大公理に従います。開発前に必ず一読してください。

## 特徴

- **MCプロトコル（3Eフレーム）による統一通信:** 各社PLC（三菱MELSEC、キーエンスKVのMC互換モード）の通信プロトコルをMCプロトコルに一本化。フロントエンドの状態管理と型定義をシンプルに統治しています。
- **デバッグ・デバイスウォッチウィンドウ内蔵:** GxWorks3のウォッチウィンドウを模したデバッグUIを内蔵し、DM/Dアドレスの強制読み書きが即座に可能です。
- **堅牢なセキュリティ（mTLS）:** パスワード保護された.p12クライアント証明書をRustバックエンドのメモリ内のみで保持する相互TLS認証を実装。

## 動作・ビルド環境要件

### フロントエンド

- **Node.js**: v20.x LTS
- **npm**: v9.x 以上

### バックエンド

- **Rust**: stable 1.75.0 以上

### Linux（Ubuntu/Debian）— Tauri v2 WebViewビルドに必須

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev
```

確認：

```bash
pkg-config --exists webkit2gtk-4.1 && echo "OK"
```

### Windows（推奨開発環境）

1. **Build Tools for Visual Studio 2022**（商用利用可・無償）
   - [ダウンロードページ](https://visualstudio.microsoft.com/downloads/)の「すべてのダウンロード」→「Build Tools for Visual Studio 2022」
   - ワークロード「**C++ によるデスクトップ開発**」を選択してインストール
   - ※ Visual Studio Community は商用利用に制限あり（詳細は [ADR-001](docs/adr/adr-001-framework.md)）
2. **Rust（rustup）**: https://rustup.rs から `rustup-init.exe` をダウンロードして実行

### macOS

```bash
xcode-select --install
# その後 https://rustup.rs から Rust をインストール
```

## 開発手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 検証用モックサーバーの起動（実機がない環境）

```bash
# テスト用SSL証明書・.p12の自動生成
npm run mock:gen-certs

# 三菱/キーエンス(MC互換)用のMCプロトコルモックサーバー (Port: 5001)
npm run mock:mitsubishi

# mTLS認証付きHTTPSモックサーバー (Port: 8443)
npm run mock:https
```

### 3. アプリケーションの起動

```bash
# TypeScriptの型チェック + Viteビルド
npm run build

# Tauri開発サーバーの起動（初回はRustコンパイルで数分かかる）
npm run tauri dev
```

## Tauri Command 一覧

| コマンド | 説明 |
|---|---|
| `plc_read_mitsubishi` | MCプロトコル 3Eフレームによるデバイス一括読み出し（D/M/W/X/Y/B） |
| `plc_write_mitsubishi` | MCプロトコル 3Eフレームによるデバイス書き込み |
| `mtls_get` | mTLS認証付きGETリクエスト |
| `mtls_post` | mTLS認証付きPOSTリクエスト |

## アーキテクチャ

```
[フロントエンド（React / TypeScript）]
        │ Tauri IPC（invoke / emit）
        ▼
[バックエンド（Rust）]
   ├── MCプロトコル TCP ──► 三菱 PLC / キーエンス PLC（MC互換モード）
   └── mTLS (reqwest) ───► ローカル Web サーバー
```

詳細は [docs/adr/](docs/adr/) を参照。

## GitHub Pages デモページ

Tauriのデスクトップ機能を除いたフロントエンドUI/UXをブラウザ上で確認できるデモページをGitHub Pagesに自動デプロイしています。

- **デモURL:** `https://yuubae215.github.io/industrial-dashboard/`
- **制約:** ブラウザのセキュリティ制限により、実機PLCへの直接TCPソケット通信は行えません。UIとデータフローの確認を目的としています。

デプロイはGitHub Actionsで自動化されています（`.github/workflows/deploy-demo.yml`）。
リポジトリの Settings > Pages > Source が「**GitHub Actions**」に設定されていることを確認してください。

## 参照ドキュメント

| ドキュメント | 内容 |
|---|---|
| [PHILOSOPHY.md](./PHILOSOPHY.md) | 設計哲学（最高規範） |
| [docs/adr/](./docs/adr/) | アーキテクチャ意思決定記録 |
| [docs/contracts/ui-layer.md](./docs/contracts/ui-layer.md) | UIレイヤー公準 |
| [docs/contracts/domain-layer.md](./docs/contracts/domain-layer.md) | ドメインレイヤー公準 |
| [docs/contracts/plc-protocol-layer.md](./docs/contracts/plc-protocol-layer.md) | PLCプロトコルレイヤー公準 |
| [docs/contracts/async-infra-layer.md](./docs/contracts/async-infra-layer.md) | 非同期インフラレイヤー公準 |
| [docs/governance/yellow-cards.md](./docs/governance/yellow-cards.md) | イエローカード追跡台帳 |
