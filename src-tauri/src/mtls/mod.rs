//! パスワード付き .p12 証明書を使った mTLS（相互 TLS 認証）クライアント
use reqwest::{Client, Identity};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MtlsError {
    #[error("証明書の読み込みに失敗しました: {0}")]
    CertLoad(#[from] std::io::Error),
    #[error("証明書の解析またはパスワードが不正です: {0}")]
    CertParse(String),
    #[error("HTTP クライアントの構築に失敗しました: {0}")]
    ClientBuild(String),
    #[error("リクエストエラー: {0}")]
    Request(String),
}

impl serde::Serialize for MtlsError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MtlsConfig {
    /// .p12 ファイルのパス
    pub cert_path: String,
    /// .p12 のパスワード（メモリ上のみで保持）
    #[serde(skip_serializing)]
    pub cert_password: String,
    /// ローカル CA（自己署名）証明書を許可するか（本番では false にすること）
    pub accept_invalid_certs: bool,
}

/// mTLS クライアントを構築する。
/// パスワードはログに出力しないよう注意。
pub fn build_client(config: &MtlsConfig) -> Result<Client, MtlsError> {
    let cert_bytes = std::fs::read(&config.cert_path)?;

    let identity = Identity::from_pkcs12_der(&cert_bytes, &config.cert_password)
        .map_err(|e| MtlsError::CertParse(e.to_string()))?;

    Client::builder()
        .identity(identity)
        .danger_accept_invalid_certs(config.accept_invalid_certs)
        .build()
        .map_err(|e| MtlsError::ClientBuild(e.to_string()))
}

/// GET リクエストを送信してレスポンスボディを返す
pub async fn get(client: &Client, url: &str) -> Result<String, MtlsError> {
    client
        .get(url)
        .send()
        .await
        .map_err(|e| MtlsError::Request(e.to_string()))?
        .text()
        .await
        .map_err(|e| MtlsError::Request(e.to_string()))
}

/// POST リクエストを送信してレスポンスボディを返す
pub async fn post(client: &Client, url: &str, body: &str) -> Result<String, MtlsError> {
    client
        .post(url)
        .header("Content-Type", "application/json")
        .body(body.to_owned())
        .send()
        .await
        .map_err(|e| MtlsError::Request(e.to_string()))?
        .text()
        .await
        .map_err(|e| MtlsError::Request(e.to_string()))
}
