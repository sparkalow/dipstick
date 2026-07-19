import { ref } from 'vue';
import { serviceRecordRepository } from '../repositories';
import type { NewServiceRecord, ServiceRecord } from '../domain/serviceRecord';

const records = ref<ServiceRecord[]>([]);
const loading = ref(false);

// Tracks the last-requested scope so add/update/remove can refresh consistently.
let scope: { vehicleId: string } | null = null;

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
  const record = await serviceRecordRepository.add(input);
  await fetchScoped();
  return record;
}

async function update(id: string, patch: Partial<ServiceRecord>): Promise<ServiceRecord> {
  const record = await serviceRecordRepository.update(id, patch);
  await fetchScoped();
  return record;
}

async function remove(id: string): Promise<void> {
  await serviceRecordRepository.delete(id);
  await fetchScoped();
}

export function useServiceRecords() {
  return { records, loading, loadAll, loadByVehicle, add, update, remove };
}
