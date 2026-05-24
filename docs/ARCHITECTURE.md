# Architecture Specification

> **Supreme Authority:** [PHILOSOPHY.md](../PHILOSOPHY.md) governs all decisions in this document.
> Any conflict between this document and PHILOSOPHY.md resolves in favor of PHILOSOPHY.md.

---

## 1. The Three Axioms (Concrete Implementation Rules)

These axioms are the constitutional foundation. All layer contracts, ADRs, and code review decisions derive from them.

### Axiom 1: Orthogonal Separation of Operator Intent and Physical Protocol

`src-tauri/src/plc/` functions are **pure byte-sequence converters only**.

- What to read (`D1000`), when to read (500ms interval), and what it means ("temperature sensor") are **never written in the protocol layer**
- The only bridge between semantics and protocol is `src-tauri/src/lib.rs` (Tauri Command registration) — and even here, semantic decisions must not be made
- Polling interval configuration belongs to `PlcConfig` (Rust-side SSOT), not to frontend component Props

### Axiom 2: SSOT — State is Parameters Only, Display is Always Forward-Calculated

```
PLC raw value (PlcRawValue) — SSOT
         |
         v  pure function (scaling, unit conversion)
Engineering value (EngineeringValue) — computed each frame, never stored
         |
         v
Display string — computed each frame, never stored
```

The Zustand store holds only: `PlcRawValue[]`, timestamps (`number`), and `ConnectionStatus`.
Delta accumulation is prohibited because floating-point errors self-amplify and corrupt state after reconnection.

### Axiom 3: Muscle Memory UX — Fixed Slots and UI Thread Protection

Factory operators navigate the dashboard while wearing gloves, without looking at the screen.

- **Fixed-slot principle:** Container size and position remain invariant regardless of display content changes
- **UI thread protection:** PLC communication and data transformation run in Rust (tokio runtime) via Tauri commands; the main thread is never blocked even for 1ms
- **Anti-jitter:** Domain state is committed first, then the view synchronizes unidirectionally

---

## 2. System Topology

```
+-------------------------------------------------------+
|                  Frontend (React + TypeScript)         |
|                                                       |
|  React Components                                     |
|  (Dashboard / MetricCard / RealtimeTrendChart / ...)  |
|       |  read (selector hooks)                        |
|       v                                               |
|  Zustand Store                                        |
|  (usePlcStore / useAlarmStore / usePlcConfigStore /   |
|   useSignalConfigStore / useTrendConfigStore /        |
|   useDebugStore)                                      |
|       ^  updateRawValues / setConnectionStatus        |
|       |                                               |
|  Custom Hooks                                         |
|  (usePlcPolling / usePlcWrite)                        |
|       |  invoke()                                     |
+-------|-----------------------------------------------+
        | Tauri IPC (async, non-blocking)
        v
+-------------------------------------------------------+
|                  Backend (Rust + Tauri v2)             |
|                                                       |
|  lib.rs  — Tauri Command registration                 |
|       |  calls                                        |
|       v                                               |
|  plc/mitsubishi.rs  — MC Protocol 3E frame (binary)   |
|  plc/keyence.rs     — Upper Link (ASCII TCP)          |
|  mtls/mod.rs        — mTLS client (.p12 cert)         |
|       |                                               |
|       v  TCP / HTTPS                                  |
|  Physical PLC / API server                            |
+-------------------------------------------------------+
```

---

## 3. Configuration Storage Topology

Alert thresholds and signal definitions are never hardcoded in frontend components.
They live in a JSON file under the user's home directory, managed exclusively by the Rust backend.

```
~/.plc-telemetry/
└── devices.config.json       ← Signal definitions + alert thresholds (SSOT for config)
```

**Lifecycle:**

```
[Tauri Boot]
     |
     v  src-tauri/src/config/mod.rs
[config::load()]
     |── file exists? → parse JSON → return DeviceConfig
     └── missing?     → no-op (ユーザーが手動で設定)
     |
     v  Tauri IPC: invoke("config_load")
[useDeviceConfig() hook]
     |
     v  useSignalConfigStore.setSignalConfig() (per signal)  ← ADR-010 Phase 1
[useSignalConfigStore — SignalConfig[] hydrated (SSOT for thresholds)]
     |
     v  usePlcStore.subscribe() cross-store
[useAlarmStore._processNewValues() — useSignalConfigStore.getState() を参照]
     |
     v  DiagnosticPane (bottom Output window)
[Active alarms displayed]
```

**Zustand Store Responsibility Boundaries (ADR-010):**

| Store | Persistence | Responsibility |
|---|---|---|
| `usePlcStore` | no-persist | PlcRawValue[], timestamps, ConnectionStatus (SSOT) |
| `useAlarmStore` | no-persist | AlarmEntry[] event log only |
| `useSignalConfigStore` | persist ('signal-configs') | Threshold SSOT — HH/H/L/LL per signal |
| `useTrendConfigStore` | persist ('trend-configs') | Trend display config — isActive, label per signal |
| `useDebugStore` | persist ('watch-slots') | WatchSlot layout — slot index ↔ address mapping only |
| `usePlcConfigStore` | persist | PLC host/port/timeout settings |

**Absolute prohibition:** Alarm thresholds must never be hardcoded in `Dashboard.tsx` or
any other React component. All threshold values must originate from `devices.config.json`
loaded via `config_load` or user input via `useSignalConfigStore`. Violation is a 🟥 Red Card.

---

## 4. Four-Layer Architecture

### Layer 1: UI Presentation Layer

**Files:** `src/components/`, `src/styles/theme.ts`

Responsibilities:
- Render widgets based on SSOT values from the Zustand store
- Apply ISA-101 monochromatic baseline styling from `src/styles/theme.ts`
- Maintain fixed-slot layout invariance (ADR-004)

Hard constraints (from `docs/contracts/ui-layer.md`):
- Never invoke `invoke()` directly — route through a store action or custom hook
- Never cache PLC raw values in component `useState` for delta calculation
- Never use `display: none` to hide buttons — use `disabled` + visual greying

### Layer 2: Domain / State Layer

**Files:** `src/store/`, `src/types/branded.ts`, `src/types/domain.ts`, `src/config/plc.ts`

Responsibilities:
- Hold SSOT (`PlcRawValue[]`, timestamps, `ConnectionStatus`) in Zustand stores
- Expose computed derived values as pure getter functions (never stored)
- Enforce branded type separation at compile time

Hard constraints (from `docs/contracts/domain-layer.md`):
- Never store `EngineeringValue`, delta values, alert flags, or formatted strings
- Never bypass branded type constructors (`asPlcRawValue()`, `asPortNumber()`, etc.)
- Validate only at system boundaries (immediately after `invoke()` response)

### Layer 3: Async Infrastructure Layer

**Files:** `src/hooks/usePlcPolling.ts`, `src/hooks/usePlcWrite.ts`

Responsibilities:
- Manage 500ms polling intervals via `setInterval` + async `invoke()`
- Pipe Tauri IPC responses into Zustand store actions
- Never block the UI thread

Canonical polling pattern:
```typescript
useEffect(() => {
  const id = setInterval(async () => {
    const result = await invoke<ReadResult>('plc_read_mitsubishi', { config })
    store.updateRawValues(plcId, result.values, Date.now())
  }, 500)
  return () => clearInterval(id)
}, [plcId])
```

Hard constraints (from `docs/contracts/async-infra-layer.md`):
- Never run polling loops inside a Tauri command (Rust side)
- Never make polling blocking by chaining awaits
- Retry logic belongs to a Rust-side task, not `setTimeout` in frontend

### Layer 4: PLC Protocol Layer

**Files:** `src-tauri/src/plc/mitsubishi.rs`, `src-tauri/src/plc/keyence.rs`, `src-tauri/src/plc/mod.rs`

Responsibilities:
- Mitsubishi: assemble MC Protocol 3E frames (binary TCP), parse response bytes into `Vec<i32>`
- Keyence: send/receive ASCII Upper Link commands (`RDS`/`WRS`), parse response text into `Vec<i32>`
- Protocol-level error detection only (end codes, `!` prefix, etc.)

Hard constraints (from `docs/contracts/plc-protocol-layer.md`):
- Never write polling intervals, retry logic, or business meaning here
- `mitsubishi.rs` and `keyence.rs` must never import each other
- All shared types (`PlcConfig`, `ReadResult`, `PlcError`) are defined only in `plc/mod.rs`
- All `PlcError` variants propagate as-is to the frontend — no swallowing with `unwrap_or_default()`

---

## 4. Layout Topology by Viewport (ADR-008 + ADR-009)

The system morphs its layout topology at the `768px` breakpoint. **`display: none` is absolutely
prohibited.** The same component tree adapts via `isMobile` style tokens.

### 4a. Desktop (≥ 768px) — IDE High-Density Engine Memory

```
+-----------------------------------------------------------------------+
| MENU BAR (28px) [Project][View][Online][Tools]  MELSEC•  KV•         |
+-----------------------------------------------------------------------+
| HEADER (36px)  MC Protocol 3E — 500ms               HH:MM:SS        |
+------------+--------------------------------------------------+
| LEFT       |         MAIN CONTENT                             |
| SIDEBAR    |                                                  |
| FIELD      |  RealtimeTrendChart / WatchWindow                |
| NETWORK    |                                                  |
| [⬅][⚙][📈][🔧]  ← icon ribbon toolbar (horizontal, 28px)       |
| ---------- |                                                  |
| PLC Tree   |                                                  |
| (IP/Port   |                                                  |
|  info)     |                                                  |
+------------+--------------------------------------------------+
| DIAGNOSTIC PANE (200px) [ALARMS] [OUTPUT]  — IDE Output window |
| HH 14:22:01  melsec-line-a D1000 = 2510 — High-High  [ACK]   |
+-----------------------------------------------------------------------+
| STATUS BAR (28px): mode | polling | tag count                         |
+-----------------------------------------------------------------------+
```

Notes:
- Header height reduced to 36px on desktop; app title removed (OS window titlebar covers it)
- FixedControlSlots (vertical) is rendered as a horizontal icon ribbon between the "FIELD NETWORK"
  header label and the PLC tree, not at the sidebar bottom
- Sidebar PLC tree shows network info (IP, port, poll rate) rather than live register values

### 4b. Mobile (< 768px) — Glove-Friendly Industrial Tablet

```
+-----------------------------------------------------------------------+
| HEADER (48px)  INDUSTRIAL DASHBOARD              HH:MM:SS            |
+-----------------------------------------------------------------------+
| MAIN CONTENT AREA (flex: 1, overflowY: auto, internal scroll)        |
|   WatchWindow / RealtimeTrendChart                                    |
+-----------------------------------------------------------------------+
| DIAGNOSTIC PANE (160px) [ALARMS] [OUTPUT]  — tabbed bottom pane     |
+-----------------------------------------------------------------------+
| FIXED FOOTER SLOTS (64px, 4-col grid — each ≥ 44px touch target)    |
| [<- Back (disabled)] [Settings] [Trend] [Maintenance]                |
+-----------------------------------------------------------------------+
```

Slot invariance rules (identical to tablet footer variant from ADR-004):
- Slot 0: Cancel / Back — reserved, always disabled
- Slot 1: Settings — opens ConnectionSettings
- Slot 2: Trend toggle
- Slot 3: Maintenance toggle
- Slots are disabled (greyed) when unavailable — never physically removed

---

## 5. Form Layout Adaptation (ADR-009)

Connection settings and parameter dialogs adapt their form layout across the breakpoint,
using the **same component** with different style tokens.

### Desktop form (≥ 768px): IDE high-density horizontal grid

```
┌───────────────────────────────────────────────────────────────┐
│ Mitsubishi MELSEC                                             │
│ ┌────────────────────────┬─────────────┬───────────────────┐ │
│ │ Host / IP Address      │ Port        │ Timeout (ms)      │ │
│ │ 192.168.0.1            │ 8502        │ 3000              │ │
│ └────────────────────────┴─────────────┴───────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                                    [Cancel] [Save & Apply]
```

- `gridTemplateColumns: '1fr 110px 130px'` — mirrors GX Works parameter form density
- Inputs: `padding: 8px 10px`, `fontSize: 13px` — compact, keyboard-navigable
- Dialog anchors at center of viewport

### Mobile form (< 768px): glove-friendly vertical stack

```
┌───────────────────────────────────┐
│ Connection Settings               │
│                                   │
│ Mitsubishi MELSEC                 │
│ Host / IP Address                 │
│ ┌─────────────────────────────┐   │
│ │ 192.168.0.1                 │   │  ← min-height: 44px
│ └─────────────────────────────┘   │
│ Port                              │
│ ┌─────────────────────────────┐   │
│ │ 8502                        │   │  ← min-height: 44px
│ └─────────────────────────────┘   │
│ Timeout (ms)                      │
│ ┌─────────────────────────────┐   │
│ │ 3000                        │   │  ← min-height: 44px
│ └─────────────────────────────┘   │
│ ┌──────────────────────────────┐  │
│ │ Save & Apply (primary)       │  │  ← min-height: 44px, order: 1
│ └──────────────────────────────┘  │
│ ┌──────────────────────────────┐  │
│ │ Cancel                       │  │  ← min-height: 44px, order: 2
│ └──────────────────────────────┘  │
└───────────────────────────────────┘
```

- `flexDirection: 'column'` — each field full-width, stacked vertically
- Input `minHeight: 44px` — prevents mis-tap through industrial work gloves
- Dialog slides up from bottom (sheet pattern), `borderRadius: '12px 12px 0 0'`
- Primary action (Save) placed first (order: 1) for glove-index accessibility

### Prohibition

Never build separate `<DesktopConnectionSettings>` / `<MobileConnectionSettings>` components
and toggle them via `display: none` or `{isMobile && ...}`. The layout must morph through
style properties on the same component — this is a 🟥 Red Card.

---

## 6. Branded Type Hierarchy

```
number (raw)
   |
   v  asPlcRawValue()
PlcRawValue  ─────────────────────────────────── SSOT boundary
   |
   v  pure function (scale, offset from PlcConfig)
EngineeringValue  ───────────────────────────── display-only, never stored
   |
   v  toFixed() / unit suffix
string (display)  ───────────────────────────── render-only
```

Type constructors live in `src/types/branded.ts`. Direct `as` casts are a 🟥 Red Card.

---

## 7. Error Propagation Contract

```
Rust PlcError variants                Frontend ConnectionStatus / AlertState
─────────────────────────────────────────────────────────────────────────
Connection(io::Error)          →      ConnectionStatus::Error
Protocol(String)               →      AlertState::ProtocolError
Timeout                        →      ConnectionStatus::Timeout
```

Misrepresenting error types (e.g., returning `Protocol` as `Connection`) is prohibited.

---

## Related Documents

| Document | Role |
|---|---|
| [PHILOSOPHY.md](../PHILOSOPHY.md) | Supreme authority — Three Axioms |
| [docs/adr/](./adr/) | Architecture Decision Records (ADR-001–008) |
| [docs/contracts/ui-layer.md](./contracts/ui-layer.md) | UI layer prohibitions |
| [docs/contracts/domain-layer.md](./contracts/domain-layer.md) | Domain layer prohibitions |
| [docs/contracts/plc-protocol-layer.md](./contracts/plc-protocol-layer.md) | Protocol layer prohibitions |
| [docs/contracts/async-infra-layer.md](./contracts/async-infra-layer.md) | Async infra prohibitions |
| [docs/STATE_TRANSITIONS.md](./STATE_TRANSITIONS.md) | State machine and data flow diagrams |
| [docs/DEVELOPMENT.md](./DEVELOPMENT.md) | Development workflow and guardrails |
| [docs/adr/adr-009-form-layout-adaptation.md](./adr/adr-009-form-layout-adaptation.md) | Form Layout Adaptation decision record |
