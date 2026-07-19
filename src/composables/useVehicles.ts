import { ref } from 'vue';
import { vehicleRepository } from '../repositories';
import type { NewVehicle, Vehicle } from '../domain/vehicle';

const vehicles = ref<Vehicle[]>([]);
const loading = ref(false);

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    vehicles.value = await vehicleRepository.getAll();
  } finally {
    loading.value = false;
  }
}

async function add(input: NewVehicle): Promise<Vehicle> {
  const vehicle = await vehicleRepository.add(input);
  await refresh();
  return vehicle;
}

async function update(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
  const vehicle = await vehicleRepository.update(id, patch);
  await refresh();
  return vehicle;
}

async function remove(id: string): Promise<void> {
  await vehicleRepository.delete(id);
  await refresh();
}

export function useVehicles() {
  return { vehicles, loading, refresh, add, update, remove };
}
