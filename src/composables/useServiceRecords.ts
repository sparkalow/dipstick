import { ref } from 'vue';
import { serviceRecordRepository } from '../repositories';
import type { NewServiceRecord, ServiceRecord } from '../domain/serviceRecord';

const records = ref<ServiceRecord[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Tracks the last-requested scope so add/update/remove can refresh consistently.
let scope: { vehicleId: string } | null = null;

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function fetchScoped(): Promise<void> {
  loading.value = true;
  try {
    records.value = scope
      ? await serviceRecordRepository.getByVehicle(scope.vehicleId)
      : await serviceRecordRepository.getAll();
  } finally {
    loading.value = false;
  }
}

async function loadAll(): Promise<void> {
  scope = null;
  await fetchScoped();
}

async function loadByVehicle(vehicleId: string): Promise<void> {
  scope = { vehicleId };
  await fetchScoped();
}

async function add(input: NewServiceRecord): Promise<ServiceRecord> {
  error.value = null;
  try {
    const record = await serviceRecordRepository.add(input);
    await fetchScoped();
    return record;
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  }
}

async function update(id: string, patch: Partial<ServiceRecord>): Promise<ServiceRecord> {
  error.value = null;
  try {
    const record = await serviceRecordRepository.update(id, patch);
    await fetchScoped();
    return record;
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  }
}

async function remove(id: string): Promise<void> {
  error.value = null;
  try {
    await serviceRecordRepository.delete(id);
    await fetchScoped();
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  }
}

export function useServiceRecords() {
  return { records, loading, error, loadAll, loadByVehicle, add, update, remove };
}
