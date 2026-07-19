import { beforeEach, describe, expect, it } from 'vitest';
import { DipStickDB } from './db';
import { DexieServiceRecordRepository } from './DexieServiceRecordRepository';
import { DexieReceiptRepository } from './DexieReceiptRepository';
import type { NewServiceRecord } from '../domain/serviceRecord';

let db: DipStickDB;
let repo: DexieServiceRecordRepository;

beforeEach(() => {
  db = new DipStickDB(`test-service-records-${crypto.randomUUID()}`);
  repo = new DexieServiceRecordRepository(db);
});

const vehicleId = 'vehicle-1';

const validOilChange = {
  vehicleId,
  date: '2026-07-01',
  odometer: 42000,
  type: 'oil_change',
  details: {
    oilViscosity: '5W-30',
    oilType: 'full synthetic',
    quantityQts: 5,
    oilFilterPartNumber: 'PH1234',
  },
} satisfies NewServiceRecord;

const validTireRotation = {
  vehicleId,
  date: '2026-07-05',
  odometer: 42500,
  type: 'tire_rotation',
  details: {},
} satisfies NewServiceRecord;

describe('DexieServiceRecordRepository', () => {
  it('add_validOilChangeDetails_generatesUuidAndPersists', async () => {
    const record = await repo.add(validOilChange);

    expect(record.id).toMatch(/^[0-9a-f-]{36}$/);
    await expect(repo.get(record.id)).resolves.toEqual(record);
  });

  it('add_validTireRotationWithEmptyDetails_persists', async () => {
    const record = await repo.add(validTireRotation);

    await expect(repo.get(record.id)).resolves.toEqual(record);
  });

  it('add_invalidDetailsForType_rejectsAndDoesNotPersist', async () => {
    const invalid: NewServiceRecord = {
      ...validOilChange,
      details: {
        oilViscosity: 'not-a-real-viscosity' as never,
        oilType: 'full synthetic',
        quantityQts: 5,
        oilFilterPartNumber: 'PH1234',
      },
    };

    await expect(repo.add(invalid)).rejects.toThrow();
    await expect(repo.getAll()).resolves.toEqual([]);
  });

  it('getByVehicle_multipleVehicles_returnsOnlyMatchingRecords', async () => {
    const own = await repo.add(validOilChange);
    await repo.add({ ...validTireRotation, vehicleId: 'vehicle-2' });

    const records = await repo.getByVehicle(vehicleId);

    expect(records).toEqual([own]);
  });

  it('update_validPatchToDetails_revalidatesAndPersists', async () => {
    const record = await repo.add(validOilChange);

    const updated = await repo.update(record.id, {
      details: { ...validOilChange.details, quantityQts: 5.5 },
    });

    expect(updated.details).toEqual({ ...validOilChange.details, quantityQts: 5.5 });
    await expect(repo.get(record.id)).resolves.toEqual(updated);
  });

  it('update_patchMakesDetailsInvalidForExistingType_rejectsAndLeavesStoredRecordUnchanged', async () => {
    const record = await repo.add(validOilChange);

    await expect(
      repo.update(record.id, {
        details: { ...validOilChange.details, quantityQts: 'five' as unknown as number },
      }),
    ).rejects.toThrow();
    await expect(repo.get(record.id)).resolves.toEqual(record);
  });

  it('update_changesTypeWithoutMatchingDetails_rejects', async () => {
    const record = await repo.add(validTireRotation);

    await expect(repo.update(record.id, { type: 'oil_change' })).rejects.toThrow();
  });

  it('update_unknownId_rejects', async () => {
    await expect(repo.update('does-not-exist', { odometer: 1 })).rejects.toThrow();
  });

  it('delete_existingRecord_removesIt', async () => {
    const record = await repo.add(validOilChange);

    await repo.delete(record.id);

    await expect(repo.get(record.id)).resolves.toBeUndefined();
  });

  it('delete_recordWithReceipts_cascadesDeleteToItsReceiptsOnly', async () => {
    const receiptRepo = new DexieReceiptRepository(db);
    const record = await repo.add(validOilChange);
    const otherRecord = await repo.add(validTireRotation);
    const ownReceipt = await receiptRepo.add(
      new File(['a'], 'a.png', { type: 'image/png' }),
      record.id,
    );
    const otherReceipt = await receiptRepo.add(
      new File(['b'], 'b.png', { type: 'image/png' }),
      otherRecord.id,
    );

    await repo.delete(record.id);

    await expect(receiptRepo.getByServiceRecord(record.id)).resolves.toEqual([]);
    await expect(receiptRepo.getByServiceRecord(otherRecord.id)).resolves.toEqual([otherReceipt]);
    expect(ownReceipt.serviceRecordId).toBe(record.id);
  });
});
