# ADR-002: mTLS クライアント証明書の管理方式

## ステータス

承認済み（Accepted: 2026-05-23）

## コンテキスト（背景）

ローカル Web サーバーとの mTLS（相互 TLS 認証）通信において、パスワードで保護された .p12（PKCS#12）形式のクライアント証明書を使用する。

証明書の取り扱いについて、セキュリティと運用性のバランスをどう設計するか決定が必要。

要件：
- 証明書ファイル形式：.p12（パスワード保護あり）
- 利用環境：工場の専用 PC（基本的に 1 台 = 1 オペレーター想定）
- セキュリティポリシー：パスワードをプレーンテキストでファイルに保存しない

## 検討した選択肢

### 方法A: アプリが直接 .p12 ファイルを読み込む（起動時パスワード入力）

アプリ起動時にパスワード入力モーダルを表示し、指定パスから .p12 を読み込む。
パスワードはメモリ上（Rust 内）のみで保持し、アプリ終了とともに破棄する。

- **メリット:** シンプル、OSへの依存がない、実装が最も容易
- **デメリット:** 毎回パスワード入力が必要（オペレーター負担）

### 方法B: OS の資格情報マネージャーにパスワードを保存

初回起動時にパスワードを入力させ、Windows 資格情報マネージャー（または Mac キーチェーン）に暗号化して保存する。
以降の起動では OS から自動取得する。Rust の `keyring` クレートで実装。

- **メリット:** 2 回目以降はパスワード入力不要、OS レベルの暗号化で安全
- **デメリット:** OS ごとの実装差異、`keyring` クレートへの依存

### 方法C: OS の証明書ストアにインポート済みの証明書を使用

証明書を Windows 証明書ストア（またはMacキーチェーン）にインポートしておき、
アプリは証明書のコモンネーム等で検索して使用する。
`native-tls` クレートが OS の TLS ライブラリ（SChannel / Secure Transport）と連携。

- **メリット:** アプリがパスワードを一切扱わない（インポート時に OS が解除済み）
- **デメリット:** 証明書の更新・管理が OS 側の操作になり、自動化しにくい

## 意思決定

**フェーズ1: 方法A（起動時パスワード入力 + メモリ保持）を採用する。**

将来的な要件に応じて方法Bへ移行することを検討する。

## 根拠

1. **産業用 PC は専用機が多い:** 1 台 = 特定作業員が担当するケースが多く、起動時の一度のパスワード入力は許容範囲
2. **実装のシンプルさ:** reqwest + native-tls の `Identity::from_pkcs12_der` で直接実装できる
3. **依存最小化:** OS 固有の証明書ストア操作への依存がなく、Windows / Mac / Linux で同一コードが動作する
4. **セキュリティ担保:** パスワードはメモリ内のみで保持し、ファイル・ログへの書き出しを禁止する

## 実装方針

```rust
// src-tauri/src/mtls/mod.rs
use reqwest::{Client, Identity};

pub async fn build_mtls_client(
    cert_path: &str,
    password: &str,
    accept_invalid_certs: bool,
) -> Result<Client, String> {
    let cert_bytes = std::fs::read(cert_path).map_err(|e| e.to_string())?;
    let identity = Identity::from_pkcs12_der(&cert_bytes, password)
        .map_err(|e| format!("証明書エラー: {}", e))?;
    
    Client::builder()
        .identity(identity)
        .danger_accept_invalid_certs(accept_invalid_certs)
        .build()
        .map_err(|e| e.to_string())
}
```

## セキュリティ上の注意事項

- パスワードを `String` として Tauri Command に渡す際、ログへの出力・エラーメッセージへの埋め込みを禁止する
- .p12 ファイルのパスはユーザーが OS のファイルダイアログで選択する形式とし、アプリにハードコードしない
- `danger_accept_invalid_certs(true)` は開発時のみ使用し、本番ではローカル CA 証明書を明示的に信頼する形に切り替える

## 影響

- アプリ起動時に証明書パスとパスワードの入力 UI が必要（ADR-004 で UI 設計を決定）

## 関連 ADR

- [ADR-001](./adr-001-framework.md) - フレームワーク選定
- [ADR-003](./adr-003-plc-connection.md) - PLC 接続管理方式
