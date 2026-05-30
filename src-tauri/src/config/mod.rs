use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertDef {
    pub kind: String,
    pub threshold: i64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignalDef {
    pub plc_id: String,
    pub address: u32,
    pub name: String,
    pub unit: String,
    pub data_type: String,
    pub alerts: Vec<AlertDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceConfig {
    pub version: String,
    pub signals: Vec<SignalDef>,
}

fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn config_dir() -> PathBuf {
    home_dir().join(".plc-telemetry")
}

fn config_path() -> PathBuf {
    config_dir().join("devices.config.json")
}

fn default_config() -> DeviceConfig {
    DeviceConfig {
        version: "1.0.0".to_string(),
        signals: vec![SignalDef {
            plc_id: "melsec-line-a".to_string(),
            address: 1000,
            name: "Mitsubishi Line A Furnace Temp".to_string(),
            unit: "degC".to_string(),
            data_type: "INT16".to_string(),
            alerts: vec![
                AlertDef {
                    kind: "HH".to_string(),
                    threshold: 2500,
                    message: "CRITICAL: Furnace temperature extremely high".to_string(),
                },
                AlertDef {
                    kind: "H".to_string(),
                    threshold: 2000,
                    message: "WARNING: Furnace temperature high".to_string(),
                },
                AlertDef {
                    kind: "L".to_string(),
                    threshold: 500,
                    message: "WARNING: Furnace temperature low".to_string(),
                },
                AlertDef {
                    kind: "LL".to_string(),
                    threshold: 200,
                    message: "CRITICAL: Furnace temperature extremely low".to_string(),
                },
            ],
        }],
    }
}

pub fn load() -> Result<DeviceConfig, String> {
    let path = config_path();
    if !path.exists() {
        return Ok(DeviceConfig {
            version: "1.0.0".to_string(),
            signals: vec![],
        });
    }
    let json = fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {e}"))?;
    serde_json::from_str(&json).map_err(|e| format!("Failed to parse config: {e}"))
}

pub fn save(config: &DeviceConfig) -> Result<(), String> {
    let dir = config_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create config dir: {e}"))?;
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {e}"))?;
    fs::write(config_path(), json).map_err(|e| format!("Failed to write config: {e}"))?;
    Ok(())
}
