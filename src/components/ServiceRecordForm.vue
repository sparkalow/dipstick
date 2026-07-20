<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useServiceRecords } from '../composables/useServiceRecords';
import { useReceipts } from '../composables/useReceipts';
import { useVehicles } from '../composables/useVehicles';
import { serviceTypes, type ServiceTypeKey } from '../domain/serviceTypes';
import type { NewServiceRecord, ServiceRecord } from '../domain/serviceRecord';

const props = defineProps<{
  // Fixed vehicle context (from a vehicle's history). When omitted (global "Log
  // Service"), the drawer shows a vehicle picker instead.
  vehicleId?: string;
  record?: ServiceRecord | null;
  // Pre-fills the odometer field when adding a new record; ignored when editing
  // (the record's own odometer wins).
  currentOdometer?: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { add, update, error } = useServiceRecords();
const { vehicles, refresh: refreshVehicles } = useVehicles();
const {
  receipts: existingReceipts,
  error: receiptsError,
  loadByServiceRecord,
  add: addReceipt,
  remove: removeReceipt,
  getObjectUrl,
} = useReceipts();

const serviceTypeKeys = Object.keys(serviceTypes) as ServiceTypeKey[];

// Vehicle: fixed when launched from a history page, chosen otherwise.
const fixedVehicle = computed(() => props.record?.vehicleId ?? props.vehicleId);
const selectedVehicleId = ref<string>(fixedVehicle.value ?? '');
const vehicleLocked = computed(() => fixedVehicle.value !== undefined);
const selectedVehicle = computed(() => vehicles.value.find((v) => v.id === selectedVehicleId.value));

const type = ref<ServiceTypeKey>(props.record?.type ?? serviceTypeKeys[0]);
const date = ref(props.record?.date ?? '');
const odometer = ref<number | undefined>(props.record?.odometer ?? props.currentOdometer);
const cost = ref<number | undefined>(props.record?.cost);
const notes = ref(props.record?.notes ?? '');

const detailsForm = reactive<Record<string, unknown>>(
  props.record ? { ...(props.record.details as Record<string, unknown>) } : {},
);

const currentConfig = computed(() => serviceTypes[type.value]);

// Details only make sense for the type they were entered under — switching types clears them.
watch(type, (newType, oldType) => {
  if (newType === oldType) return;
  for (const key of Object.keys(detailsForm)) delete detailsForm[key];
});

const validationError = ref<string | null>(null);
const saving = ref(false);

const RECEIPT_SIZE_WARNING_BYTES = 5 * 1024 * 1024;

interface PendingFile {
  file: File;
  previewUrl: string;
  oversized: boolean;
}

// Newly-selected files aren't persisted (and have no serviceRecordId to attach to,
// in add mode) until the record itself saves successfully.
const pendingFiles = ref<PendingFile[]>([]);
// Object URLs for already-saved receipts (edit mode), keyed by receipt id.
const existingPreviewUrls = reactive<Record<string, string>>({});

onMounted(() => {
  // Populate the picker when there's no fixed vehicle.
  if (!vehicleLocked.value && vehicles.value.length === 0) refreshVehicles();
  if (props.record) {
    loadByServiceRecord(props.record.id);
  }
});

watch(
  existingReceipts,
  async (list) => {
    for (const receipt of list) {
      if (!existingPreviewUrls[receipt.id]) {
        existingPreviewUrls[receipt.id] = await getObjectUrl(receipt.id);
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  for (const pending of pendingFiles.value) URL.revokeObjectURL(pending.previewUrl);
});

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  for (const file of files) {
    pendingFiles.value.push({
      file,
      previewUrl: URL.createObjectURL(file),
      oversized: file.size > RECEIPT_SIZE_WARNING_BYTES,
    });
  }
  input.value = '';
}

function removePendingFile(index: number) {
  URL.revokeObjectURL(pendingFiles.value[index].previewUrl);
  pendingFiles.value.splice(index, 1);
}

async function removeExistingReceipt(id: string) {
  await removeReceipt(id);
  delete existingPreviewUrls[id];
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileBadgeLabel(filename: string): string {
  const ext = filename.split('.').pop();
  return ext && ext !== filename ? ext.slice(0, 4).toUpperCase() : 'FILE';
}

function toNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}

function buildDetails(): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of currentConfig.value.fields) {
    const raw = detailsForm[field.key];
    result[field.key] = field.input === 'number' ? toNumberOrUndefined(raw) : raw === '' ? undefined : raw;
  }
  return result;
}

async function submit() {
  validationError.value = null;

  if (!selectedVehicleId.value) {
    validationError.value = 'Vehicle is required.';
    return;
  }

  if (!date.value) {
    validationError.value = 'Date is required.';
    return;
  }

  const odometerValue = toNumberOrUndefined(odometer.value);
  if (odometerValue === undefined) {
    validationError.value = 'Odometer is required.';
    return;
  }

  const parsed = currentConfig.value.detailsSchema.safeParse(buildDetails());
  if (!parsed.success) {
    validationError.value = parsed.error.issues
      .map((issue) => {
        const field = currentConfig.value.fields.find((f) => f.key === issue.path[0]);
        return `${field?.label ?? issue.path.join('.')}: ${issue.message}`;
      })
      .join(' ');
    return;
  }

  const input = {
    vehicleId: selectedVehicleId.value,
    date: date.value,
    odometer: odometerValue,
    cost: toNumberOrUndefined(cost.value),
    notes: notes.value.trim() || undefined,
    type: type.value,
    details: parsed.data,
  } as NewServiceRecord;

  saving.value = true;
  try {
    const saved = props.record ? await update(props.record.id, input) : await add(input);
    for (const pending of pendingFiles.value) {
      await addReceipt(pending.file, saved.id);
    }
    emit('close');
  } catch {
    // error/receiptsError refs already hold the message; keep the drawer open so the user can retry.
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="drawer-overlay" @click.self="emit('close')">
    <div class="drawer" role="dialog" aria-modal="true">
      <div class="drawer-head">
        <h2>{{ record ? 'Edit Service' : 'Log Service' }}</h2>
        <button type="button" class="btn--ghost close-btn" aria-label="Close" @click="emit('close')">&times;</button>
      </div>

      <form class="drawer-form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">Vehicle</span>
          <div v-if="vehicleLocked" class="field-static">{{ selectedVehicle?.name ?? '—' }}</div>
          <select v-else v-model="selectedVehicleId" required>
            <option value="" disabled>Select a vehicle…</option>
            <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.name }}</option>
          </select>
        </label>

        <div class="field">
          <span class="field-label">Service type</span>
          <div class="type-toggle">
            <button
              v-for="key in serviceTypeKeys"
              :key="key"
              type="button"
              class="type-option"
              :class="{ 'type-option--active': type === key }"
              @click="type = key"
            >
              {{ serviceTypes[key].label }}
            </button>
          </div>
        </div>

        <div class="field-row">
          <label class="field">
            <span class="field-label">Date *</span>
            <input v-model="date" type="date" required />
          </label>
          <label class="field">
            <span class="field-label">Odometer *</span>
            <input v-model.number="odometer" type="number" placeholder="0" required />
          </label>
        </div>

        <label class="field">
          <span class="field-label">Cost</span>
          <input v-model.number="cost" type="number" step="0.01" placeholder="0.00" />
        </label>

        <div v-if="currentConfig.fields.length > 0" class="details-panel">
          <label v-for="field in currentConfig.fields" :key="field.key" class="field">
            <span class="field-label">
              {{ field.label }}{{ field.unit ? ` (${field.unit})` : '' }}{{ field.required ? ' *' : '' }}
            </span>
            <select v-if="field.input === 'select'" v-model="detailsForm[field.key]" :required="field.required">
              <option value="" disabled>Select…</option>
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input
              v-else-if="field.input === 'number'"
              v-model.number="detailsForm[field.key]"
              type="number"
              :required="field.required"
            />
            <input
              v-else-if="field.input === 'date'"
              v-model="detailsForm[field.key]"
              type="date"
              :required="field.required"
            />
            <input v-else v-model="detailsForm[field.key]" type="text" :required="field.required" />
          </label>
        </div>

        <label class="field">
          <span class="field-label">Notes</span>
          <textarea v-model="notes" rows="3" placeholder="Anything else worth remembering…"></textarea>
        </label>

        <div class="field">
          <span class="field-label">Receipts</span>

          <ul v-if="existingReceipts.length > 0" class="receipt-list">
            <li v-for="receipt in existingReceipts" :key="receipt.id" class="receipt-item">
              <img
                v-if="receipt.mimeType.startsWith('image/') && existingPreviewUrls[receipt.id]"
                :src="existingPreviewUrls[receipt.id]"
                class="receipt-thumb"
                :alt="receipt.filename"
              />
              <span v-else class="receipt-badge">{{ fileBadgeLabel(receipt.filename) }}</span>
              <span class="receipt-filename">{{ receipt.filename }}</span>
              <button type="button" class="btn--ghost btn--sm" @click="removeExistingReceipt(receipt.id)">Remove</button>
            </li>
          </ul>

          <ul v-if="pendingFiles.length > 0" class="receipt-list">
            <li v-for="(pending, index) in pendingFiles" :key="pending.previewUrl" class="receipt-item">
              <img
                v-if="pending.file.type.startsWith('image/')"
                :src="pending.previewUrl"
                class="receipt-thumb"
                :alt="pending.file.name"
              />
              <span v-else class="receipt-badge">{{ fileBadgeLabel(pending.file.name) }}</span>
              <span class="receipt-filename">
                {{ pending.file.name }}
                <span v-if="pending.oversized" class="receipt-warning">
                  ({{ formatSize(pending.file.size) }} — large file)
                </span>
              </span>
              <button type="button" class="btn--ghost btn--sm" @click="removePendingFile(index)">Remove</button>
            </li>
          </ul>

          <label class="dropzone">
            <span>Drop receipt photos or PDFs here, or click to browse</span>
            <input type="file" accept="image/*,application/pdf" multiple @change="onFilesSelected" />
          </label>
        </div>

        <p v-if="validationError" class="form-error">{{ validationError }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="receiptsError" class="form-error">{{ receiptsError }}</p>

        <div class="drawer-actions">
          <button type="button" class="btn--secondary drawer-btn" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn--primary drawer-btn" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save record' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgb(32 48 69 / 55%);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: 460px;
  max-width: 100%;
  height: 100%;
  background: var(--color-bg);
  box-shadow: var(--shadow-drawer);
  padding: var(--space-5);
  overflow-y: auto;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.drawer-head h2 {
  font-weight: 700;
  font-size: 1.5rem;
}

.close-btn {
  font-size: 1.5rem;
  padding: 0 var(--space-2);
  line-height: 1;
}

.drawer-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0; /* allow shrinking inside flex rows / grid tracks */
}

.field input,
.field select,
.field textarea {
  width: 100%;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-head);
}

.field-static {
  font-size: 0.9375rem;
  color: var(--color-head);
  background: var(--color-card);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.625rem 0.75rem;
}

.field-row {
  display: flex;
  gap: var(--space-3);
}

.field-row .field {
  flex: 1;
}

.type-toggle {
  display: flex;
  gap: var(--space-2);
}

.type-option {
  flex: 1;
  background: var(--color-card);
  color: var(--color-head);
  border: 1.5px solid var(--color-border);
}

.type-option--active {
  background: var(--color-nav);
  color: var(--color-on-nav);
  border-color: var(--color-nav);
}

.details-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.details-panel .field input,
.details-panel .field select {
  background: var(--color-input-bg-alt);
}

.form-error {
  color: var(--color-danger);
  margin: 0;
  font-size: 0.875rem;
}

.receipt-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.receipt-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.receipt-thumb {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.receipt-badge {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.65rem;
  text-align: center;
  overflow: hidden;
  padding: var(--space-1);
}

.receipt-filename {
  flex: 1;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.receipt-warning {
  color: var(--color-body);
}

.dropzone {
  display: block;
  border: 1.5px dashed var(--color-accent);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
  color: var(--color-body);
  font-size: 0.8125rem;
  background: var(--color-card);
  cursor: pointer;
}

.dropzone input[type='file'] {
  display: block;
  margin: var(--space-2) auto 0;
  font-size: 0.75rem;
}

.drawer-actions {
  display: flex;
  gap: var(--space-3);
}

.drawer-btn {
  flex: 1;
  padding: 0.75rem;
}
</style>
