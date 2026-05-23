# ADR-001: Dashboard Application Framework and Windows Build Environment Selection

## Status

Accepted (2026-05-23)

## Context

We need to develop an industrial dashboard application that retrieves real-time data from Mitsubishi/Keyence PLCs within a factory network and communicates with a local web server via mTLS (mutual authentication).

Requirements:
- Target environment: Industrial PCs (IPC) running in a factory's isolated network
- Some IPCs may have limited memory and CPU resources
- PLC communication (Mitsubishi MC Protocol / Keyence Upper Link) uses binary/text TCP frames
- mTLS communication with the local web server uses password-protected .p12 certificates
- Development leverages a Coding Agent (Claude Code)

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Electron** | Rich Node.js ecosystem, JS-only stack | Bundles Chromium → 100MB+ app size, high memory footprint, no mobile support |
| **Tauri v2** | Uses OS native WebView, lightweight (~10MB), Rust backend is fast and memory-safe | Rust learning curve |

### Windows Build Environment Options

| Option | License | Notes |
|---|---|---|
| **Visual Studio 2022 Community** | Commercial use restricted (< 250 PCs / < $1M revenue / ≤ 5 devs) | Unusable for outsourced development or large enterprises |
| **Build Tools for Visual Studio 2022** | Free for commercial C++ build use | Compiler and SDK only; use Cursor / VS Code as the editor |
| **Visual Studio Professional** | Commercial use allowed (paid) | Consider for larger teams |

## Decision

Adopt the following stack:

- **Framework:** Tauri v2
- **Frontend:** React + TypeScript + Vite
- **Backend:** Rust (Tauri Core)
- **Windows build environment:** Build Tools for Visual Studio 2022 (Desktop development with C++)
- **Code editor / Coding Agent:** Claude Code

## Rationale

1. **Resource efficiency:** Memory footprint stays in the tens of MB range, ensuring stable operation on low-spec IPCs
2. **Robust backend:** Rust's type safety and memory safety prevent crashes in PLC frame parsing and socket management
3. **Secure cryptographic processing:** Password-protected .p12 certificate decoding and mTLS client construction can be safely implemented in Rust (`reqwest` + `native-tls`)
4. **Compliance:** Using Build Tools eliminates license violation risks
5. **AI affinity:** React + TypeScript has the richest LLM training data, maximizing UI generation accuracy with the Coding Agent

## Consequences

- Rust learning curve (offset by Coding Agent assistance)
- Initial build requires setting up Rust (rustup) and Build Tools
- Using OS native WebView may cause minor rendering differences across Windows / Mac / Linux

## Related ADRs

- [ADR-002](./adr-002-mtls-cert-management.md) - mTLS certificate management
- [ADR-003](./adr-003-plc-connection.md) - PLC connection management
