mod mtls;
mod plc;

use plc::{keyence, mitsubishi, PlcConfig, ReadResult};
use mtls::MtlsConfig;

// ── PLC コマンド ───────────────────────────────────────────────────────────

/// 三菱 PLC デバイス一括読み出し
///
/// device: "D" / "M" / "W" / "X" / "Y" / "B"
/// head_number: 先頭デバイス番号
/// num_points: 読み出し点数（最大 960）
#[tauri::command]
async fn plc_read_mitsubishi(
    config: PlcConfig,
    device: String,
    head_number: u32,
    num_points: u16,
) -> Result<ReadResult, String> {
    mitsubishi::read_devices(&config, &device, head_number, num_points)
        .await
        .map_err(|e| e.to_string())
}

/// キーエンス PLC デバイス一括読み出し
///
/// device: "DM" / "CM" / "TM" 等
/// head_number: 先頭デバイス番号
/// num_points: 読み出し点数
/// signed: true = 符号付き, false = 符号なし
#[tauri::command]
async fn plc_read_keyence(
    config: PlcConfig,
    device: String,
    head_number: u32,
    num_points: u16,
    signed: bool,
) -> Result<ReadResult, String> {
    let data_type = if signed {
        keyence::DataType::Signed
    } else {
        keyence::DataType::Unsigned
    };
    keyence::read_devices(&config, &device, head_number, num_points, data_type)
        .await
        .map_err(|e| e.to_string())
}

/// キーエンス PLC デバイス書き込み
#[tauri::command]
async fn plc_write_keyence(
    config: PlcConfig,
    device: String,
    number: u32,
    value: i32,
    signed: bool,
) -> Result<(), String> {
    let data_type = if signed {
        keyence::DataType::Signed
    } else {
        keyence::DataType::Unsigned
    };
    keyence::write_device(&config, &device, number, value, data_type)
        .await
        .map_err(|e| e.to_string())
}

// ── mTLS コマンド ─────────────────────────────────────────────────────────

/// mTLS 認証で GET リクエストを送信する
///
/// cert_path: .p12 ファイルのパス
/// cert_password: .p12 のパスワード（ログに出力しない）
/// url: リクエスト先 URL
/// accept_invalid_certs: ローカル自己署名証明書を許可するか
#[tauri::command]
async fn mtls_get(
    cert_path: String,
    cert_password: String,
    url: String,
    accept_invalid_certs: bool,
) -> Result<String, String> {
    let config = MtlsConfig {
        cert_path,
        cert_password,
        accept_invalid_certs,
    };
    let client = mtls::build_client(&config).map_err(|e| e.to_string())?;
    mtls::get(&client, &url).await.map_err(|e| e.to_string())
}

/// mTLS 認証で POST リクエストを送信する
#[tauri::command]
async fn mtls_post(
    cert_path: String,
    cert_password: String,
    url: String,
    body: String,
    accept_invalid_certs: bool,
) -> Result<String, String> {
    let config = MtlsConfig {
        cert_path,
        cert_password,
        accept_invalid_certs,
    };
    let client = mtls::build_client(&config).map_err(|e| e.to_string())?;
    mtls::post(&client, &url, &body).await.map_err(|e| e.to_string())
}

// ── エントリポイント ──────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            plc_read_mitsubishi,
            plc_read_keyence,
            plc_write_keyence,
            mtls_get,
            mtls_post,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
