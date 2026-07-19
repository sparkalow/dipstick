## Project status

Step 1 (project scaffold) is done: Vite + Vue 3 + TypeScript + `vue-router`, three stub routes (`/`, `/vehicles`, `/vehicles/:id`), no ESLint/Prettier yet (not added — not requested for this step).

Step 2 (domain types + service-type config) is done: `src/domain/vehicle.ts` (`Vehicle`, `NewVehicle`), `src/domain/serviceTypes.ts` (`InputType`, `FieldConfig`, `ServiceTypeConfig`, the `oil_change`/`tire_rotation` seed configs, and the `ServiceDetails` union derived via `z.infer`), `src/domain/serviceRecord.ts` (`ServiceRecord`, `NewServiceRecord`). Unit-tested with Vitest (`src/domain/serviceTypes.test.ts`). No repositories or Dexie usage yet — that starts at Step 3.

Step 3 (repository interfaces + Dexie impl) is done: `src/repositories/types.ts` (`VehicleRepository`, `ServiceRecordRepository` interfaces), `src/repositories/db.ts` (`DipStickDB` Dexie subclass, `&id` primary keys, `vehicleId` index on `serviceRecords`), `src/repositories/DexieVehicleRepository.ts`, `src/repositories/DexieServiceRecordRepository.ts`, `src/repositories/index.ts` (the single factory/DI entry point — components/composables should import `vehicleRepository`/`serviceRecordRepository` from here, never construct a Dexie repo directly). `add`/`update` on `DexieServiceRecordRepository` validate `{ type, details }` against the matching service type's Zod schema (on `update`, the patch is merged onto the existing record first, then the merged result is validated) and throw on invalid data. `getCurrentOdometer(records, vehicleId)` was added to `src/domain/vehicle.ts` as a pure helper (max odometer across a vehicle's records, `undefined` if none) — `currentOdometer` is still never stored. `ServiceRecordRepository.delete()` didn't cascade to receipts at this step — no `receipts` table existed until Step 6.5 (below), which wired it in. Tested against `fake-indexeddb` (in-memory IndexedDB shim), not a real browser — `src/repositories/DexieVehicleRepository.test.ts`, `src/repositories/DexieServiceRecordRepository.test.ts`, `src/domain/vehicle.test.ts`.

Step 4 (composables) is done: `src/composables/useVehicles.ts` and `src/composables/useServiceRecords.ts` — the only data-access surface components may import. Each wraps its repository with **module-level shared reactive state** (`vehicles`/`records` + `loading` refs live at module scope, not inside the exported function), so every `useVehicles()`/`useServiceRecords()` call site sees the same list — a deliberate lightweight-store substitute since Pinia/TanStack aren't approved deps. `useServiceRecords` additionally tracks the last-requested scope (`loadAll()` vs `loadByVehicle(vehicleId)`) internally so `add`/`update`/`remove` know whether to refetch all records or just the current vehicle's. At Step 4, deliberately no `error` ref (mutations just threw/rejected) — `useVehicles` gained one at Step 5 (see below); `useServiceRecords` still doesn't have one, add if a future step's UI needs it. Tested end-to-end against the real Dexie repos (via `fake-indexeddb`, same as Step 3), not mocked — `src/composables/useVehicles.test.ts`, `src/composables/useServiceRecords.test.ts`.

Step 5 (vehicle CRUD, `/vehicles`) is done: `src/components/VehicleFormModal.vue` (add/edit modal — `vehicle: Vehicle | null` prop, `null`/absent = add mode; calls `useVehicles().add`/`update` directly, since composables are the data-access surface for any component, not just views) and a rewritten `src/views/VehicleManagement.vue` (list + add/edit/delete, delete confirmed via native `window.confirm()` — no custom confirm dialog). `useVehicles()` gained an `error = ref<string | null>(null)`, set when `add`/`update`/`remove` throws and cleared at the start of each call, so the UI can show a real failure instead of looking like it silently no-opped; `useServiceRecords()` was intentionally left without one. Plain scoped CSS with the existing `var(--color-*)`/`var(--space-*)` custom properties, matching `App.vue` — no new dependency. Verified with `npm run build` + `vue-tsc -b` + `npm test`, and manually click-tested end-to-end in a live browser (add/edit/delete on `/vehicles`).

Step 6 (config-driven `<ServiceRecordForm>`) is done: `src/components/ServiceRecordForm.vue` — a modal taking `vehicleId: string` (required, FK for new records) and `record?: ServiceRecord | null` (`null`/absent = add mode, matching `VehicleFormModal`'s convention), rendering the common fields (date, odometer, cost, notes) plus a service-type `<select>` and the dynamic `details` fields generated from that type's `FieldConfig[]` (`select`/`number`/`date`/`text` all handled; `tire_rotation`'s empty `fields: []` renders no extra inputs, proving the empty-details case works). Switching the type `<select>` clears `details` (the old values don't type-check against the new schema). On submit, `details` is normalized (empty strings/non-numbers → `undefined` for their field) and validated with `currentConfig.detailsSchema.safeParse` — the same schema the repository re-validates against — before calling `useServiceRecords().add`/`update`; Zod issues are mapped back to field labels for the error banner. `useServiceRecords()` gained the `error = ref<string | null>(null)` it was deliberately missing at Step 4/5, mirroring `useVehicles()`, so this form can surface a repository-level save failure the same way `VehicleFormModal` does. Not wired into a view (still Step 7/8's job); wasn't click-tested live at this step (Claude-in-Chrome was unavailable), addressed in Step 6.5 below via a temporary scratch harness. No component-level test was added — the project has no Vue component-testing infra (`@vue/test-utils`/jsdom); correctness rests on `npm run build`'s type-check plus the Zod-schema/repository tests it delegates validation to.
Step 6.5 (receipts) is done: `src/domain/receipt.ts` (`Receipt`: `id`, `serviceRecordId`, `blob: Blob`, `filename`, `mimeType`, `size`, `addedAt`), a `receipts` table (`&id, serviceRecordId`) added to `DipStickDB`, `src/repositories/DexieReceiptRepository.ts` implementing the `ReceiptRepository` interface from the spec (`getByServiceRecord`/`add(file, serviceRecordId)`/`delete`/`getObjectUrl`, wired into `src/repositories/index.ts` as `receiptRepository`), and `src/composables/useReceipts.ts` (same module-level-shared-state pattern as the other composables; owns an `objectUrls` cache keyed by receipt id so repeat `getObjectUrl` calls don't leak handles, and auto-revokes all cached URLs `onUnmounted` — guarded with `getCurrentInstance()` so calling it outside a component, e.g. in tests, doesn't warn). `DexieServiceRecordRepository.delete()` now cascade-deletes a record's receipts inside a single Dexie `rw` transaction spanning both tables — the Step 3 `TODO` is resolved. `ServiceRecordForm.vue` gained a `Receipts` section: newly-picked files are staged client-side as `pendingFiles` (own local `createObjectURL` preview, not yet persisted — add-mode has no `serviceRecordId` to attach to until the record itself saves) and only uploaded via `useReceipts().add` after the service record save succeeds; edit mode additionally loads and lists already-saved receipts via `loadByServiceRecord`, with an immediate per-receipt `Remove`. Oversized files (>5MB) get an inline warning, not a hard block; **image downscaling was deliberately not implemented** — the spec listed it as optional, left out to keep this step focused. Verified with `npm run build` + `vue-tsc -b` + `npm test`, and click-tested live (Claude-in-Chrome was available this session) via a temporary, reverted `Dashboard.vue` harness: added a tire-rotation record with a PDF receipt (confirmed the Blob persisted via a direct real-browser IndexedDB query), reopened it in edit mode to confirm the receipt reloads with a thumbnail/badge, removed it and confirmed the delete hit IndexedDB, and confirmed the >5MB warning text renders. Cascade delete is covered by a repository test, not an additional live-browser check.

Step 7 (vehicle history, `/vehicles/:id`) is done: a rewritten `src/views/VehicleHistory.vue` — lists a vehicle's service records newest-first, a "Log service" button opens `<ServiceRecordForm>` in add mode (the form's own type `<select>` is the "service-type picker"), each row has Edit/Delete (delete confirmed via `window.confirm()`, matching `VehicleManagement`), and a per-record receipt-count badge (`useReceipts().getCountsByServiceRecords`, a new bulk read-only lookup added alongside the existing single-scope `receipts` state) that opens a new `src/components/ReceiptPreviewModal.vue` (reuses `useReceipts()` to load + thumbnail that record's receipts; read-only, no remove). `ServiceRecordForm` gained a `currentOdometer?: number` prop — `VehicleHistory` computes it via the existing `getCurrentOdometer(records, vehicleId)` helper and passes it through, pre-filling the odometer field in add mode only (`record?.odometer ?? currentOdometer`). Also fixed a real gap surfaced while wiring this in: `VehicleManagement.vue`'s vehicle rows had no link to `/vehicles/:id` at all — added one (`RouterLink` on the vehicle name). Also fixed a genuine bug caught by live-browser testing, not by the type-checker: receipts upload as a step *after* the service record saves (see Step 6.5), so the `records` ref never changes again once a receipt is added — the receipt-count badge was going stale until something else touched `records`. Fixed by also recomputing counts when the form modal closes, not only on the `records` watcher. Verified with `npm run build` + `vue-tsc -b` + `npm test`, and click-tested live end-to-end through the real routes (not a scratch harness, since this view is now actually reachable): added an oil-change and a tire-rotation record each with a PDF receipt, confirmed the odometer pre-fill picked up the running max, confirmed the receipt badge appears immediately (not just after reload), opened the preview modal, edited a record (confirmed its existing receipt reloads), and deleted a record with `window.confirm` stubbed via the browser's JS console (native dialogs aren't triggered directly) — confirmed via a direct IndexedDB query that only that record's receipt was cascade-deleted, not the surviving record's.

Step 8 (dashboard, `/`) is done: a rewritten `src/views/Dashboard.vue` — cross-vehicle, newest-first list of all service records (`useServiceRecords().loadAll()`), with two client-side filters (`<select>`s bound to local refs, filtered/sorted in a computed — no new repository method) by vehicle and by service type, `'all'` as the default/reset option for both. Each row shows the vehicle name as a `RouterLink` to `/vehicles/:id` plus the same type/date/odometer/cost/notes formatting as `VehicleHistory`'s rows, but no edit/delete actions (out of scope for an overview) and no receipt-count badges (not in the spec's dashboard description; left out per scope discipline — flagged as a possible future addition, not built). No new files, composables, or dependencies — everything needed already existed from Steps 4–7. Note: `useServiceRecords()` has module-level shared scope (`loadAll()` vs `loadByVehicle()`); mounting this view flips that shared scope, same as `VehicleHistory` already does via `loadByVehicle()` — not a new risk, just the existing pattern applied a second place. Verified with `npm run build` + `vue-tsc -b` + `npm test`, and click-tested live through the real routes: added two vehicles and one record of each service type across them, confirmed the cross-vehicle list renders both sorted newest-first, confirmed the vehicle filter isolates one vehicle's record, confirmed the type filter isolates one service type, and confirmed clicking a vehicle name navigates to that vehicle's `/vehicles/:id` history.

Step 9 (polish + static build) is done: `src/style.css` now defines the five brand palette variables from this file's "Color palette" section (`--blue-slate`, `--pearl-beige`, `--golden-bronze`, `--floral-white`, `--deep-space-blue`) and remaps the existing semantic `--color-*` aliases onto them (`--color-bg`→floral-white, `--color-surface`→pearl-beige, `--color-text`→deep-space-blue, `--color-text-muted`→blue-slate, `--color-accent`→golden-bronze; `--color-border` is a derived beige, not one of the five named colors directly, since none of them read well as a border on the new background). Added global unscoped base styles for `button`/`input`/`select`/`textarea` (padding, border-radius, hover/focus-visible outline, a distinct `button[type='submit']` treatment) and a shared `.empty-state` class, so buttons/inputs across every view/component picked up consistent styling without per-file overrides. Empty states already existed in every view/component from earlier steps (`VehicleManagement`, `VehicleHistory`, `Dashboard`, `ReceiptPreviewModal`) — this step only added the `.empty-state` class to them and, for the two list views, a slightly more actionable message ("No vehicles yet. Add one to get started." / "No service records yet. Log the first one."). No new files, components, or dependencies. Verified with `npm run build` + `npm test` (both clean), then `vite build`'s `dist/` was served from a plain static server (`python3 -m http.server`, not `vite preview`) and checked via `curl`: `index.html` and its hashed JS/CSS assets all return 200, confirming the static bundle's asset paths resolve correctly outside Vite's own dev/preview server. Also confirmed a hard GET to a nested route (`/vehicles/abc123`) 404s on this bare server, as expected — `vue-router`'s `createWebHistory()` needs an SPA-fallback rewrite (index.html for all paths) from whatever host actually serves this in production; that's a hosting-config concern for later; it doesn't affect in-app client-side navigation, which vue-router already intercepts. Live-browser-verified in a follow-up pass once Claude-in-Chrome reconnected: loaded the static build at `/`, confirmed the new palette renders (cream background, beige nav/rows, golden-bronze accent on active nav link and the submit button, dashed `.empty-state` box), added a vehicle and a tire-rotation record through the real UI, did a full page reload of `/` against the static server, and confirmed both the vehicle and its record were still there — IndexedDB persistence survives a reload of the plain static bundle, independent of the dev server.

`vitest` was added as a devDependency (not in the original approved-dependency list, which covers runtime deps) — it's the test runner for pure-TS unit tests like the Step 2 schema tests; `npm test` runs it. `fake-indexeddb` was added as a devDependency for the same reason (test-only, not a runtime dep) — it shims IndexedDB so Dexie-backed repository tests can run under Vitest's Node environment without a real browser; wired in via `vitest.config.ts`'s `setupFiles: ['./src/test/setup.ts']` (`import 'fake-indexeddb/auto'`). `dexie` was installed as a runtime dependency (already on the approved list).

Commands:
- `npm run dev` — dev server
- `npm run build` — type-check (`vue-tsc -b`) + production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm test` — run unit tests (Vitest)
`vite` is on `^8` (rolldown-based bundler, the `create-vite` default). Node was upgraded to `v26.5.0` via nvm (pinned in `.nvmrc`, satisfies Vite's `^20.19.0 || >=22.12.0` requirement — no more `EBADENGINE` warning) and the project `.npmrc` sets `min-release-age=3` (looser than the machine's global `min-release-age=7`), which was needed the first time around: Vite 8's native rolldown binding for this platform (`@rolldown/binding-linux-x64-gnu`) is republished in lockstep with each rolldown release, so a fresh one is often only a few days old and can trip a strict release-age policy — that's what broke the initial install (see git history for the Vite 7 workaround this replaced).
The full spec is in `vehicle-maintenance-tracker-spec.md` — read it before starting any step. What follows is a condensed reference of the parts most load-bearing for implementation decisions.

## What this app is

DipStick: a local-first, single-user SPA for tracking DIY vehicle maintenance (oil changes, tire rotations, etc.), including photo/PDF receipts per service record. No auth, no reminders/due-dates, no sync — runs entirely against IndexedDB in the browser. Explicitly architected so a hosted backend can be swapped in later with **no UI changes**.

## Tech stack

- Vue 3, `<script setup>` / Composition API
- Vite (`vite build` → static files, deployable to a plain static host)
- TypeScript (non-negotiable — the `details` JSON blob needs real types)
- `vue-router`
- Dexie (IndexedDB) — string (`&id`) primary keys
- Zod — validates `details` at the repository boundary; types are derived via `z.infer`, not hand-written
- No server-state library (no TanStack) — data access goes through composables only
- IDs: `crypto.randomUUID()`, generated **inside the repository's `add()`**, never in the DB layer or the UI

## Propose before executing

For any task larger than a single file edit, **propose the plan first** and wait for approval. Specifically:

- List the files you intend to create or modify.
- Note any dependencies you'd add (see "Dependencies" below).
- Flag any place where the design is ambiguous or where you're guessing.

Then execute only after the plan is approved.

## Scope discipline

- One subsystem per session.
- Don't refactor adjacent code unless asked. If something nearby looks wrong, surface it as a note, don't fix it silently.
- Don't add features that aren't in the design. Feel free to propose them. Helpful suggestions go in chat, not in code.

## Dependencies

The package dependency surface strives for minimalism:

approved dependencies:
- vue 3
- vite
- zod
- dexie

disallowed dependencies:
- axios
- scheduling libraries (node-cron, etc.)
- nothing TanStack-related

- **Do not add other runtime dependencies without explicit approval.**

If a task seems to need a new dependency, propose it and explain why a hand-rolled version is insufficient.

## Testing Philosophy & Quality Standards
- **No Trivial Tests**: Never write tests for basic language features, pure getters/setters, or auto-generated code.
- **Test Intent, Not Implementation**: Focus on business/app logic, edge cases, and behavior rather than 100% line coverage.
- **Assert Real Outcomes**: Every test must have a meaningful assertion. Avoid empty tests or tests that only check if a method "was called" without verifying the result.
- **No Mocking Internal Logic**: Only mock external dependencies (APIs, databases). Do not mock the system under test or its internal helper methods.
- **Readable Assertions**: Use descriptive test names following the `Method_Scenario_ExpectedResult` pattern.

## Coding conventions

- **Vue 3 composition API** with `<script setup>`. No Options API.
- **Plain CSS with custom properties.** No CSS-in-JS. No Tailwind.

## MAINTENANCE WORKFLOW
- After completing a task or PR, review this CLAUDE.md file.
- If you notice repetitive mistakes, refactors, new dependencies or new architectural standards, update this file immediately to reflect them.
- Keep this file concise (under 300 lines) to avoid context bloat.

## Architecture (the constraint that matters most)

```
components / views (Vue)
        │  (never import Dexie)
        ▼
   composables  (useVehicles, useServiceRecords, useReceipts)
        │
        ▼
   repository interface  (async: getAll / get / add / update / delete)
        │
        ├── DexieServiceRepository   ← now
        └── HttpServiceRepository    ← later (deferred backend)
```

- **Repository pattern is the single most important constraint.** Components call composables; composables call a repository *interface*, never a concrete Dexie class. The concrete implementation is selected in one factory/DI entry point, so swapping Dexie → HTTP later is a one-line change.
- **Every repository method is async** (returns a `Promise`), even though Dexie is already async — this guarantees the future HTTP swap never changes a call signature.
- **Config over components**: new service types (e.g. "brake pad replacement") are added as a data/config object, not new components or schema migrations.
- **One source of truth per service type**: a Zod schema drives validation, the TS type (via `z.infer`), and dynamic form generation, all from the same object.

## Data model

- **Vehicle**: `id`, `name` (required, primary UI identifier), `make`, `model`, `year`, `vin`, `odometerUnit` (`'mi' | 'km'`, default `'mi'`). `currentOdometer` is **never stored** — it's derived on demand as `max(odometer)` across that vehicle's service records (used to pre-fill the odometer field on a new entry).
- **ServiceRecord**: `id`, `vehicleId` (FK), `type` (FK to a ServiceType key — discriminates `details`), `date`, `odometer`, `cost?`, `notes?` (freeform escape hatch), `details` (JSON, shape driven by `type`, validated by that type's Zod schema; `{}` allowed for types with no extra fields).
- **ServiceType**: not a DB row — a config-defined lookup (see below) used for filtering and form generation. No interval/reminder fields.
- **Receipt**: `id`, `serviceRecordId` (FK), `blob` (native `Blob`, **not base64**), `filename`, `mimeType`, `size`, `addedAt`. Stored in a **separate Dexie table**, never inlined on `ServiceRecord` — keeps list/dashboard reads lean since receipt bytes only load when a record is opened. Render via `URL.createObjectURL(blob)`; the composable that requests the URL owns revoking it. Soft ~5MB size guard (warn / optionally downscale images client-side) — no hard limit.
- **Cascade delete**: Dexie has no FK cascade. `ServiceRecordRepository.delete()` must **explicitly** delete the record's receipts (same transaction).

### Service type config shape

```ts
type InputType = 'text' | 'number' | 'select' | 'date'; // capped at these four

interface FieldConfig {
  key: string;
  label: string;
  input: InputType;
  unit?: string;
  options?: string[];       // for input: 'select'
  required?: boolean;
}

interface ServiceTypeConfig<T extends z.ZodTypeAny = z.ZodTypeAny> {
  key: string;               // e.g. 'oil_change' — stored in ServiceRecord.type
  label: string;
  detailsSchema: T;          // validates ServiceRecord.details
  fields: FieldConfig[];     // drives the dynamic form; empty = common fields only
}
```

The `details` discriminated union is *derived* from these configs via `z.infer` — never hand-write it. A `select` field's `'other'` option stores the literal string `'other'` (no freeform companion field); `notes` is where specifics go instead.

Seed types: `oil_change` (viscosity/type selects, quantity in qts, filter part number — all populated) and `tire_rotation` (`fields: []`, `detailsSchema: z.object({})` — the reference case proving the form renders correctly with common fields only).

## Repository interface (contract)

```ts
interface VehicleRepository {
  getAll(): Promise<Vehicle[]>;
  get(id: string): Promise<Vehicle | undefined>;
  add(input: NewVehicle): Promise<Vehicle>;      // generates UUID here
  update(id: string, patch: Partial<Vehicle>): Promise<Vehicle>;
  delete(id: string): Promise<void>;
}

interface ServiceRecordRepository {
  getAll(): Promise<ServiceRecord[]>;
  getByVehicle(vehicleId: string): Promise<ServiceRecord[]>;
  get(id: string): Promise<ServiceRecord | undefined>;
  add(input: NewServiceRecord): Promise<ServiceRecord>;   // generates UUID; validates details
  update(id: string, patch: Partial<ServiceRecord>): Promise<ServiceRecord>;
  delete(id: string): Promise<void>;   // MUST cascade-delete this record's receipts
}

interface ReceiptRepository {
  getByServiceRecord(serviceRecordId: string): Promise<Receipt[]>;
  add(file: File, serviceRecordId: string): Promise<Receipt>;  // generates UUID; captures filename/mime/size
  delete(id: string): Promise<void>;
  getObjectUrl(id: string): Promise<string>;   // createObjectURL; caller/composable owns revoke
}
```

`add`/`update` on service records must validate `details` against the matching service type's Zod schema **before** persisting — invalid data never enters the store.

## Routing

| Route | View | Purpose |
|---|---|---|
| `/` | Dashboard / list | overview; cross-vehicle record list, filters by vehicle/type |
| `/vehicles` | Vehicle management | vehicle CRUD |
| `/vehicles/:id` | Vehicle history | that vehicle's service records |

Add/edit a service record is a **modal/drawer, not a route** (keeps logging fast, preserves list scroll position). Add/edit a vehicle can be a modal within `/vehicles`.

## Color palette
```css
--blue-slate: #576068;
--pearl-beige: #e9deba;
--golden-bronze: #ce9e36;
--floral-white: #fbf8f0;
--deep-space-blue: #203045;
```

## Build order

The spec (§8) defines nine incremental, independently testable steps: scaffold → domain types + service-type config → repository interfaces + Dexie impl → composables → vehicle CRUD → config-driven `<ServiceRecordForm>` → receipts → vehicle history view → dashboard → polish/static build. Follow the current step in order rather than skipping ahead or combining steps, since later steps assume the repository/composable boundary from earlier ones is already in place.

## Deferred / explicitly out of scope

Do not build these unless the user asks — they are deliberately deferred in the spec:
- Reminders / due-date / overdue computation
- User accounts / auth
- Cross-device sync
- A hosted backend (`HttpServiceRepository` is a stub interface for later; no backend stack has been chosen — candidates are Hono+SQLite, Fastify+Postgres, or a BaaS like Supabase/PocketBase)
- Data export/import (optional future JSON export, not required for v1)