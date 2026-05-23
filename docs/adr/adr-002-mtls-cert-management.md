# ADR-002: mTLS Client Certificate Management

## Status

Accepted (2026-05-23)

## Context

For mTLS (mutual TLS authentication) communication with the local web server, we use password-protected .p12 (PKCS#12) format client certificates.

A decision is needed on how to handle certificates, balancing security and operational usability.

Requirements:
- Certificate format: .p12 (password-protected)
- Operating environment: Dedicated factory PCs (typically one PC = one operator)
- Security policy: Passwords must not be stored in plaintext files

## Options Considered

### Method A: App reads .p12 file directly (password entry at startup)

Display a password input modal at app startup, load .p12 from the specified path. Password is held only in Rust memory and discarded on app exit.

- **Pros:** Simple, no OS dependency, easiest to implement
- **Cons:** Requires password entry on every startup (operator burden)

### Method B: Store password in OS credential manager

Prompt for password at first startup, then store it encrypted in Windows Credential Manager (or Mac Keychain). Retrieve automatically on subsequent startups. Implemented via the Rust `keyring` crate.

- **Pros:** No password entry after the first time, OS-level encryption
- **Cons:** OS-specific implementation differences, dependency on `keyring` crate

### Method C: Use a certificate already imported into the OS certificate store

Import the certificate into Windows Certificate Store (or Mac Keychain) in advance; the app finds it by Common Name or similar. `native-tls` crate interfaces with the OS TLS library (SChannel / Secure Transport).

- **Pros:** App never handles the password (OS resolved it at import time)
- **Cons:** Certificate renewal/management becomes an OS-side operation, harder to automate

## Decision

**Phase 1: Adopt Method A (password entry at startup + in-memory retention).**

Migration to Method B may be considered depending on future requirements.

## Rationale

1. **Industrial PCs are typically dedicated machines:** One PC = one assigned operator, so a single password entry at startup is acceptable
2. **Implementation simplicity:** Can be implemented directly with `reqwest` + `native-tls`'s `Identity::from_pkcs12_der`
3. **Minimal dependencies:** No dependency on OS-specific certificate store operations; same code runs on Windows / Mac / Linux
4. **Security guarantee:** Password is retained only in memory; writing to files or logs is prohibited

## Implementation

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
        .map_err(|e| format!("Certificate error: {}", e))?;
    
    Client::builder()
        .identity(identity)
        .danger_accept_invalid_certs(accept_invalid_certs)
        .build()
        .map_err(|e| e.to_string())
}
```

## Security Notes

- When passing passwords as `String` to Tauri Commands, logging or embedding in error messages is prohibited
- The .p12 file path must be selected by the user via the OS file dialog; never hardcode it in the app
- `danger_accept_invalid_certs(true)` is for development only; production must switch to explicitly trusting a local CA certificate

## Consequences

- App startup requires a UI for entering certificate path and password (UI design decided in ADR-004)

## Related ADRs

- [ADR-001](./adr-001-framework.md) - Framework selection
- [ADR-003](./adr-003-plc-connection.md) - PLC connection management
