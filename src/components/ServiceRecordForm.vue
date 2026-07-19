<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useServiceRecords } from '../composables/useServiceRecords';
import { useReceipts } from '../composables/useReceipts';
import { serviceTypes, type ServiceTypeKey } from '../domain/serviceTypes';
import type { NewServiceRecord, ServiceRecord } from '../domain/serviceRecord';

const props = defineProps<{
  vehicleId: string;
  record?: ServiceRecord | null;
  // Pre-fills the odometer field when adding a new record; ignored when editing
  // (the record's own odometer wins).
  currentOdometer?: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { add, update, error } = useServiceRecords();
const {
  receipts: existingReceipts,
  error: receiptsError,
  loadByServiceRecord,
  add: addReceipt,
  remove: removeReceipt,
  getObjectUrl,
} = useReceipts();

const serviceTypeKeys = Object.keys(serviceTypes) as ServiceTypeKey[];

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
    vehicleId: props.vehicleId,
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
    // error/receiptsError refs already hold the message; keep the modal open so the user can retry.
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <h2>{{ record ? 'Edit service record' : 'Add service record' }}</h2>

      <form @submit.prevent="submit">
        <label class="field">
          <span>Service Type *</span>
          <select v-model="type" required>
            <option v-for="key in serviceTypeKeys" :key="key" :value="key">
              {{ serviceTypes[key].label }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>Date *</span>
          <input v-model="date" type="date" required />
        </label>

        <label class="field">
          <span>Odometer *</span>
          <input v-model.number="odometer" type="number" required />
        </label>

        <label class="field">
          <span>Cost</span>
          <input v-model.number="cost" type="number" step="0.01" />
        </label>

        <label class="field">
          <span>Notes</span>
          <textarea v-model="notes" rows="3"></textarea>
        </label>

        <template v-for="field in currentConfig.fields" :key="field.key">
          <label class="field">
            <span>{{ field.label }}{{ field.unit ? ` (${field.unit})` : '' }}{{ field.required ? ' *' : '' }}</span>
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
        </template>

        <div class="field">
          <span>Receipts</span>

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
              <button type="button" @click="removeExistingReceipt(receipt.id)">Remove</button>
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
              <button type="button" @click="removePendingFile(index)">Remove</button>
            </li>
          </ul>

          <input type="file" accept="image/*,application/pdf" multiple @change="onFilesSelected" />
        </div>

        <p v-if="validationError" class="form-error">{{ validationError }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="receiptsError" class="form-error">{{ receiptsError }}</p>

        <div class="modal-actions">
          <button type="button" @click="emit('close')">Cancel</button>
          <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 40%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal {
  background: var(--color-bg);
  border-radius: var(--space-2);
  padding: var(--space-4);
  width: min(28rem, 100%);
  max-height: 90vh;
  overflow-y: auto;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.field input,
.field select,
.field textarea {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--space-1);
  font-family: inherit;
  font-size: 1rem;
}

.form-error {
  color: #b3261e;
  margin-bottom: var(--space-3);
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
  border-radius: var(--space-1);
  border: 1px solid var(--color-border);
}

.receipt-badge {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--space-1);
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
  color: var(--color-text-muted);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
