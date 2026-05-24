<div align="center">

# industrial-dashboard

**Real-time industrial monitoring and control dashboard**

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-stable-CE422B?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![Demo](https://img.shields.io/badge/Demo-GitHub%20Pages-0d1117?logo=github)](https://yuubae215.github.io/industrial-dashboard/)

A desktop application connecting factory PLCs directly to a typed, governed React UI — no cloud intermediary, no polling hacks, no layout jitter.

[**Live Demo**](https://yuubae215.github.io/industrial-dashboard/) · [Philosophy](./PHILOSOPHY.md) · [Architecture](./docs/ARCHITECTURE.md) · [ADRs](./docs/adr/)

</div>

---

## What it does

```
PLC (Mitsubishi / Keyence)
        │  TCP (MC Protocol 3E frame)
        ▼
  Rust Backend  ──────────────────────────────────────────────────────
  ├── plc/mitsubishi.rs   Binary 3E frame encode/decode
  ├── plc/keyence.rs      ASCII Upper Link protocol
  └── mtls/mod.rs         Mutual TLS with .p12 client certificates
        │  Tauri IPC (invoke / emit)
        ▼
  React Frontend  ─────────────────────────────────────────────────────
  ├── Zustand store       Single source of truth (PlcRawValue)
  ├── Pure transforms     Scaling, unit conversion — no mutable deltas
  └── Fixed-slot layout   Positions never move; glove-friendly UX
```

---

## Highlights

| | |
|---|---|
| **Typed protocol pipeline** | MC Protocol 3E-frame binary codec entirely in Rust; branded TypeScript types prevent raw values from leaking into display logic at compile time |
| **Engineering watch window** | Built-in debug overlay modelled after GX Works3's watch window — force-read or force-write DM/D registers without leaving the dashboard |
| **Hardened mTLS** | Password-protected `.p12` client certificates live exclusively in Rust heap memory; no credentials on the JS side |
| **Fixed-slot UX** | Container positions are invariant regardless of PLC state — designed for gloved operators navigating without looking at the screen |
| **Governed codebase** | Yellow/Red card system automatically escalates recurring antipatterns from warnings → constitution → AI-enforced absolute prohibitions |

---

## Requirements

### All platforms

| Tool | Version |
|---|---|
| Node.js | v20 LTS |
| pnpm | v10+ |
| Rust (rustup) | stable 1.75+ |

### Linux (Ubuntu / Debian)

Tauri v2 requires WebKit2GTK and related system libraries:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev
```

Verify:

```bash
pkg-config --exists webkit2gtk-4.1 && echo "OK"
```

### Windows

1. **Build Tools for Visual Studio 2022**
   - Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/) → "All Downloads" → "Build Tools for Visual Studio 2022"
   - Select the **"Desktop development with C++"** workload
   - Licensing: please review [Microsoft's terms](https://visualstudio.microsoft.com/license-terms/vs2022-ga-buildtools/) directly to confirm permitted use for your context
2. **Rust**: run `rustup-init.exe` from [rustup.rs](https://rustup.rs)

### macOS

```bash
xcode-select --install
# Then install Rust from https://rustup.rs
```

---

## Getting started

### 1. Install frontend dependencies

```bash
pnpm install
```

### 2. Start mock servers (no physical hardware needed)

```bash
# Generate test TLS certificates and .p12 bundles
pnpm mock:gen-certs

# MC Protocol mock (Mitsubishi / Keyence MC-compatible) — port 5001
pnpm mock:mitsubishi

# Keyence Upper Link mock — port 8501
pnpm mock:keyence

# mTLS-authenticated HTTPS mock — port 8443
pnpm mock:https
```

### 3. Run

```bash
# Type check + build
pnpm build

# Start dev server (first run takes a few minutes for Rust compilation)
pnpm tauri dev

# Production binary
pnpm tauri build
```

---

## Tauri commands

| Command | Description |
|---|---|
| `plc_read_mitsubishi` | Batch device read — MC Protocol 3E frame (D / M / W / X / Y / B) |
| `plc_write_mitsubishi` | Device write — MC Protocol 3E frame |
| `mtls_get` | GET request with mTLS client certificate |
| `mtls_post` | POST request with mTLS client certificate |

---

## Architecture governance

This repository is governed by **Three Axioms** (defined in [PHILOSOPHY.md](./PHILOSOPHY.md)):

1. **No semantics in the protocol layer** — `src-tauri/src/plc/` only encodes/decodes bytes; polling intervals and thresholds belong elsewhere
2. **No SSOT in the UI** — `PlcRawValue` lives only in the Zustand store; display values are always forward-calculated via pure functions
3. **No casts outside branded type constructors** — `as PlcRawValue` is a 🟥 Red Card; use `asPlcRawValue()` instead

Violations are tracked in [docs/governance/yellow-cards.md](./docs/governance/yellow-cards.md) and automatically escalated via the Yellow → Red → Absolute Prohibition pipeline.

---

## Live demo

A browser-only demo (UI and data-flow verification, no TCP PLC connection) is deployed automatically to GitHub Pages on every push to `main`.

**[https://yuubae215.github.io/industrial-dashboard/](https://yuubae215.github.io/industrial-dashboard/)**

---

## Reference documents

| Document | Purpose |
|---|---|
| [PHILOSOPHY.md](./PHILOSOPHY.md) | Three Axioms — supreme authority |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Layer topology and cross-layer boundary rules |
| [docs/STATE_TRANSITIONS.md](./docs/STATE_TRANSITIONS.md) | State machines and telemetry data flows |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Development workflow, mock servers, and guardrails |
| [docs/adr/](./docs/adr/) | Architecture Decision Records (ADR-001 – ADR-008) |
| [docs/contracts/ui-layer.md](./docs/contracts/ui-layer.md) | UI layer contracts |
| [docs/contracts/domain-layer.md](./docs/contracts/domain-layer.md) | Domain layer contracts |
| [docs/contracts/plc-protocol-layer.md](./docs/contracts/plc-protocol-layer.md) | PLC protocol layer contracts |
| [docs/contracts/async-infra-layer.md](./docs/contracts/async-infra-layer.md) | Async infrastructure layer contracts |
| [docs/governance/yellow-cards.md](./docs/governance/yellow-cards.md) | Yellow card ledger |
