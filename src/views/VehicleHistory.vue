<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
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

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const typeFilter = ref('all');

const filterChips = computed(() => [
  { key: 'all', label: 'All' },
  ...Object.values(serviceTypes).map((c) => ({ key: c.key, label: c.label })),
]);

const sortedRecords = computed(() =>
  [...records.value]
    .filter((r) => typeFilter.value === 'all' || r.type === typeFilter.value)
    .sort((a, b) => b.date.localeCompare(a.date)),
);

const currentOdometer = computed(() => getCurrentOdometer(records.value, vehicleId.value));

const vehicleSubtitle = computed(() =>
  vehicle.value ? [vehicle.value.year, vehicle.value.make, vehicle.value.model].filter(Boolean).join(' ') : '',
);

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

function badgeClass(type: string): string {
  return serviceTypes[type as keyof typeof serviceTypes]?.accentBadge ? 'badge badge--accent' : 'badge';
}

function costLabel(cost: number | undefined): string {
  return cost === undefined ? '—' : currencyFmt.format(cost);
}
</script>

<template>
  <div>
    <RouterLink to="/" class="back-link">&larr; Back to Garage</RouterLink>

    <p v-if="!vehicle && !vehiclesLoading" class="page-error">Vehicle not found.</p>

    <header v-if="vehicle" class="hero">
      <div>
        <div class="hero-name">{{ vehicle.name }}</div>
        <div v-if="vehicleSubtitle" class="hero-sub">{{ vehicleSubtitle }}</div>
      </div>
      <div class="hero-odo">
        <div class="hero-odo-label">Current odometer</div>
        <div class="hero-odo-value mono">
          {{ currentOdometer === undefined ? '—' : `${currentOdometer.toLocaleString()} ${vehicle.odometerUnit}` }}
        </div>
      </div>
    </header>

    <div class="toolbar">
      <div class="chip-filters">
        <button
          v-for="chip in filterChips"
          :key="chip.key"
          type="button"
          class="filter-chip"
          :class="{ 'filter-chip--active': typeFilter === chip.key }"
          @click="typeFilter = chip.key"
        >
          {{ chip.label }}
        </button>
      </div>
      <div class="toolbar-actions">
        <RouterLink :to="`/vehicles/${vehicleId}/report`" class="btn btn--secondary btn--sm report-link">
          Report
        </RouterLink>
        <button type="button" class="btn--primary btn--sm" @click="openAddForm">+ Log service</button>
      </div>
    </div>

    <p v-if="error" class="page-error">{{ error }}</p>
    <p v-if="recordsLoading" class="muted">Loading…</p>
    <p v-else-if="sortedRecords.length === 0" class="empty-state">No service records yet. Log the first one.</p>

    <ul v-else class="record-list">
      <li v-for="record in sortedRecords" :key="record.id" class="record-row card">
        <div class="record-top">
          <div class="record-title">
            <span :class="badgeClass(record.type)">{{ serviceTypes[record.type].label }}</span>
            <span class="record-date">{{ record.date }}</span>
          </div>
          <span class="record-cost mono">{{ costLabel(record.cost) }}</span>
        </div>
        <div class="record-odo mono">{{ record.odometer.toLocaleString() }} {{ vehicle?.odometerUnit ?? 'mi' }}</div>
        <p v-if="record.notes" class="record-notes">{{ record.notes }}</p>
        <div class="record-foot">
          <button
            v-if="receiptCounts[record.id]"
            type="button"
            class="btn--ghost btn--sm"
            @click="openPreview(record.id)"
          >
            📎 {{ receiptCounts[record.id] }} receipt{{ receiptCounts[record.id] > 1 ? 's' : '' }}
          </button>
          <span class="record-foot-spacer"></span>
          <button type="button" class="btn--secondary btn--sm" @click="openEditForm(record)">Edit</button>
          <button type="button" class="btn--danger btn--sm" @click="deleteRecord(record)">Delete</button>
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

    <ReceiptPreviewModal v-if="previewRecordId" :service-record-id="previewRecordId" @close="closePreview" />
  </div>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
  color: var(--color-body);
  text-decoration: none;
  font-size: 0.875rem;
}

.back-link:hover {
  color: var(--color-head);
}

.page-error {
  color: var(--color-danger);
}

.muted {
  color: var(--color-body);
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  background: var(--color-nav);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.hero-name {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 1.875rem;
  color: var(--color-on-nav);
}

.hero-sub {
  font-size: 0.875rem;
  color: var(--color-nav-muted);
  margin-top: var(--space-1);
}

.hero-odo {
  text-align: right;
}

.hero-odo-label {
  font-size: 0.75rem;
  color: var(--color-nav-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero-odo-value {
  font-weight: 600;
  font-size: 1.75rem;
  color: var(--color-accent);
  margin-top: var(--space-1);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.chip-filters {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: var(--space-2);
}

.report-link {
  text-decoration: none;
}

.filter-chip {
  font-size: 0.8125rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-pill);
  background: transparent;
  border: 1.5px solid var(--color-border);
  color: var(--color-body);
}

.filter-chip--active {
  background: var(--color-nav);
  border-color: var(--color-nav);
  color: var(--color-on-nav);
}

.record-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.record-row {
  padding: var(--space-4) 1.375rem;
}

.record-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.record-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.record-date {
  font-size: 0.8125rem;
  color: var(--color-body);
}

.record-cost {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-head);
}

.record-odo {
  font-size: 0.8125rem;
  color: var(--color-body);
  margin-bottom: var(--space-2);
}

.record-notes {
  margin: 0 0 var(--space-3);
  font-size: 0.875rem;
  color: var(--color-body);
}

.record-foot {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.record-foot-spacer {
  flex: 1;
}
</style>
