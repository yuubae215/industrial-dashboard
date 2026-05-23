# ADR-001: ダッシュボードアプリの基盤フレームワークおよびWindowsビルド環境の選定

## ステータス

承認済み（Accepted: 2026-05-23）

## コンテキスト（背景）

工場内の三菱/キーエンス PLC からリアルタイムデータを取得し、ローカル Web サーバーと mTLS（相互認証）で通信する産業用ダッシュボードアプリを開発する必要がある。

要件：
- ターゲット環境：工場の閉域ネットワーク内で稼働する産業用 PC（IPC）
- IPC はメモリ・CPU などリソースが限られるケースがある
- PLC 通信（三菱 MC プロトコル / キーエンス上位リンク）は TCP バイナリ/テキスト電文
- ローカル Web サーバーとの通信にはパスワード付き .p12 証明書による mTLS を使用
- 開発には Coding Agent（Claude Code）を活用する

## 検討した選択肢

| 選択肢 | メリット | デメリット |
|---|---|---|
| **Electron** | Node.js エコシステムが豊富、JS のみで完結 | Chromium 内蔵でアプリサイズ 100MB+、メモリ消費大、モバイル非対応 |
| **Tauri v2** | OS 標準 WebView 使用で軽量（~10MB）、バックエンドが Rust で高速・安全 | Rust の学習コストが発生 |

### Windowsビルド環境の検討

| 選択肢 | ライセンス | 備考 |
|---|---|---|
| **Visual Studio 2022 Community** | 商用利用に制限あり（PC 250台未満 / 年売上100万USD未満 / 5名以内） | 受託開発や大企業では使用不可のリスク |
| **Build Tools for Visual Studio 2022** | C++ ビルド目的であれば商用・無償で利用可能 | コンパイラと SDK のみ。コードエディタは Cursor / VS Code を使用 |
| **Visual Studio Professional** | 商用利用可（有償） | チーム規模が大きい場合に検討 |

## 意思決定

以下の構成を採用する：

- **フレームワーク:** Tauri v2
- **フロントエンド:** React + TypeScript + Vite
- **バックエンド:** Rust（Tauri Core）
- **Windowsビルド環境:** Build Tools for Visual Studio 2022（C++ によるデスクトップ開発）
- **コードエディタ / Coding Agent:** Claude Code

## 根拠

1. **リソース効率:** メモリ消費が数十MB に抑えられ、低スペック IPC でも安定動作する
2. **堅牢なバックエンド:** Rust の型安全・メモリ安全性により、PLC 電文パースやソケット管理でのクラッシュを防止できる
3. **セキュアな暗号化処理:** パスワード付き .p12 証明書のデコードと mTLS クライアント構築を Rust（`reqwest` + `native-tls`）で安全に実装できる
4. **コンプライアンス:** Build Tools を使用することでライセンス違反リスクを排除できる
5. **AI 親和性:** React + TypeScript は LLM の学習データが最も豊富で、Coding Agent による UI 生成精度が最高になる

## 影響

- Rust の学習コストが発生する（ただし Coding Agent が補完）
- 初回ビルド時に Rust 環境（rustup）と Build Tools のセットアップが必要
- OS 標準 WebView を使用するため、Windows / Mac / Linux でレンダリングに微差が生じる可能性がある

## 関連 ADR

- [ADR-002](./adr-002-mtls-cert-management.md) - mTLS 証明書の管理方式
- [ADR-003](./adr-003-plc-connection.md) - PLC 接続管理方式
