//! キーエンス KV シリーズ 上位リンク通信（ASCII テキストベース、TCP）実装
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;

use super::{PlcConfig, PlcError, ReadResult};

/// データ型指定子
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum DataType {
    /// 符号なしワード（0〜65535）
    Unsigned,
    /// 符号付きワード（-32768〜32767）
    Signed,
    /// BCD（2進化十進数）
    Bcd,
}

impl DataType {
    fn as_suffix(&self) -> &'static str {
        match self {
            Self::Unsigned => "U",
            Self::Signed => "S",
            Self::Bcd => "B",
        }
    }
}

/// 複数ワードを一括読み出しする（例: `RDS DM1000.U 10\r\n`）
pub async fn read_devices(
    config: &PlcConfig,
    device: &str,
    head_number: u32,
    num_points: u16,
    data_type: DataType,
) -> Result<ReadResult, PlcError> {
    let addr = format!("{}:{}", config.host, config.port);
    let timeout = Duration::from_millis(config.timeout_ms);

    let stream = tokio::time::timeout(timeout, TcpStream::connect(&addr))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let cmd = format!(
        "RDS {}{}.{} {}\r\n",
        device.to_uppercase(),
        head_number,
        data_type.as_suffix(),
        num_points
    );

    let (reader, mut writer) = stream.into_split();
    tokio::time::timeout(timeout, writer.write_all(cmd.as_bytes()))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let mut buf_reader = BufReader::new(reader);
    let mut response = String::new();
    tokio::time::timeout(timeout, buf_reader.read_line(&mut response))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let response = response.trim();

    // エラーレスポンス（"!0" で始まる場合）
    if response.starts_with('!') {
        return Err(PlcError::Protocol(format!(
            "PLC エラーレスポンス: {}",
            response
        )));
    }

    let values: Result<Vec<i32>, _> = response
        .split_whitespace()
        .map(|s| s.parse::<i32>())
        .collect();

    let values = values.map_err(|_| {
        PlcError::Protocol(format!("レスポンスのパース失敗: {}", response))
    })?;

    Ok(ReadResult { values })
}

/// 1 ワードを書き込む（例: `WRS DM1000.U 1 100\r\n`）
pub async fn write_device(
    config: &PlcConfig,
    device: &str,
    number: u32,
    value: i32,
    data_type: DataType,
) -> Result<(), PlcError> {
    let addr = format!("{}:{}", config.host, config.port);
    let timeout = Duration::from_millis(config.timeout_ms);

    let stream = tokio::time::timeout(timeout, TcpStream::connect(&addr))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let cmd = format!(
        "WRS {}{}.{} 1 {}\r\n",
        device.to_uppercase(),
        number,
        data_type.as_suffix(),
        value
    );

    let (reader, mut writer) = stream.into_split();
    tokio::time::timeout(timeout, writer.write_all(cmd.as_bytes()))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let mut buf_reader = BufReader::new(reader);
    let mut response = String::new();
    tokio::time::timeout(timeout, buf_reader.read_line(&mut response))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let response = response.trim();
    if response == "OK" {
        Ok(())
    } else {
        Err(PlcError::Protocol(format!(
            "書き込みエラー: {}",
            response
        )))
    }
}
