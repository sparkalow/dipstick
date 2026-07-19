<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useVehicles } from '../composables/useVehicles';
import { useServiceRecords } from '../composables/useServiceRecords';
import { useReceipts } from '../composables/useReceipts';
import ServiceRecordForm from '../components/ServiceRecordForm.vue';
import ReceiptPreviewModal from '../components/ReceiptPreviewModal.vue';
import { serviceTypes } from '../domain/serviceTypes';
import { getCurrentOdometer } from '../domain/vehicle';
import type { ServiceRecord } from '../domain/serviceRecord';

const route = useRoute();
const vehicleId = computed(() => route.params.id as string);

const { vehicles, loading: vehiclesLoading, refresh: refreshVehicles } = useVehicles();
const vehicle = computed(() => vehicles.value.find((v) => v.id === vehicleId.value));

const { records, loading: recordsLoading, error, loadByVehicle, remove } = useServiceRecords();
const { getCountsByServiceRecords } = useReceipts();

const sortedRecords = computed(() => [...records.value].sort((a, b) => b.date.localeCompare(a.date)));

const currentOdometer = computed(() => getCurrentOdometer(records.value, vehicleId.value));

const receiptCounts = ref<Record<string, number>>({});

async function refreshReceiptCounts() {
  receiptCounts.value = await getCountsByServiceRecords(records.value.map((r) => r.id));
}

// Receipts for a record are saved as a follow-up step after the record itself (see
// ServiceRecordForm), so they don't show up as a `records` change — recompute counts
// again once the form/preview modal closes, not just when the record list changes.
watch(records, refreshReceiptCounts, { immediate: true });

onMounted(refreshVehicles);
watch(vehicleId, (id) => loadByVehicle(id), { immediate: true });

const editingRecord = ref<ServiceRecord | null>(null);
const showForm = ref(false);
const previewRecordId = ref<string | null>(null);

function openAddForm() {
  editingRecord.value = null;
  showForm.value = true;
}

function openEditForm(record: ServiceRecord) {
  editingRecord.value = record;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingRecord.value = null;
  refreshReceiptCounts();
}

async function deleteRecord(record: ServiceRecord) {
  if (!window.confirm('Delete this service record? This cannot be undone.')) {
    return;
  }
  await remove(record.id).catch(() => {
    // error ref already holds the message; the banner below shows it.
  });
}

function openPreview(recordId: string) {
  previewRecordId.value = recordId;
}

function closePreview() {
  previewRecordId.value = null;
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ vehicle ? vehicle.name : 'Vehicle History' }}</h1>
      <button type="button" @click="openAddForm">Log service</button>
    </div>

    <p v-if="!vehicle && !vehiclesLoading" class="page-error">Vehicle not found.</p>

    <p v-if="error" class="page-error">{{ error }}</p>
    <p v-if="recordsLoading">Loading…</p>
    <p v-else-if="sortedRecords.length === 0" class="empty-state">No service records yet. Log the first one.</p>

    <ul v-else class="record-list">
      <li v-for="record in sortedRecords" :key="record.id" class="record-row">
        <div class="record-info">
          <strong>{{ serviceTypes[record.type].label }}</strong>
          <span class="record-meta">
            {{ record.date }} · {{ record.odometer.toLocaleString() }} {{ vehicle?.odometerUnit ?? 'mi' }}
            <template v-if="record.cost !== undefined"> · ${{ record.cost.toFixed(2) }}</template>
          </span>
          <span v-if="record.notes" class="record-notes">{{ record.notes }}</span>
          <button
            v-if="receiptCounts[record.id]"
            type="button"
            class="receipt-indicator"
            @click="openPreview(record.id)"
          >
            {{ receiptCounts[record.id] }} receipt{{ receiptCounts[record.id] > 1 ? 's' : '' }}
          </button>
        </div>
        <div class="record-actions">
          <button type="button" @click="openEditForm(record)">Edit</button>
          <button type="button" @click="deleteRecord(record)">Delete</button>
        </div>
      </li>
    </ul>

    <ServiceRecordForm
      v-if="showForm"
      :vehicle-id="vehicleId"
      :record="editingRecord"
      :current-odometer="currentOdometer"
      @close="closeForm"
    />

    <ReceiptPreviewModal
      v-if="previewRecordId"
      :service-record-id="previewRecordId"
      @close="closePreview"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.page-error {
  color: #b3261e;
}

.record-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.record-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--space-1);
  background: var(--color-surface);
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.record-meta {
  color: var(--color-text-muted);
}

.record-notes {
  color: var(--color-text-muted);
  font-style: italic;
}

.receipt-indicator {
  align-self: flex-start;
  font-size: 0.85rem;
}

.record-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
</style>
