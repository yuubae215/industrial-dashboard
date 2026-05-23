pub mod keyence;
pub mod mitsubishi;

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PlcError {
    #[error("接続エラー: {0}")]
    Connection(#[from] std::io::Error),
    #[error("プロトコルエラー: {0}")]
    Protocol(String),
    #[error("タイムアウト")]
    Timeout,
}

impl serde::Serialize for PlcError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlcConfig {
    pub host: String,
    pub port: u16,
    pub timeout_ms: u64,
}

impl Default for PlcConfig {
    fn default() -> Self {
        Self {
            host: "192.168.1.1".to_string(),
            port: 5007,
            timeout_ms: 3000,
        }
    }
}

/// デバイス読み出し結果（ワード値のリスト）
#[derive(Debug, Serialize, Deserialize)]
pub struct ReadResult {
    pub values: Vec<i32>,
}
