# industrial-dashboard

Real-time industrial monitoring and control dashboard built with **Tauri v2**, **React 19**, and **TypeScript**.

> **Supreme Authority:** All implementation decisions follow the Three Axioms in [PHILOSOPHY.md](./PHILOSOPHY.md). Read it before contributing.

## Features

- **Unified MC Protocol (3E frame) pipeline** — Standardizes communication with multiple PLC vendors (Mitsubishi MELSEC and Keyence KV in MC-compatible mode) into a single binary TCP protocol stack, keeping frontend state management and type definitions simple and governable.
- **Engineering watch window** — Built-in debug UI modeled after GX Works3's watch window, enabling instant forced read/write operations on DM/D registers from the dashboard.
- **Hardened mTLS security** — Mutual TLS authentication using password-protected .p12 client certificates held exclusively in Rust backend memory.

## Requirements

### Frontend

- **Node.js**: v20.x LTS
- **npm**: v9.x or higher

### Backend

- **Rust**: stable 1.75.0 or higher

### Linux (Ubuntu/Debian) — Required for Tauri v2 WebView compilation

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev
```

Verify:

```bash
pkg-config --exists webkit2gtk-4.1 && echo "OK"
```

### Windows (recommended development environment)

1. **Build Tools for Visual Studio 2022** (free for commercial use)
   - Download from the [Visual Studio downloads page](https://visualstudio.microsoft.com/downloads/) under "All Downloads" → "Build Tools for Visual Studio 2022"
   - Select the **"Desktop development with C++"** workload
   - Note: Visual Studio Community has commercial use restrictions (see [ADR-001](docs/adr/adr-001-framework.md))
2. **Rust (rustup)**: Download and run `rustup-init.exe` from https://rustup.rs

### macOS

```bash
xcode-select --install
# Then install Rust from https://rustup.rs
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start mock servers (for environments without physical hardware)

```bash
# Generate test SSL certificates and .p12 bundles
npm run mock:gen-certs

# MC Protocol mock server for Mitsubishi/Keyence (MC-compatible) — Port 5001
npm run mock:mitsubishi

# mTLS-authenticated HTTPS mock server — Port 8443
npm run mock:https
```

### 3. Run the application

```bash
# TypeScript type check + Vite build
npm run build

# Start Tauri dev server (first run takes several minutes for Rust compilation)
npm run tauri dev
```

## Tauri Commands

| Command | Description |
|---|---|
| `plc_read_mitsubishi` | Batch device read via MC Protocol 3E frame (D/M/W/X/Y/B) |
| `plc_write_mitsubishi` | Device write via MC Protocol 3E frame |
| `mtls_get` | GET request with mTLS authentication |
| `mtls_post` | POST request with mTLS authentication |

## Architecture

```
[Frontend (React / TypeScript)]
        │ Tauri IPC (invoke / emit)
        ▼
[Backend (Rust)]
   ├── MC Protocol TCP ──► Mitsubishi PLC / Keyence PLC (MC-compatible mode)
   └── mTLS (reqwest)  ──► Local web server
```

See [docs/adr/](docs/adr/) for detailed architecture decisions.

## Demo (GitHub Pages)

A frontend-only demo (excluding Tauri desktop features) is automatically deployed to GitHub Pages, allowing UI/UX verification in the browser.

- **Demo URL:** `https://yuubae215.github.io/industrial-dashboard/`
- **Limitation:** Direct TCP socket communication with physical PLCs is not possible due to browser security restrictions. The demo is for verifying UI and data flow only.

Deployment is automated via GitHub Actions (`.github/workflows/deploy-demo.yml`).
Ensure the repository Settings → Pages → Source is set to **"GitHub Actions"**.

## Reference Documents

| Document | Content |
|---|---|
| [PHILOSOPHY.md](./PHILOSOPHY.md) | Design philosophy (supreme authority) |
| [docs/adr/](./docs/adr/) | Architecture Decision Records |
| [docs/contracts/ui-layer.md](./docs/contracts/ui-layer.md) | UI layer contracts |
| [docs/contracts/domain-layer.md](./docs/contracts/domain-layer.md) | Domain layer contracts |
| [docs/contracts/plc-protocol-layer.md](./docs/contracts/plc-protocol-layer.md) | PLC protocol layer contracts |
| [docs/contracts/async-infra-layer.md](./docs/contracts/async-infra-layer.md) | Async infrastructure layer contracts |
| [docs/governance/yellow-cards.md](./docs/governance/yellow-cards.md) | Yellow card tracking ledger |
