<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useVehicles } from '../composables/useVehicles';
import { useServiceRecords } from '../composables/useServiceRecords';
import { getCurrentOdometer } from '../domain/vehicle';
import { serviceTypes } from '../domain/serviceTypes';

const router = useRouter();

const { vehicles, loading: vehiclesLoading, refresh: refreshVehicles } = useVehicles();
const { records, loading: recordsLoading, error, loadAll } = useServiceRecords();

onMounted(() => {
  refreshVehicles();
  loadAll();
});

const vehicleFilter = ref('all');
const typeFilter = ref('all');

const vehicleById = computed(() => new Map(vehicles.value.map((v) => [v.id, v])));

const loading = computed(() => vehiclesLoading.value || recordsLoading.value);

const currentYear = new Date().getFullYear();

const stats = computed(() => ({
  vehicleCount: vehicles.value.length,
  recordsThisYear: records.value.filter((r) => r.date.startsWith(String(currentYear))).length,
  totalSpend: records.value.reduce((sum, r) => sum + (r.cost ?? 0), 0),
}));

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const filteredRecords = computed(() =>
  records.value
    .filter((r) => vehicleFilter.value === 'all' || r.vehicleId === vehicleFilter.value)
    .filter((r) => typeFilter.value === 'all' || r.type === typeFilter.value)
    .sort((a, b) => b.date.localeCompare(a.date)),
);

function odometerLabel(vehicleId: string): string {
  const odo = getCurrentOdometer(records.value, vehicleId);
  const unit = vehicleById.value.get(vehicleId)?.odometerUnit ?? 'mi';
  return odo === undefined ? 'No readings yet' : `${odo.toLocaleString()} ${unit}`;
}

function badgeClass(type: string): string {
  return serviceTypes[type as keyof typeof serviceTypes]?.accentBadge ? 'badge badge--accent' : 'badge';
}

function costLabel(cost: number | undefined): string {
  return cost === undefined ? '—' : currencyFmt.format(cost);
}

function goToVehicle(id: string) {
  router.push(`/vehicles/${id}`);
}
</script>

<template>
  <div>
    <header class="page-head">
      <h1>Garage</h1>
      <p class="page-sub">
        {{ stats.vehicleCount }} {{ stats.vehicleCount === 1 ? 'vehicle' : 'vehicles' }} ·
        {{ records.length }} {{ records.length === 1 ? 'record' : 'records' }} logged
      </p>
    </header>

    <p v-if="error" class="page-error">{{ error }}</p>

    <section class="stat-grid">
      <div class="stat card">
        <div class="stat-label">Vehicles tracked</div>
        <div class="stat-value mono">{{ stats.vehicleCount }}</div>
      </div>
      <div class="stat card">
        <div class="stat-label">Records in {{ currentYear }}</div>
        <div class="stat-value mono">{{ stats.recordsThisYear }}</div>
      </div>
      <div class="stat card">
        <div class="stat-label">Total logged spend</div>
        <div class="stat-value mono">{{ currencyFmt.format(stats.totalSpend) }}</div>
      </div>
    </section>

    <section class="section">
      <h2>Your vehicles</h2>
      <p v-if="!loading && vehicles.length === 0" class="empty-state">
        No vehicles yet. Add one from the Vehicles page to get started.
      </p>
      <div v-else class="chip-row">
        <button
          v-for="vehicle in vehicles"
          :key="vehicle.id"
          type="button"
          class="vehicle-chip"
          @click="goToVehicle(vehicle.id)"
        >
          <span class="chip-name">{{ vehicle.name }}</span>
          <span class="chip-odo mono">{{ odometerLabel(vehicle.id) }}</span>
        </button>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Recent activity</h2>
        <div class="filters">
          <label class="filter">
            <span>Vehicle</span>
            <select v-model="vehicleFilter">
              <option value="all">All vehicles</option>
              <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.name }}</option>
            </select>
          </label>
          <label class="filter">
            <span>Type</span>
            <select v-model="typeFilter">
              <option value="all">All types</option>
              <option v-for="config in Object.values(serviceTypes)" :key="config.key" :value="config.key">
                {{ config.label }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <p v-if="loading" class="muted">Loading…</p>
      <p v-else-if="filteredRecords.length === 0" class="empty-state">No service records match.</p>

      <ul v-else class="record-list">
        <li v-for="record in filteredRecords" :key="record.id" class="record-row card">
          <span :class="badgeClass(record.type)">{{ serviceTypes[record.type].label }}</span>
          <div class="record-main">
            <button type="button" class="record-vehicle" @click="goToVehicle(record.vehicleId)">
              {{ vehicleById.get(record.vehicleId)?.name ?? 'Unknown vehicle' }}
            </button>
            <div class="record-date">{{ record.date }}</div>
          </div>
          <div class="record-odo mono">
            {{ record.odometer.toLocaleString() }} {{ vehicleById.get(record.vehicleId)?.odometerUnit ?? 'mi' }}
          </div>
          <div class="record-cost mono">{{ costLabel(record.cost) }}</div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: var(--space-5);
}

.page-sub {
  margin: var(--space-1) 0 0;
  color: var(--color-body);
}

.page-error {
  color: var(--color-danger);
}

.muted {
  color: var(--color-body);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.stat {
  padding: var(--space-4);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--color-body);
  margin-bottom: var(--space-2);
}

.stat-value {
  font-weight: 600;
  font-size: 1.875rem;
  color: var(--color-head);
}

.section {
  margin-bottom: var(--space-6);
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.section h2 {
  margin-bottom: var(--space-3);
}

.section-head h2 {
  margin-bottom: 0;
}

.chip-row {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.vehicle-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  min-width: 160px;
  padding: 0.875rem 1.25rem;
  border-radius: var(--radius-md);
  background: var(--color-card);
  border: 1.5px solid var(--color-border);
  font-family: var(--font-body);
}

.vehicle-chip:hover {
  border-color: var(--color-accent);
  filter: none;
}

.chip-name {
  font-family: var(--font-head);
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-head);
}

.chip-odo {
  font-size: 0.75rem;
  color: var(--color-body);
}

.filters {
  display: flex;
  gap: var(--space-3);
}

.filter {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: 0.75rem;
  color: var(--color-body);
}

.filter select {
  font-size: 0.8125rem;
  padding: 0.375rem 0.5rem;
}

.record-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.record-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 1.125rem;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-vehicle {
  display: block;
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-head);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-head);
  cursor: pointer;
}

.record-vehicle:hover {
  color: var(--color-accent);
  filter: none;
}

.record-date {
  font-size: 0.8125rem;
  color: var(--color-body);
}

.record-odo {
  font-size: 0.8125rem;
  color: var(--color-body);
  text-align: right;
}

.record-cost {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-head);
  min-width: 70px;
  text-align: right;
}
</style>
