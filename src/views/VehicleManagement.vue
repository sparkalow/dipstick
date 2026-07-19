<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useVehicles } from '../composables/useVehicles';
import VehicleFormModal from '../components/VehicleFormModal.vue';
import type { Vehicle } from '../domain/vehicle';

const { vehicles, loading, error, refresh, remove } = useVehicles();

const editingVehicle = ref<Vehicle | null>(null);
const showModal = ref(false);

onMounted(refresh);

function openAddModal() {
  editingVehicle.value = null;
  showModal.value = true;
}

function openEditModal(vehicle: Vehicle) {
  editingVehicle.value = vehicle;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingVehicle.value = null;
}

async function deleteVehicle(vehicle: Vehicle) {
  if (!window.confirm(`Delete ${vehicle.name}? This cannot be undone.`)) {
    return;
  }
  await remove(vehicle.id).catch(() => {
    // error ref already holds the message; the banner below shows it.
  });
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Vehicles</h1>
      <button type="button" @click="openAddModal">Add vehicle</button>
    </div>

    <p v-if="error" class="page-error">{{ error }}</p>
    <p v-if="loading">Loading…</p>
    <p v-else-if="vehicles.length === 0">No vehicles yet.</p>

    <ul v-else class="vehicle-list">
      <li v-for="vehicle in vehicles" :key="vehicle.id" class="vehicle-row">
        <div>
          <RouterLink :to="`/vehicles/${vehicle.id}`" class="vehicle-name">{{ vehicle.name }}</RouterLink>
          <span class="vehicle-meta">
            {{ [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') }}
          </span>
        </div>
        <div class="vehicle-actions">
          <button type="button" @click="openEditModal(vehicle)">Edit</button>
          <button type="button" @click="deleteVehicle(vehicle)">Delete</button>
        </div>
      </li>
    </ul>

    <VehicleFormModal v-if="showModal" :vehicle="editingVehicle" @close="closeModal" />
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

.vehicle-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.vehicle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--space-1);
  background: var(--color-surface);
}

.vehicle-name {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.vehicle-name:hover {
  text-decoration: underline;
}

.vehicle-meta {
  color: var(--color-text-muted);
  margin-left: var(--space-2);
}

.vehicle-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
