import { beforeEach, describe, expect, it } from 'vitest';
import { DipStickDB } from './db';
import { DexieBackupRepository } from './DexieBackupRepository';
import { DexieVehicleRepository } from './DexieVehicleRepository';
import { DexieServiceRecordRepository } from './DexieServiceRecordRepository';
import { DexieReceiptRepository } from './DexieReceiptRepository';

let source: DipStickDB;
let backup: DexieBackupRepository;

beforeEach(() => {
  source = new DipStickDB(`test-backup-${crypto.randomUUID()}`);
  backup = new DexieBackupRepository(source);
});

function freshTarget(): DipStickDB {
  return new DipStickDB(`test-restore-${crypto.randomUUID()}`);
}

// Bytes that are not valid UTF-8 text, so a serializer that silently round-trips
// blobs as strings would corrupt them and fail the comparison below.
const BINARY_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00, 0xfe]);

async function seed(db: DipStickDB) {
  const vehicle = await new DexieVehicleRepository(db).add({
    name: 'Daily Driver',
    make: 'Toyota',
    model: 'Tacoma',
    year: 2014,
    odometerUnit: 'mi',
  });
  const record = await new DexieServiceRecordRepository(db).add({
    vehicleId: vehicle.id,
    type: 'oil_change',
    date: '2026-08-01',
    odometer: 101_500,
    cost: 62.4,
    details: {
      oilViscosity: '5W-30',
      oilType: 'full synthetic',
      quantityQts: 6,
      oilFilterPartNumber: 'PH7317',
    },
  });
  const receipt = await new DexieReceiptRepository(db).add(
    new File([BINARY_BYTES], 'receipt.png', { type: 'image/png' }),
    record.id,
  );
  return { vehicle, record, receipt };
}

describe('DexieBackupRepository', () => {
  it('exportThenImport_databaseWithReceiptBlob_restoresReceiptBytesIntact', async () => {
    const { receipt } = await seed(source);

    const target = freshTarget();
    await new DexieBackupRepository(target).import(await backup.export());

    const restored = await target.receipts.get(receipt.id);
    expect(restored).toBeDefined();
    expect(restored!.blob).toBeInstanceOf(Blob);
    expect(restored!.mimeType).toBe('image/png');
    expect(restored!.filename).toBe('receipt.png');
    expect(new Uint8Array(await restored!.blob.arrayBuffer())).toEqual(BINARY_BYTES);
  });

  it('exportThenImport_populatedDatabase_restoresVehiclesAndServiceRecords', async () => {
    const { vehicle, record } = await seed(source);

    const target = freshTarget();
    await new DexieBackupRepository(target).import(await backup.export());

    await expect(target.vehicles.get(vehicle.id)).resolves.toEqual(vehicle);
    await expect(target.serviceRecords.get(record.id)).resolves.toEqual(record);
  });

  it('import_targetHasDataNotInBackup_replacesRatherThanMerges', async () => {
    await seed(source);
    const snapshot = await backup.export();

    // A vehicle logged after the backup was taken must not survive the restore.
    const stale = await new DexieVehicleRepository(source).add({ name: 'Sold Truck', odometerUnit: 'mi' });
    await backup.import(snapshot);

    await expect(source.vehicles.get(stale.id)).resolves.toBeUndefined();
    await expect(source.vehicles.count()).resolves.toBe(1);
  });

  it('import_appliedTwice_doesNotDuplicateRows', async () => {
    await seed(source);
    const snapshot = await backup.export();

    await backup.import(snapshot);
    await backup.import(snapshot);

    await expect(source.vehicles.count()).resolves.toBe(1);
    await expect(source.serviceRecords.count()).resolves.toBe(1);
    await expect(source.receipts.count()).resolves.toBe(1);
  });

  it('import_fileThatIsNotABackup_rejectsWithoutClearingExistingData', async () => {
    const { vehicle } = await seed(source);

    await expect(backup.import(new Blob(['{"not":"a backup"}'], { type: 'application/json' }))).rejects.toThrow(
      /not a DipStick backup/,
    );

    // The guard must run before any table is cleared.
    await expect(source.vehicles.get(vehicle.id)).resolves.toEqual(vehicle);
    await expect(source.receipts.count()).resolves.toBe(1);
  });
});
