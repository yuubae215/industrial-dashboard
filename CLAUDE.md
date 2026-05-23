# CLAUDE.md — industrial-dashboard

Development guide for the industrial dashboard (Tauri v2 + React + TypeScript).

> **Supreme Authority:** All implementation decisions follow the Three Axioms in [PHILOSOPHY.md](./PHILOSOPHY.md).

---

## Linux System Dependencies (Required)

**Building Tauri v2 on Linux requires the following system libraries.**
Without them, `cargo check` / `cargo build` will fail building `gdk-sys`.

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev
```

Verify installation:

```bash
pkg-config --exists webkit2gtk-4.1 && echo "OK"
```

## Development Commands

```bash
# Install frontend dependencies
pnpm install

# TypeScript type check (detects branded type misuse errors)
pnpm build

# Rust backend compile check (requires Linux libraries)
cd src-tauri && cargo check

# Start dev server (first run takes several minutes for Rust compilation)
pnpm tauri dev
```

## Project Structure

```
industrial-dashboard/
├── PHILOSOPHY.md               # Design philosophy (supreme authority) ← must read
├── src/                        # Frontend (React + TypeScript)
│   ├── App.tsx
│   └── types/
│       ├── branded.ts          # Branded types (enforces "do not mix" at compile time)
│       └── domain.ts           # Domain types (PLC config, connection state, fixed slots)
├── src-tauri/                  # Backend (Rust)
│   ├── Cargo.toml              # Dependencies: tokio, reqwest(native-tls), thiserror
│   └── src/
│       ├── lib.rs              # Tauri Command registration
│       ├── plc/
│       │   ├── mitsubishi.rs   # Mitsubishi MC Protocol 3E frame (binary TCP)
│       │   └── keyence.rs      # Keyence Upper Link (ASCII TCP)
│       └── mtls/
│           └── mod.rs          # mTLS client using password-protected .p12
└── docs/
    ├── adr/                    # Architecture Decision Records (ADR-001–007)
    ├── contracts/              # Per-layer contracts (constitutional prohibitions)
    └── governance/
        └── yellow-cards.md     # Yellow card tracking ledger
```

## Tauri Commands

| Command | Description |
|---|---|
| `plc_read_mitsubishi` | Mitsubishi PLC batch device read (D/M/W/X/Y/B) |
| `plc_read_keyence` | Keyence PLC batch device read |
| `plc_write_keyence` | Keyence PLC device write |
| `mtls_get` | GET request with mTLS authentication |
| `mtls_post` | POST request with mTLS authentication |

---

## The Three-Layer Architecture Rules (Required Reading)

### 1. Axiom 1: No Semantics in the Protocol Layer

Functions in `src-tauri/src/plc/` only "send/receive byte sequences and return raw values."
Polling interval, thresholds, device names, and meanings must never be written here.

### 2. Axiom 2: No SSOT in the UI

React components must not hold "previous PLC raw values" in `useState` for delta calculation.
PLC raw values (`PlcRawValue`) are held only in the Zustand store; display values are computed each time via pure functions.

### 3. Axiom 3: No Casts Outside Branded Type Constructors

```typescript
// Allowed: use constructor functions in branded.ts
const val = asPlcRawValue(response.values[0])

// Prohibited: force casts are absolutely forbidden
const val = response.values[0] as PlcRawValue  // ← 🟥 Red Card
```

---

## Code Governance (Yellow/Red Card System)

> **This is not a runtime UI alert. This is a development process rule for governing code.**

When a risky implementation pattern is discovered:
1. Record it in `docs/governance/yellow-cards.md` and increment the count
2. When the same pattern accumulates more than 3 times, add it as a prohibition clause in `docs/contracts/`
3. Add one line to the "Absolute Prohibitions" section of this file (CLAUDE.md) to make it permanent

Detailed rules → [ADR-006](./docs/adr/adr-006-yellow-red-card-governance.md)

---

## Absolute Prohibitions

> Items listed here are 🟥 Red Cards (merge rejection).
> When new antipatterns recur frequently, add them to this section to ascend them to philosophy.

*(Currently, all prohibitions in contracts apply. Frequently-occurring patterns will be appended below.)*

---

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
