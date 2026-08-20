import { ref } from 'vue';
import { serviceRecordRepository } from '../repositories';
import type { NewServiceRecord, ServiceRecord } from '../domain/serviceRecord';
import { distinctTypes, isBuiltIn } from '../domain/serviceTypes';

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

/**
 * Custom type labels already in use, for the "Custom" picker's suggestions.
 * Deliberately reads the repository directly instead of going through `records` —
 * the drawer opens over a vehicle-scoped list, and reassigning that shared ref
 * would silently swap the page's records out from under it.
 */
async function getTypeSuggestions(): Promise<string[]> {
  const all = await serviceRecordRepository.getAll();
  return distinctTypes(all).filter((type) => !isBuiltIn(type));
}

export function useServiceRecords() {
  return { records, loading, error, loadAll, loadByVehicle, add, update, remove, getTypeSuggestions };
}
