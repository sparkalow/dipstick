## Project status

This repository currently contains only the implementation spec (`vehicle-maintenance-tracker-spec.md`) — no code has been scaffolded yet. There is no `package.json`, no build tooling, and no source tree. Until Step 1 of the build order below has been run, there are no build/lint/test commands to document. When scaffolding is done, update this file with the actual commands (`npm run dev`, `npm run build`, `npm run lint`, `npm run test -- <path>`, etc.) rather than assuming Vite/ESLint/Prettier defaults.

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


## Coding conventions

- **Vue 3 composition API** with `<script setup>`. No Options API.
- **Plain CSS with custom properties.** No CSS-in-JS. No Tailwind.

## MAINTENANCE WORKFLOW
- After completing a task or PR, review this CLAUDE.md file.
- If you notice repetitive mistakes, refactors, new dependencies or new architectural standards, update this file immediately to reflect them.
- Keep this file concise (under 200 lines) to avoid context bloat.

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

## Build order

The spec (§8) defines nine incremental, independently testable steps: scaffold → domain types + service-type config → repository interfaces + Dexie impl → composables → vehicle CRUD → config-driven `<ServiceRecordForm>` → receipts → vehicle history view → dashboard → polish/static build. Follow the current step in order rather than skipping ahead or combining steps, since later steps assume the repository/composable boundary from earlier ones is already in place.

## Deferred / explicitly out of scope

Do not build these unless the user asks — they are deliberately deferred in the spec:
- Reminders / due-date / overdue computation
- User accounts / auth
- Cross-device sync
- A hosted backend (`HttpServiceRepository` is a stub interface for later; no backend stack has been chosen — candidates are Hono+SQLite, Fastify+Postgres, or a BaaS like Supabase/PocketBase)
- Data export/import (optional future JSON export, not required for v1)