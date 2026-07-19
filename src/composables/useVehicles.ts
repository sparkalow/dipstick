import { ref } from 'vue';
import { vehicleRepository } from '../repositories';
import type { NewVehicle, Vehicle } from '../domain/vehicle';

const vehicles = ref<Vehicle[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    vehicles.value = await vehicleRepository.getAll();
  } finally {
    loading.value = false;
  }
}

async function add(input: NewVehicle): Promise<Vehicle> {
  error.value = null;
  try {
    const vehicle = await vehicleRepository.add(input);
    await refresh();
    return vehicle;
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  }
}

async function update(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
  error.value = null;
  try {
    const vehicle = await vehicleRepository.update(id, patch);
    await refresh();
    return vehicle;
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  }
}

async function remove(id: string): Promise<void> {
  error.value = null;
  try {
    await vehicleRepository.delete(id);
    await refresh();
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  }
}

export function useVehicles() {
  return { vehicles, loading, error, refresh, add, update, remove };
}
