import { ref } from 'vue';
import { backupRepository } from '../repositories';
import { backupFilename, downloadBlob } from '../components/backup';

const exporting = ref(false);
const importing = ref(false);
const error = ref<string | null>(null);

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function exportBackup(): Promise<void> {
  error.value = null;
  exporting.value = true;
  try {
    downloadBlob(await backupRepository.export(), backupFilename(new Date()));
  } catch (e) {
    error.value = toErrorMessage(e);
    throw e;
  } finally {
    exporting.value = false;
  }
}

/**
 * Restores a backup, replacing everything currently stored.
 *
 * On success the page is reloaded rather than the composables re-fetched: the
 * vehicle/record/receipt composables hold module-level singleton state and
 * `useServiceRecords` tracks the current scope, so after a wholesale data
 * replacement a reload is the only way to guarantee nothing is left stale.
 */
async function importBackup(file: File): Promise<void> {
  error.value = null;
  if (file.size === 0) {
    error.value = 'That file is empty.';
    throw new Error(error.value);
  }
  importing.value = true;
  try {
    await backupRepository.import(file);
    window.location.reload();
  } catch (e) {
    error.value = toErrorMessage(e);
    importing.value = false;
    throw e;
  }
  // Deliberately no `finally`: on success the reload is already underway and
  // clearing the flag would flicker the button back to its idle label.
}

export function useBackup() {
  return { exporting, importing, error, exportBackup, importBackup };
}
