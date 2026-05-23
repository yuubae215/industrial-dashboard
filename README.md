# industrial-dashboard

工場内の三菱/キーエンス PLC からリアルタイムデータを取得し、ローカル Web サーバーと mTLS 通信する産業用ダッシュボードアプリ。

**スタック:** Tauri v2 / React / TypeScript / Vite / Rust

## 前提環境

### Windows（推奨開発環境）

1. **Build Tools for Visual Studio 2022**（商用利用可・無償）
   - [ダウンロードページ](https://visualstudio.microsoft.com/downloads/)の「すべてのダウンロード」→「Build Tools for Visual Studio 2022」
   - ワークロード「**C++ によるデスクトップ開発**」を選択してインストール
   - ※ Visual Studio Community は商用利用に制限あり（詳細は [ADR-001](docs/adr/adr-001-framework.md)）

2. **Rust（rustup）**
   - https://rustup.rs から `rustup-init.exe` をダウンロードして実行

3. **Node.js（LTS）**
   - https://nodejs.org からインストール

### Linux（CI・Claude Code web セッション含む）

> **Tauri v2 のビルドには以下のシステムライブラリが必須。**
> インストールされていないと `cargo check` が `gdk-sys` のビルドで失敗する。

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev
```

確認：

```bash
pkg-config --exists webkit2gtk-4.1 && echo "OK"
```

### macOS

```bash
xcode-select --install  # CLT のインストール
# その後 https://rustup.rs から Rust をインストール
```

## 開発の始め方

```bash
npm install
npm run tauri dev   # 初回は Rust コンパイルで数分かかる
```

## アーキテクチャ

```
[フロントエンド（React / TypeScript）]
        │ Tauri IPC（invoke / emit）
        ▼
[バックエンド（Rust）]
   ├── MCプロトコル TCP ──► 三菱 PLC
   ├── 上位リンク TCP ────► キーエンス PLC
   └── mTLS (reqwest) ───► ローカル Web サーバー
```

詳細は [docs/adr/](docs/adr/) を参照。
