//! 三菱 MELSEC MC プロトコル 3E フレーム（バイナリモード、TCP）実装
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

use super::{PlcConfig, PlcError, ReadResult};

/// デバイスコード（バイナリモード）
#[derive(Debug, Clone, Copy)]
pub enum DeviceCode {
    D = 0xA8, // データレジスタ
    M = 0x90, // 内部リレー
    W = 0xB4, // リンクレジスタ
    X = 0x9C, // 入力リレー
    Y = 0x9D, // 出力リレー
    B = 0xA0, // リンクリレー
}

impl DeviceCode {
    pub fn from_str(s: &str) -> Result<Self, PlcError> {
        match s.to_uppercase().as_str() {
            "D" => Ok(Self::D),
            "M" => Ok(Self::M),
            "W" => Ok(Self::W),
            "X" => Ok(Self::X),
            "Y" => Ok(Self::Y),
            "B" => Ok(Self::B),
            _ => Err(PlcError::Protocol(format!("未対応デバイス: {}", s))),
        }
    }
}

/// MC プロトコル 3E フレーム 一括読出しリクエストを生成する
fn build_batch_read_request(head_device: u32, device_code: DeviceCode, num_points: u16) -> Vec<u8> {
    // request_data = 監視タイマ(2) + コマンド(2) + サブコマンド(2) + 先頭デバイス(3) + デバイスコード(1) + 点数(2) = 12 bytes
    let request_data: Vec<u8> = vec![
        0x10, 0x00, // 監視タイマ（16 × 250ms = 4s）
        0x01, 0x04, // コマンド: 一括読出し（0x0401 LE）
        0x00, 0x00, // サブコマンド: ワード単位
        (head_device & 0xFF) as u8,
        ((head_device >> 8) & 0xFF) as u8,
        ((head_device >> 16) & 0xFF) as u8,
        device_code as u8,
        (num_points & 0xFF) as u8,
        ((num_points >> 8) & 0xFF) as u8,
    ];

    let data_len = request_data.len() as u16;
    let mut frame = vec![
        0x50, 0x00, // サブヘッダ（3E フレーム）
        0x00,       // ネットワーク番号
        0xFF,       // PC 番号
        0xFF, 0x03, // 要求先ユニット I/O 番号
        0x00,       // 要求先ユニット局番号
        (data_len & 0xFF) as u8,
        ((data_len >> 8) & 0xFF) as u8,
    ];
    frame.extend_from_slice(&request_data);
    frame
}

/// レスポンスからワード値を抽出する
fn parse_batch_read_response(buf: &[u8], num_points: u16) -> Result<Vec<i32>, PlcError> {
    // レスポンス: サブヘッダ(2) + ネットワーク(1) + PC(1) + I/O(2) + 局番(1) + データ長(2) + 終了コード(2) + データ
    const HEADER_LEN: usize = 9;
    const END_CODE_LEN: usize = 2;

    if buf.len() < HEADER_LEN + END_CODE_LEN {
        return Err(PlcError::Protocol("レスポンスが短すぎます".to_string()));
    }

    let end_code = u16::from_le_bytes([buf[HEADER_LEN], buf[HEADER_LEN + 1]]);
    if end_code != 0x0000 {
        return Err(PlcError::Protocol(format!(
            "PLC エラーコード: 0x{:04X}",
            end_code
        )));
    }

    let data_start = HEADER_LEN + END_CODE_LEN;
    let expected_len = data_start + num_points as usize * 2;
    if buf.len() < expected_len {
        return Err(PlcError::Protocol("データ長不足".to_string()));
    }

    let values = (0..num_points as usize)
        .map(|i| {
            let offset = data_start + i * 2;
            i16::from_le_bytes([buf[offset], buf[offset + 1]]) as i32
        })
        .collect();

    Ok(values)
}

/// MC プロトコル 3E フレーム 一括書込みリクエストを生成する
fn build_batch_write_request(
    head_device: u32,
    device_code: DeviceCode,
    values: &[i16],
) -> Vec<u8> {
    let num_points = values.len() as u16;
    // request_data: タイマ(2) + コマンド(2) + サブコマンド(2) + 先頭デバイス(3) + コード(1) + 点数(2) + 値列(2×N)
    let mut request_data: Vec<u8> = vec![
        0x10, 0x00, // 監視タイマ
        0x01, 0x14, // コマンド: 一括書込み (0x1401 LE)
        0x00, 0x00, // サブコマンド: ワード単位
        (head_device & 0xFF) as u8,
        ((head_device >> 8) & 0xFF) as u8,
        ((head_device >> 16) & 0xFF) as u8,
        device_code as u8,
        (num_points & 0xFF) as u8,
        ((num_points >> 8) & 0xFF) as u8,
    ];
    for v in values {
        let bytes = v.to_le_bytes();
        request_data.push(bytes[0]);
        request_data.push(bytes[1]);
    }
    let data_len = request_data.len() as u16;
    let mut frame = vec![
        0x50, 0x00, // サブヘッダ
        0x00,       // ネットワーク番号
        0xFF,       // PC 番号
        0xFF, 0x03, // I/O 番号
        0x00,       // 局番号
        (data_len & 0xFF) as u8,
        ((data_len >> 8) & 0xFF) as u8,
    ];
    frame.extend_from_slice(&request_data);
    frame
}

/// 書込みレスポンスの終了コードを検証する
fn parse_batch_write_response(buf: &[u8]) -> Result<(), PlcError> {
    const HEADER_LEN: usize = 9;
    const END_CODE_LEN: usize = 2;

    if buf.len() < HEADER_LEN + END_CODE_LEN {
        return Err(PlcError::Protocol("書込みレスポンスが短すぎます".to_string()));
    }
    let end_code = u16::from_le_bytes([buf[HEADER_LEN], buf[HEADER_LEN + 1]]);
    if end_code != 0x0000 {
        return Err(PlcError::Protocol(format!(
            "PLC 書込みエラーコード: 0x{:04X}",
            end_code
        )));
    }
    Ok(())
}

/// 指定デバイスに複数ワードを一括書き込みする
pub async fn write_devices(
    config: &PlcConfig,
    device_str: &str,
    head_number: u32,
    values: &[i16],
) -> Result<(), PlcError> {
    let device_code = DeviceCode::from_str(device_str)?;
    let addr = format!("{}:{}", config.host, config.port);
    let timeout = Duration::from_millis(config.timeout_ms);

    let mut stream = tokio::time::timeout(timeout, TcpStream::connect(&addr))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let request = build_batch_write_request(head_number, device_code, values);
    tokio::time::timeout(timeout, stream.write_all(&request))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    // 書込みレスポンス: ヘッダ(9) + 終了コード(2) = 11 bytes
    let mut buf = vec![0u8; 11];
    let n = tokio::time::timeout(timeout, stream.read(&mut buf))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    parse_batch_write_response(&buf[..n])
}

/// 指定デバイスを一括読み出しする
pub async fn read_devices(
    config: &PlcConfig,
    device_str: &str,
    head_number: u32,
    num_points: u16,
) -> Result<ReadResult, PlcError> {
    let device_code = DeviceCode::from_str(device_str)?;
    let addr = format!("{}:{}", config.host, config.port);
    let timeout = Duration::from_millis(config.timeout_ms);

    let mut stream = tokio::time::timeout(timeout, TcpStream::connect(&addr))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let request = build_batch_read_request(head_number, device_code, num_points);
    tokio::time::timeout(timeout, stream.write_all(&request))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    // 最大レスポンスサイズ: 9(ヘッダ) + 2(終了コード) + 960*2(最大点数) bytes
    let mut buf = vec![0u8; 9 + 2 + num_points as usize * 2];
    let n = tokio::time::timeout(timeout, stream.read(&mut buf))
        .await
        .map_err(|_| PlcError::Timeout)?
        .map_err(PlcError::Connection)?;

    let values = parse_batch_read_response(&buf[..n], num_points)?;
    Ok(ReadResult { values })
}
