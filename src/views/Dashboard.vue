<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useVehicles } from '../composables/useVehicles';
import { useServiceRecords } from '../composables/useServiceRecords';
import { serviceTypes } from '../domain/serviceTypes';

const { vehicles, loading: vehiclesLoading, refresh: refreshVehicles } = useVehicles();
const { records, loading: recordsLoading, error, loadAll } = useServiceRecords();

onMounted(() => {
  refreshVehicles();
  loadAll();
});

const vehicleFilter = ref('all');
const typeFilter = ref('all');

const vehicleById = computed(() => new Map(vehicles.value.map((v) => [v.id, v])));

const filteredRecords = computed(() =>
  records.value
    .filter((r) => vehicleFilter.value === 'all' || r.vehicleId === vehicleFilter.value)
    .filter((r) => typeFilter.value === 'all' || r.type === typeFilter.value)
    .sort((a, b) => b.date.localeCompare(a.date)),
);

const loading = computed(() => vehiclesLoading.value || recordsLoading.value);
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Dashboard</h1>
    </div>

    <div class="filters">
      <label class="filter">
        Vehicle
        <select v-model="vehicleFilter">
          <option value="all">All vehicles</option>
          <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">
            {{ vehicle.name }}
          </option>
        </select>
      </label>

      <label class="filter">
        Service type
        <select v-model="typeFilter">
          <option value="all">All types</option>
          <option v-for="config in Object.values(serviceTypes)" :key="config.key" :value="config.key">
            {{ config.label }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="error" class="page-error">{{ error }}</p>
    <p v-if="loading">Loading…</p>
    <p v-else-if="filteredRecords.length === 0" class="empty-state">No service records match.</p>

    <ul v-else class="record-list">
      <li v-for="record in filteredRecords" :key="record.id" class="record-row">
        <div class="record-info">
          <RouterLink :to="`/vehicles/${record.vehicleId}`" class="record-vehicle">
            {{ vehicleById.get(record.vehicleId)?.name ?? 'Unknown vehicle' }}
          </RouterLink>
          <strong>{{ serviceTypes[record.type].label }}</strong>
          <span class="record-meta">
            {{ record.date }} · {{ record.odometer.toLocaleString() }}
            {{ vehicleById.get(record.vehicleId)?.odometerUnit ?? 'mi' }}
            <template v-if="record.cost !== undefined"> · ${{ record.cost.toFixed(2) }}</template>
          </span>
          <span v-if="record.notes" class="record-notes">{{ record.notes }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.filters {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.filter {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: 0.85rem;
  color: var(--color-text-muted);
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

.record-vehicle {
  align-self: flex-start;
  color: var(--color-accent);
  text-decoration: none;
  font-size: 0.85rem;
}

.record-vehicle:hover {
  text-decoration: underline;
}

.record-meta {
  color: var(--color-text-muted);
}

.record-notes {
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
