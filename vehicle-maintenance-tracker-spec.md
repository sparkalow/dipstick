# DipStick a Vehicle Maintenance Tracker — Implementation Spec

A local-first single-page app for tracking DIY vehicle maintenance (oil changes, tire rotations, etc.). Single user, no authentication. Runs locally against IndexedDB now; architected so a hosted backend can be added later with no UI changes.

---

## 1. Scope & Principles

**In scope**
- Track multiple vehicles.
- Log heterogeneous maintenance events per vehicle.
- Attach purchase receipts (photos / PDFs, multiple) to each service record.
- View per-vehicle service history.
- Runs entirely in the browser; data persists in IndexedDB.

**Explicitly out of scope (for now)**
- Reminders / due-date / overdue computation.
- User accounts / auth.
- Cross-device sync.
- A backend (deferred — see §9).

**Guiding principles**
- **Repository pattern**: all data access sits behind an async interface. Components never touch Dexie directly. This is the single most important constraint — it's what makes the future backend swap cheap.
- **Config over components**: new service types are added as data/config, not new components or schema migrations.
- **One source of truth per service type**: a Zod schema drives validation, TypeScript types (`z.infer`), and form generation.
- **Lean**: don't build infrastructure for problems that don't exist yet. Static-host now; add a backend only when per-browser data actually becomes a limitation.

---

## 2. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Vue 3 (`<script setup>`, Composition API) | |
| Build | Vite | `vite build` → static files |
| Language | TypeScript | Non-negotiable given the JSON `details` blob |
| Routing | `vue-router` | See §6 |
| Persistence | IndexedDB via **Dexie** | String (`&id`) primary keys |
| Validation | **Zod** | Validates `details` at the repository boundary |
| Server state lib | **None** | No TanStack. Data access via composables. |
| IDs | `crypto.randomUUID()` | Generated in the repository, not the DB |

---

## 3. Architecture Overview

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

- Components call composables.
- Composables call a repository **interface** (not a concrete class).
- The concrete repository is chosen in one place (a factory / DI entry point) so swapping Dexie → HTTP is a one-line change.
- **All repository methods are async (return Promises)** even though Dexie is already async — so the HTTP swap never changes a signature.

---

## 4. Data Model

### Vehicle
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | yes | generated in `add()` |
| `name` | string | **yes** | primary identifier in the UI ("Truck", "Wife's Camry") |
| `make` | string | no | |
| `model` | string | no | |
| `year` | number | no | |
| `vin` | string | no | |
| `odometerUnit` | `'mi' \| 'km'` | yes | default `'mi'` |

- **`currentOdometer` is NOT stored.** It is derived on demand as `max(odometer)` across that vehicle's service records (0 / null if none). Used to pre-fill the odometer field when logging a new service.

### ServiceRecord
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | yes | generated in `add()` |
| `vehicleId` | string (UUID) | yes | FK → Vehicle |
| `type` | string | yes | FK → ServiceType key (discriminator for `details`) |
| `date` | string (ISO date) | yes | |
| `odometer` | number | yes | |
| `cost` | number | no | |
| `notes` | string | no | freeform; also the escape hatch for anything not captured in `details` |
| `details` | JSON object | yes | shape determined by `type`; validated by that type's Zod schema. May be `{}` for types with no extra fields. |

### ServiceType
A lookup used for categorizing/filtering and for driving the form. Each type is defined in config (§5), not a DB row you edit at runtime (though it may be seeded into a table if convenient). No interval fields — reminders are out of scope.

### Receipt
Purchase receipts (photos / PDFs) for expenses on a service record. **Multiple per record.** Stored as native `Blob`s in a **separate** Dexie table keyed by `serviceRecordId` — never inline on the `ServiceRecord`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | yes | generated in `add()` |
| `serviceRecordId` | string (UUID) | yes | FK → ServiceRecord |
| `blob` | `Blob` | yes | the file itself (image or PDF) — stored natively, not base64 |
| `filename` | string | yes | original filename |
| `mimeType` | string | yes | `image/*` or `application/pdf` |
| `size` | number | yes | bytes |
| `addedAt` | string (ISO) | yes | |

**Design rationale (why Blob + separate table):**
- **Native `Blob`, not base64.** IndexedDB stores `Blob`/`File` natively; Dexie persists them with no encoding step. Base64 would inflate size ~33%, force encode/decode on every read, and bloat record queries with binary you rarely need. Render via `URL.createObjectURL(blob)` and revoke the object URL when done.
- **Separate table, not inline on `ServiceRecord`.** Keeps list/history/dashboard reads lean — receipt bytes load lazily only when a record is opened, not on every `getByVehicle()`.
- **Forward-compatible with a hosted backend.** Blobs don't belong in a JSON API; server-side they move to object storage (S3/R2) with the record holding a `storageUrl`. A standalone `Receipt` entity maps cleanly: locally the payload is a `Blob`, server-side it's a `storageUrl`, and the `ReceiptRepository` interface hides the difference — exactly the same benefit the other repositories give.

**Cascade delete:** Dexie has no FK cascade. Deleting a `ServiceRecord` must **explicitly** delete its receipts in the repository (see §7).

**Soft file-size guard:** warn (and optionally client-side downscale images) above a threshold (~5MB) to keep IndexedDB from ballooning. **No hard limit** — the guard is advisory only.

---

## 5. Service Type Config (the heart of the app)

Each service type is a single config object pairing a **Zod schema** with **field metadata**. The form renderer and validator both consume it.

```ts
type InputType = 'text' | 'number' | 'select' | 'date'; // capped at these four

interface FieldConfig {
  key: string;
  label: string;
  input: InputType;
  unit?: string;                 // e.g. 'qts'
  options?: string[];            // for input: 'select'
  required?: boolean;
}

interface ServiceTypeConfig<T extends z.ZodTypeAny = z.ZodTypeAny> {
  key: string;                   // e.g. 'oil_change' — stored in ServiceRecord.type
  label: string;                 // e.g. 'Oil Change'
  detailsSchema: T;              // validates ServiceRecord.details
  fields: FieldConfig[];         // drives the dynamic form (empty array = common fields only)
}
```

- The discriminated union for `details` is **derived** from these schemas via `z.infer`.
- Adding a new service type = one config object. No new component, no migration.
- A `select` with an `'other'` option stores the literal string `'other'` (no freeform companion). The common `notes` field captures specifics when needed.

### Seed type 1 — Oil Change (`oil_change`)
Populated `details`:
| Field | input | options / notes |
|---|---|---|
| oil viscosity | select | `0W-20`, `5W-20`, `5W-30`, `10W-30`, `other` |
| oil type | select | `conventional`, `synthetic blend`, `full synthetic`, `other` |
| quantity (qts) | number | unit: `qts` |
| oil filter part number | text | |

### Seed type 2 — Tire Rotation (`tire_rotation`)
- **No `details` fields.** `fields: []`, `detailsSchema: z.object({})`.
- Serves as the reference case proving the form renders correctly with common fields only and an empty details object.

---

## 6. Routing

| Route | View | Purpose |
|---|---|---|
| `/` | Dashboard / list | overview; list of records, vehicle selector |
| `/vehicles` | Vehicle management | vehicle CRUD |
| `/vehicles/:id` | Vehicle history | that vehicle's service records |

- **Add/edit a service record** is a **modal / drawer**, not a route — keeps logging fast and preserves list position.
- Add/edit a vehicle can be a modal within `/vehicles`.

---

## 7. Repository Interface (contract)

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

- `add`/`update` on service records **validate `details`** against the matching service type's Zod schema before persisting. Invalid data never enters the store.
- `crypto.randomUUID()` is called inside `add()`.
- `ServiceRecordRepository.delete()` **must explicitly delete the record's receipts** (no Dexie FK cascade). Do it in one transaction.
- `getObjectUrl()` returns a `URL.createObjectURL()` handle; the **composable** owns the revoke lifecycle (revoke on unmount / when the preview closes) to avoid leaking object URLs.

---

## 8. Build Order

Each step is independently testable and builds on the last.

1. **Project scaffold** — Vite + Vue + TS, `vue-router` with the three routes as stubs, ESLint/Prettier. App runs with empty pages.
2. **Domain types + service-type config** — `Vehicle`, `ServiceRecord` types; the `ServiceTypeConfig` shape; the two seed configs (oil change, tire rotation); the derived `details` union. Pure TS, unit-testable, no UI.
3. **Repository interface + Dexie implementation** — define interfaces (§7); implement `DexieServiceRepository` / `DexieVehicleRepository`; UUID generation; Zod validation of `details` in `add`/`update`. Test directly against a fake/in-memory Dexie.
4. **Composables** — `useVehicles()`, `useServiceRecords()` wrapping the repositories with Vue reactivity. Components will only ever import these.
5. **Vehicle CRUD (`/vehicles`)** — list, add/edit modal, delete. First real UI; exercises the vehicle repository end to end.
6. **Config-driven `<ServiceRecordForm>`** — renders common fields + dynamic `details` fields from a service type config. Handles the empty-details case (tire rotation). Client-side validation mirrors the Zod schema.
   6.5. **Receipts** — `Receipt` Dexie table + `ReceiptRepository` (Blob storage, UUID, object-URL helper, cascade-delete wired into `ServiceRecordRepository.delete`). Add a `useReceipts()` composable owning the object-URL revoke lifecycle. Extend `<ServiceRecordForm>` with a multi-file input (`image/*,application/pdf`), thumbnail previews, per-file remove, and the soft ~5MB size guard (warn; optional image downscale).
7. **Vehicle history (`/vehicles/:id`)** — list a vehicle's records; open the form modal to add/edit; derive `currentOdometer` to pre-fill odometer.
8. **Dashboard (`/`)** — cross-vehicle list/overview, filtering by vehicle and/or service type.
9. **Polish & static build** — empty states, basic styling, `vite build`, verify the static bundle runs from a plain file host.

---

## 9. Deferred / Open Decisions

- **Backend stack** — not chosen. When cross-device data becomes a real limitation, implement `HttpServiceRepository` against the interface in §7 and mirror the Zod schemas server-side. Candidate stacks to evaluate *at that time*: Hono + SQLite, Fastify + Postgres, or a BaaS (Supabase / PocketBase). No decision needed now; nothing in this spec forecloses any of them.
- **Data export/import** — not specified. Consider a JSON export as a low-effort backup/migration aid before the backend exists (optional, not required for v1).

---
