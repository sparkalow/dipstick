import { beforeEach, describe, expect, it } from 'vitest';
import { useServiceRecords } from './useServiceRecords';
import { serviceRecordRepository } from '../repositories';
import type { NewServiceRecord } from '../domain/serviceRecord';

beforeEach(async () => {
  const existing = await serviceRecordRepository.getAll();
  await Promise.all(existing.map((r) => serviceRecordRepository.delete(r.id)));
});

const vehicleAId = 'vehicle-a';
const vehicleBId = 'vehicle-b';

const tireRotationFor = (vehicleId: string, odometer: number) =>
  ({
    vehicleId,
    date: '2026-07-01',
    odometer,
    type: 'tire_rotation',
    details: {},
  }) satisfies NewServiceRecord;

describe('useServiceRecords', () => {
  it('loadAll_loadsRecordsAcrossAllVehicles', async () => {
    await serviceRecordRepository.add(tireRotationFor(vehicleAId, 1000));
    await serviceRecordRepository.add(tireRotationFor(vehicleBId, 2000));
    const { records, loadAll } = useServiceRecords();

    await loadAll();

    expect(records.value).toHaveLength(2);
  });

  it('loadByVehicle_loadsOnlyThatVehiclesRecords', async () => {
    await serviceRecordRepository.add(tireRotationFor(vehicleAId, 1000));
    await serviceRecordRepository.add(tireRotationFor(vehicleBId, 2000));
    const { records, loadByVehicle } = useServiceRecords();

    await loadByVehicle(vehicleAId);

    expect(records.value).toHaveLength(1);
    expect(records.value[0].vehicleId).toBe(vehicleAId);
  });

  it('add_afterLoadByVehicle_refreshesWithinThatVehiclesScope', async () => {
    const { records, loadByVehicle, add } = useServiceRecords();
    await loadByVehicle(vehicleAId);

    await add(tireRotationFor(vehicleAId, 1500));
    await add(tireRotationFor(vehicleBId, 2500));

    expect(records.value).toHaveLength(1);
    expect(records.value[0].vehicleId).toBe(vehicleAId);
  });

  it('add_afterLoadAll_refreshesAcrossAllVehicles', async () => {
    const { records, loadAll, add } = useServiceRecords();
    await loadAll();

    await add(tireRotationFor(vehicleAId, 1500));
    await add(tireRotationFor(vehicleBId, 2500));

    expect(records.value).toHaveLength(2);
  });

  it('update_patchesRecordAndRefreshesReactiveList', async () => {
    const { records, loadByVehicle, add, update } = useServiceRecords();
    await loadByVehicle(vehicleAId);
    const record = await add(tireRotationFor(vehicleAId, 1000));

    await update(record.id, { odometer: 1200 });

    expect(records.value.find((r) => r.id === record.id)?.odometer).toBe(1200);
  });

  it('remove_deletesRecordAndRefreshesReactiveList', async () => {
    const { records, loadByVehicle, add, remove } = useServiceRecords();
    await loadByVehicle(vehicleAId);
    const record = await add(tireRotationFor(vehicleAId, 1000));

    await remove(record.id);

    expect(records.value.map((r) => r.id)).not.toContain(record.id);
    await expect(serviceRecordRepository.get(record.id)).resolves.toBeUndefined();
  });

  it('add_invalidDetailsForType_rejectsWithoutRefreshingList', async () => {
    const { records, loadByVehicle, add } = useServiceRecords();
    await loadByVehicle(vehicleAId);

    const invalid = {
      vehicleId: vehicleAId,
      date: '2026-07-01',
      odometer: 1000,
      type: 'oil_change',
      details: { oilViscosity: 'bogus' },
    } as unknown as NewServiceRecord;

    await expect(add(invalid)).rejects.toThrow();
    expect(records.value).toHaveLength(0);
  });
});
