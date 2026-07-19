import { getCurrentInstance, onUnmounted, ref } from 'vue';
import { receiptRepository } from '../repositories';
import type { Receipt } from '../domain/receipt';

const receipts = ref<Receipt[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Cache of receipt id -> live object URL, so repeated getObjectUrl calls for the
// same receipt don't leak extra createObjectURL handles.
const objectUrls = new Map<string, string>();

// Tracks the last-requested scope so add/remove can refresh consistently.
let scope: string | null = null;

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function refresh(): Promise<void> {
  if (!scope) return;
  loading.value = true;
  try {
    receipts.value = await receiptRepository.getByServiceRecord(scope);
  } finally {
    loading.value = false;
  }
}

async function loadByServiceRecord(serviceRecordId: string): Promise<void> {
  scope = serviceRecordId;
  await refresh();
}

async function add(file: File, serviceRecordId: string): Promise<Receipt> {
  error.value = null;
  try {
    const receipt = await receiptRepository.add(file, serviceRecordId);
    await refresh();
    return receipt;
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  }
}

async function remove(id: string): Promise<void> {
  error.value = null;
  try {
    await receiptRepository.delete(id);
    revoke(id);
    await refresh();
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  }
}

async function getObjectUrl(id: string): Promise<string> {
  const cached = objectUrls.get(id);
  if (cached) return cached;
  const url = await receiptRepository.getObjectUrl(id);
  objectUrls.set(id, url);
  return url;
}

// Called when a single receipt's preview is no longer needed (e.g. removed from the list).
function revoke(id: string): void {
  const url = objectUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(id);
  }
}

function revokeAll(): void {
  for (const url of objectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrls.clear();
}

export function useReceipts() {
  // Object URLs are owned by this composable, not the caller — auto-revoke them when
  // the component that pulled them in unmounts. Guarded so calling useReceipts()
  // outside a component (e.g. in tests) doesn't warn about a missing instance.
  if (getCurrentInstance()) {
    onUnmounted(revokeAll);
  }

  return { receipts, loading, error, loadByServiceRecord, add, remove, getObjectUrl, revoke, revokeAll };
}
