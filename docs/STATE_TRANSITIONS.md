# State Transitions and Telemetry Data Flows

> All state transitions must conform to PHILOSOPHY.md Axiom 2 (SSOT) and Axiom 3 (fixed-slot / anti-jitter).
> State mutations not described in this document require a new ADR before implementation.

---

## 1. ConnectionStatus State Machine

Valid state transitions (from `docs/contracts/domain-layer.md` Contract 4):

```
                   invoke() called
                        |
   +--------------------v--------------------+
   |              Connecting                 |
   +--------------------+--------------------+
                        |
          +-------------+-------------+
          |                           |
          v                           v
    Connected                     Error
          |                           |
          |  operator disconnect      |  Rust exponential backoff
          v                           |  (ADR-003; frontend does NOT own timing)
    Disconnecting                     |
          |                           |
          v                           v
    Disconnected <---------+    Connecting (retry)
                           |
                    operator resets
```

Prohibited transitions (🟥 Red Card):
- `Connected` → `Disconnected` directly (must pass through `Disconnecting`)
- Any transition not in the diagram above
- Frontend `setTimeout` for retry timing — retry belongs to the Rust-side task

State is stored in `usePlcStore` as `connectionStatus: Map<string, ConnectionStatus>` keyed by `plcId`.
The `disabled` state of fixed-slot control buttons is derived from `ConnectionStatus` via selectors — never stored separately.

---

## 1b. Polling Enable State (per-device)

`Dashboard.tsx` holds `pollingStates: Record<string, boolean>` as local React state (not Zustand):

```
pollingStates = {
  'melsec-line-a': false,   // MELSEC ポーリング有効フラグ
  'kv-line-b':     false,   // Keyence ポーリング有効フラグ
}
```

This is separate from `connectionStatuses` (which reflects the Rust-side TCP result):
- `pollingStates[plcId] = true` → `usePlcPolling` hook is enabled → sets status to `'connecting'`, then `'connected'` or `'error'`
- `pollingStates[plcId] = false` → hook is disabled → status forced to `'disconnected'`

Mutation points:
- `handleConnectAll()` — sets all entries to `true` (Toolbar CONNECT / FixedControlSlots Slot 0)
- `handleDisconnectAll()` — sets all entries to `false`
- `handleConnectOne(plcId)` — sets one entry to `true` (ConnectionSettings per-device button)
- `handleDisconnectOne(plcId)` — sets one entry to `false`

`isAllConnected = Object.values(pollingStates).every(Boolean)` is passed to `Toolbar.isPollingActive`.
`isAnyConnected = Object.values(pollingStates).some(Boolean)` is passed to `FixedControlSlots.isConnected`.

---

## 2. Telemetry Data Lifecycle

High-level flow from physical PLC register to rendered widget:

```
Physical PLC register (D1000, M0, ...)
         |
         |  TCP (binary 3E frame / ASCII Upper Link)
         v
src-tauri/src/plc/mitsubishi.rs or keyence.rs
         |  Vec<i32> (raw register values)
         v
src-tauri/src/lib.rs  (Tauri Command)
         |  serialized as JSON
         v
Tauri IPC boundary
         |  invoke() in usePlcPolling.ts
         v
asPlcRawValue() constructor (branded type)
         |  PlcRawValue[]
         v
usePlcStore.updateRawValues(plcId, values, Date.now())
         |
         +------------------+------------------+
         |                  |                  |
         v                  v                  v
   MetricCard         RealtimeTrend       WatchWindow
   (reads current      Chart (maps         (shows current
   via selector)       timeline arrays     value per address)
                       for active
                       signal keys)
```

### SSOT invariant

The store holds only:
```typescript
rawValues:        Map<string, PlcRawValue[]>   // keyed by plcId
timestamps:       Map<string, number>           // Unix ms, keyed by plcId
connectionStatus: Map<string, ConnectionStatus> // keyed by plcId
```

Everything downstream is derived each frame via pure functions. Nothing derived is stored.

---

## 3. Watch Window Signal Activation Flow

When an operator toggles a signal in `WatchWindow` (ADR-010 Phase 2):

```
WatchWindow component
         |  ○ button onClick
         v
useTrendConfigStore.setTrendConfig(plcId, address, { isActive: true/false })
         |
         v  persisted to localStorage ('trend-configs')
useTrendConfigStore.configs[]
         |
         |  reactive selector
         v
RealtimeTrendChart
         |  filters slots where trendConfig.isActive === true
         |
         +-- activeSlots.length === 0
         |          |
         |          v
         |    render empty placeholder
         |    (container maintains fixed height — no layout shift)
         |
         +-- activeSlots.length > 0
                    |
                    v
              map active slots to <Line dataKey={key} name={trendConfig.label || key} />
              (lines appear / disappear without container resize)
```

Container height is fixed (explicit pixel value on parent div). The chart never resizes
in response to the number of active signals — this enforces Axiom 3 (anti-jitter).

**Signal label (Comment field):** stored in `useTrendConfigStore.configs[].label`. Keyed by
`plcId + address`. Persists independently of which WatchSlot slot index the address occupies.

---

## 4. Alarm State Transitions

**前提条件:** アラームが評価されるのは、対象アドレスが `useDebugStore.slots` に登録済み
（`slot.plcId === plcId && slot.address === <address>`）の場合のみ。
WatchSlot に未登録のアドレスは閾値が `useSignalConfigStore.configs` に存在していても評価されない。

```
Normal (no active alarms)
         |
         |  WatchSlot にアドレスを登録 + useSignalConfigStore で閾値を設定
         |  → PLC 値が閾値を超えたとき
         v
Active alarm  →  written to useAlarmStore.entries[]
         |
         +--  WatchSlot からアドレスを削除
         |         |
         |         v
         |    auto-cleared (clearedAt = now)
         |
         |  operator acknowledges
         v
Acknowledged (still active, silenced)
         |
         |  PLC value returns to normal range
         v
Cleared
         |
         |  auto-purge after retention period
         v
(removed from store)
```

Alarm flags are **never stored** in `usePlcStore`. They are computed by selectors each frame
from `PlcRawValue` and threshold parameters in `useSignalConfigStore`. Only acknowledged/cleared
state is persisted in `useAlarmStore.entries[]` (no-persist store).

Cross-store gating: `_processNewValues` calls `useDebugStore.getState()` and
`useSignalConfigStore.getState()` at evaluation time (Zustand official cross-store pattern).

---

## 5. Configuration Hydration Flow (ADR-010 Phase 1 以降)

閾値の SSOT は `useSignalConfigStore`（persist あり）に一本化された。

```
[Tauri Application Boot]
         |
         +──────────────────────────────────────────────+
         |                                              |
         v  src-tauri/src/config/mod.rs :: load()       v  localStorage 'signal-configs'
[config::load()]                                 [Zustand persist rehydrate]
         |── devices.config.json exists?                |
         |        yes → parse JSON                      v
         |        no  → no-op                  [useSignalConfigStore.configs[] rehydrated]
         v
[Tauri IPC: "config_load"]
         v
[useDeviceConfig() hook]
         v  configToSignalConfigs(): SignalConfig[]
[useSignalConfigStore.setSignalConfig()] × N
         |
         v
[useSignalConfigStore.configs[] — 最終閾値セット（SSOT）]
         |
[usePlcStore.subscribe()] cross-store subscription
         v
[useAlarmStore._processNewValues(plcId, addressMap)]
         |  useSignalConfigStore.getState().configs を参照
         |  useDebugStore.getState().slots で WatchSlot 登録済みアドレスのみ評価
         v
[useAlarmStore.entries[] — active AlarmEntry records]
         |
         v  reactive selector
[DiagnosticPane ALARMS tab — rows rendered]
```

**Invariants:**
- `useDeviceConfig()` は `invoke("config_load")` を呼ぶ唯一の場所
- WatchWindow の閾値入力は `useSignalConfigStore.setSignalConfig()` に直接書き込む
- `asThresholdValue()` コンストラクタ経由のみ — 生キャストなし
- WatchSlot に未登録のアドレスは `_processNewValues` でゲーティングされ評価されない
- `useAlarmStore` はイベントログ（`entries[]`）専用 — 閾値データは持たない

---

## 6. Error Recovery Transitions

```
invoke() returns PlcError::Timeout or PlcError::Connection
         |
         v
usePlcStore.setConnectionStatus(plcId, ConnectionStatus::Error)
         |
         |  Rust-side tokio task begins exponential backoff (ADR-003)
         |  Frontend does NOT set timers or manage retry count
         v
usePlcStore.setConnectionStatus(plcId, ConnectionStatus::Connecting)
         |
         |  on success:
         v
usePlcStore.setConnectionStatus(plcId, ConnectionStatus::Connected)
usePlcStore.updateRawValues(plcId, freshValues, Date.now())
         |
         v
Chart retains structural height throughout (Axiom 3)
Last cached PlcRawValue[] remains visible until overwritten
```

The chart container must not collapse or resize during error state. The `RealtimeTrendChart`
renders the last known data points with a visual error indicator overlay — it does not unmount.

---

## 7. Polling Interval State (usePlcPolling)

```
Component mounts
         |
         v
useEffect(() => {
  const id = setInterval(async () => {
    result = await invoke('plc_read_mitsubishi', { config })
    store.updateRawValues(plcId, result.values, Date.now())
  }, 500)
  return () => clearInterval(id)   // cleanup on unmount
}, [plcId])
```

State: `setInterval` handle is local to the effect. It is never stored in Zustand or component state.
Polling interval (`500`) comes from `PlcConfig` (Rust-side SSOT) — it is never a component Prop.

---

## 8. Branded Type Boundary Map

```
System boundary               Constructor              Type
──────────────────────────────────────────────────────────────
invoke() response (JSON)  →  asPlcRawValue()       →  PlcRawValue   (SSOT)
PlcConfig rehydration     →  asPortNumber()         →  PortNumber
PlcConfig rehydration     →  asTimeoutMs()          →  TimeoutMs
PlcRawValue + scale       →  (pure function)        →  EngineeringValue  (derived, not stored)
```

Crossing these boundaries without the constructor function is a 🟥 Red Card.

---

## 9. Responsive Viewport Transformation (ADR-009)

How `useIsMobile` feeds layout token selection across the component tree.

```
Window resize event
         |
         v
useIsMobile hook (768px breakpoint)
         |
         v
isMobile: boolean  ──── stored as local hook state (not in Zustand — it is
         |              a presentation-layer concern, not domain state)
         |
         +────────────────────────────────+────────────────────────────+
         |                                |                            |
         v (isMobile = false)             v (isMobile = true)         v
                                                                       |
    Dashboard renders:              Dashboard renders:                 |
    • <MenuBar /> (28px)            • no MenuBar                       |
    • <LeftSidebar />               • no LeftSidebar                   |
    • <DiagnosticPane              • <DiagnosticPane                   |
        height={200} />               height={160} />                  |
    • <StatusBar /> (28px)          • <FixedControlSlots               |
    • <FixedControlSlots              layout="horizontal" /> (64px)    |
        layout="vertical" />                                           |
                                                                       |
         +─────────────────────────────────────────────────────────────+
         |
         v
ConnectionSettings receives isMobile prop:

  isMobile=false:                    isMobile=true:
  • dialog: center-anchor            • dialog: bottom-sheet (borderRadius top)
  • form: 3-col horizontal grid      • form: flex-column vertical stack
  • inputs: padding 8px 10px         • inputs: minHeight 44px (glove floor)
  • buttons: row (Cancel | Save)     • buttons: column (Save first, Cancel last)
  • width: 520px                     • width: 100%
```

### Layout token switching invariant

No DOM element is added or removed between viewports — the same component instance
changes its `style` properties. Conditional rendering (`{isMobile && <X />}`) is
permitted **only** for components that have no representation in the other viewport
(e.g., `<MenuBar />` has no mobile variant — it is hidden by conditional mount, not
by `display: none`).

The distinction: removing a structural layout element entirely (MenuBar) is acceptable.
Hiding a form, a dialog, or a control surface via `display: none` while keeping its
DOM twin alive is the prohibited pattern.

---

## Maintenance Rule

If a code change modifies:
- The set of states in any state machine above
- The set of fields stored in a Zustand store
- The direction of data flow between layers

...then this document **must be updated in the same commit**.
This is enforced by the AI compliance rule in `CLAUDE.md` (Documentation & Architecture Compliance section).

---

## Related Documents

| Document | Role |
|---|---|
| [PHILOSOPHY.md](../PHILOSOPHY.md) | Supreme authority |
| [docs/ARCHITECTURE.md](./ARCHITECTURE.md) | Layer topology |
| [docs/contracts/domain-layer.md](./contracts/domain-layer.md) | SSOT and branded type contracts |
| [docs/contracts/ui-layer.md](./contracts/ui-layer.md) | Unidirectional flow contracts |
| [docs/contracts/async-infra-layer.md](./contracts/async-infra-layer.md) | Polling and thread contracts |
| [ADR-005](./adr/adr-005-ssot-state-management.md) | SSOT design rationale |
| [ADR-003](./adr/adr-003-plc-connection.md) | Connection retry strategy (Rust side) |
