import type { DipStickDB } from './db';
import type { BackupRepository } from './types';

/**
 * Full-database backup via the `dexie-export-import` addon.
 *
 * The addon is loaded with a dynamic `import()` so its serializer registry stays
 * out of the main bundle — it only downloads when the user actually backs up or
 * restores.
 */
export class DexieBackupRepository implements BackupRepository {
  private db: DipStickDB;

  constructor(db: DipStickDB) {
    this.db = db;
  }

  async export(): Promise<Blob> {
    const { exportDB } = await import('dexie-export-import');
    return exportDB(this.db, {
      prettyJson: false,
      transform: (table, value) => ({ value: table === 'receipts' ? plainBlobReceipt(value) : value }),
    });
  }

  async import(file: Blob): Promise<void> {
    const { importInto, peakImportFile } = await import('dexie-export-import');

    // Read only the metadata header first. The addon does reject a foreign file
    // on its own, but checking up front keeps a mistyped file from getting
    // anywhere near `clearTablesBeforeImport`.
    const meta = await peakImportFile(file).catch(() => null);
    if (meta?.formatName !== 'dexie') {
      throw new Error('That file is not a DipStick backup.');
    }

    await importInto(this.db, file, {
      // A restore replaces data rather than merging it — without this, records
      // deleted since the backup was taken would silently reappear.
      clearTablesBeforeImport: true,
      overwriteValues: true,
      // An older backup must still restore into a newer schema.
      acceptVersionDiff: true,
      // Tests (and any renamed database) import across differing DB names.
      acceptNameDiff: true,
    });
  }
}

/**
 * `ReceiptRepository.add` persists the picked `File` as-is, so `receipt.blob` is
 * usually a `File` rather than a plain `Blob`. The addon serializes plain Blobs
 * with its own base64 codec, but routes anything tagged `File` through
 * typeson-registry's File codec, which reads the bytes with a *synchronous*
 * XMLHttpRequest against an object URL. Re-wrapping as a plain Blob — which
 * costs nothing, as the Blob constructor references the existing bytes rather
 * than copying them — takes the base64 path instead. `Receipt.blob` is declared
 * as `Blob` and the filename lives in its own field, so nothing is lost.
 */
function plainBlobReceipt(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const receipt = value as { blob?: unknown };
  if (!(receipt.blob instanceof Blob)) return value;
  return { ...receipt, blob: new Blob([receipt.blob], { type: receipt.blob.type }) };
}
