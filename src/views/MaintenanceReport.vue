<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useVehicles } from '../composables/useVehicles';
import { useServiceRecords } from '../composables/useServiceRecords';
import { useReceipts } from '../composables/useReceipts';
import { serviceTypes } from '../domain/serviceTypes';
import { getCurrentOdometer } from '../domain/vehicle';
import type { ServiceRecord } from '../domain/serviceRecord';
import type { Receipt } from '../domain/receipt';

const route = useRoute();
const vehicleId = computed(() => route.params.id as string);

const { vehicles, loading: vehiclesLoading, refresh: refreshVehicles } = useVehicles();
const vehicle = computed(() => vehicles.value.find((v) => v.id === vehicleId.value));

const { records, loading: recordsLoading, loadByVehicle } = useServiceRecords();
const { getReceiptsByServiceRecords, getObjectUrl } = useReceipts();

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Receipts grouped by record id, and a live object-URL per image receipt (URLs are
// owned by useReceipts and revoked when this component unmounts).
const receiptsByRecord = ref<Record<string, Receipt[]>>({});
const objectUrls = reactive<Record<string, string>>({});

// A maintenance history reads chronologically (oldest → newest) for warranty review.
const sortedRecords = computed(() => [...records.value].sort((a, b) => a.date.localeCompare(b.date)));

const currentOdometer = computed(() => getCurrentOdometer(records.value, vehicleId.value));

const hasCosts = computed(() => records.value.some((r) => r.cost !== undefined));
const totalCost = computed(() => records.value.reduce((sum, r) => sum + (r.cost ?? 0), 0));

const dateRange = computed(() => {
  if (sortedRecords.value.length === 0) return '';
  const first = sortedRecords.value[0].date;
  const last = sortedRecords.value[sortedRecords.value.length - 1].date;
  return first === last ? first : `${first} – ${last}`;
});

const generatedOn = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const vehicleSubtitle = computed(() =>
  vehicle.value ? [vehicle.value.year, vehicle.value.make, vehicle.value.model].filter(Boolean).join(' ') : '',
);

async function loadReceipts() {
  const grouped = await getReceiptsByServiceRecords(records.value.map((r) => r.id));
  receiptsByRecord.value = grouped;
  for (const list of Object.values(grouped)) {
    for (const receipt of list) {
      if (receipt.mimeType.startsWith('image/') && !objectUrls[receipt.id]) {
        objectUrls[receipt.id] = await getObjectUrl(receipt.id);
      }
    }
  }
}

watch(records, loadReceipts, { immediate: true });
onMounted(refreshVehicles);
watch(vehicleId, (id) => loadByVehicle(id), { immediate: true });

interface DetailEntry {
  label: string;
  value: string;
}

function detailEntries(record: ServiceRecord): DetailEntry[] {
  return serviceTypes[record.type].fields
    .map((f) => ({
      label: f.label,
      value: formatValue((record.details as Record<string, unknown>)[f.key], f.unit),
    }))
    .filter((e) => e.value !== '');
}

function formatValue(raw: unknown, unit?: string): string {
  if (raw === undefined || raw === null || raw === '') return '';
  const text = typeof raw === 'number' ? raw.toLocaleString() : String(raw);
  return unit ? `${text} ${unit}` : text;
}

function costLabel(cost: number | undefined): string {
  return cost === undefined ? '—' : currencyFmt.format(cost);
}

function badgeClass(type: string): string {
  return serviceTypes[type as keyof typeof serviceTypes]?.accentBadge ? 'badge badge--accent' : 'badge';
}

function print() {
  window.print();
}
</script>

<template>
  <div>
    <RouterLink :to="`/vehicles/${vehicleId}`" class="back-link no-print">&larr; Back to history</RouterLink>

    <p v-if="!vehicle && !vehiclesLoading" class="page-error">Vehicle not found.</p>

    <template v-else-if="vehicle">
      <div class="report-actions no-print">
        <button type="button" class="btn--primary btn--sm" @click="print">🖨 Print / Save as PDF</button>
      </div>

      <article class="report">
        <header class="report-head">
          <div>
            <h1 class="report-title">Vehicle Maintenance Report</h1>
            <p class="report-generated">Generated {{ generatedOn }}</p>
          </div>
          <div class="report-vehicle">
            <div class="report-vehicle-name">{{ vehicle.name }}</div>
            <div v-if="vehicleSubtitle" class="report-vehicle-sub">{{ vehicleSubtitle }}</div>
          </div>
        </header>

        <dl class="identity">
          <div v-if="vehicle.make" class="identity-item">
            <dt>Make</dt>
            <dd>{{ vehicle.make }}</dd>
          </div>
          <div v-if="vehicle.model" class="identity-item">
            <dt>Model</dt>
            <dd>{{ vehicle.model }}</dd>
          </div>
          <div v-if="vehicle.year" class="identity-item">
            <dt>Year</dt>
            <dd class="mono">{{ vehicle.year }}</dd>
          </div>
          <div v-if="vehicle.vin" class="identity-item">
            <dt>VIN</dt>
            <dd class="mono">{{ vehicle.vin }}</dd>
          </div>
          <div class="identity-item">
            <dt>Current odometer</dt>
            <dd class="mono">
              {{ currentOdometer === undefined ? '—' : `${currentOdometer.toLocaleString()} ${vehicle.odometerUnit}` }}
            </dd>
          </div>
          <div class="identity-item">
            <dt>Records</dt>
            <dd class="mono">{{ records.length }}</dd>
          </div>
          <div v-if="dateRange" class="identity-item">
            <dt>Service period</dt>
            <dd class="mono">{{ dateRange }}</dd>
          </div>
          <div v-if="hasCosts" class="identity-item">
            <dt>Total cost</dt>
            <dd class="mono">{{ currencyFmt.format(totalCost) }}</dd>
          </div>
        </dl>

        <p v-if="recordsLoading" class="muted">Loading…</p>
        <p v-else-if="sortedRecords.length === 0" class="empty-state">No service records to report.</p>

        <section v-else class="entries">
          <article v-for="record in sortedRecords" :key="record.id" class="entry">
            <div class="entry-head">
              <div class="entry-title">
                <span :class="badgeClass(record.type)">{{ serviceTypes[record.type].label }}</span>
                <span class="entry-date mono">{{ record.date }}</span>
              </div>
              <div class="entry-meta mono">
                <span>{{ record.odometer.toLocaleString() }} {{ vehicle.odometerUnit }}</span>
                <span class="entry-cost">{{ costLabel(record.cost) }}</span>
              </div>
            </div>

            <dl v-if="detailEntries(record).length" class="entry-details">
              <div v-for="entry in detailEntries(record)" :key="entry.label" class="entry-detail">
                <dt>{{ entry.label }}</dt>
                <dd>{{ entry.value }}</dd>
              </div>
            </dl>

            <p v-if="record.notes" class="entry-notes">{{ record.notes }}</p>

            <div v-if="receiptsByRecord[record.id]?.length" class="receipts">
              <div class="receipts-label">
                Receipt{{ receiptsByRecord[record.id].length > 1 ? 's' : '' }}
              </div>
              <div class="receipts-grid">
                <template v-for="receipt in receiptsByRecord[record.id]" :key="receipt.id">
                  <img
                    v-if="receipt.mimeType.startsWith('image/') && objectUrls[receipt.id]"
                    :src="objectUrls[receipt.id]"
                    :alt="receipt.filename"
                    class="receipt-img"
                  />
                  <a
                    v-else-if="objectUrls[receipt.id]"
                    :href="objectUrls[receipt.id]"
                    target="_blank"
                    rel="noopener"
                    class="receipt-file"
                  >
                    📄 {{ receipt.filename }}
                  </a>
                  <span v-else class="receipt-file">📄 {{ receipt.filename }}</span>
                </template>
              </div>
            </div>
          </article>
        </section>

        <footer class="report-foot">
          End of report — {{ records.length }} record{{ records.length === 1 ? '' : 's' }} for
          {{ vehicle.name }}.
        </footer>
      </article>
    </template>
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

.report-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-4);
}

.report {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.report-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-head);
  flex-wrap: wrap;
}

.report-title {
  font-size: 1.75rem;
  margin: 0;
}

.report-generated {
  margin: var(--space-1) 0 0;
  font-size: 0.8125rem;
  color: var(--color-body);
}

.report-vehicle {
  text-align: right;
}

.report-vehicle-name {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-head);
}

.report-vehicle-sub {
  font-size: 0.875rem;
  color: var(--color-body);
  margin-top: var(--space-1);
}

.identity {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: var(--space-3) var(--space-4);
  margin: var(--space-4) 0 var(--space-5);
}

.identity-item dt {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-body);
}

.identity-item dd {
  margin: var(--space-1) 0 0;
  font-size: 0.9375rem;
  color: var(--color-head);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.entries {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.entry {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  break-inside: avoid;
}

.entry-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.entry-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.entry-date {
  font-size: 0.9375rem;
  color: var(--color-head);
  font-weight: 600;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: 0.875rem;
  color: var(--color-body);
}

.entry-cost {
  font-weight: 600;
  color: var(--color-head);
}

.entry-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: var(--space-2) var(--space-4);
  margin: 0 0 var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.entry-detail dt {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-body);
}

.entry-detail dd {
  margin: 2px 0 0;
  font-size: 0.875rem;
  color: var(--color-head);
}

.entry-notes {
  margin: 0 0 var(--space-3);
  font-size: 0.875rem;
  color: var(--color-body);
  white-space: pre-wrap;
}

.receipts-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-body);
  margin-bottom: var(--space-2);
}

.receipts-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.receipt-img {
  width: 9rem;
  height: 9rem;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.receipt-file {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.8125rem;
  color: var(--color-head);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.report-foot {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  font-size: 0.8125rem;
  color: var(--color-body);
}

/* Print: render as a plain document — drop the card chrome, keep entries intact. */
@media print {
  .report {
    border: none;
    border-radius: 0;
    padding: 0;
    background: #fff;
  }

  .receipt-img {
    width: 8rem;
    height: 8rem;
  }
}
</style>
