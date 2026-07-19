import { beforeEach, describe, expect, it } from 'vitest';
import { DipStickDB } from './db';
import { DexieVehicleRepository } from './DexieVehicleRepository';
import type { NewVehicle } from '../domain/vehicle';

let db: DipStickDB;
let repo: DexieVehicleRepository;

beforeEach(() => {
  db = new DipStickDB(`test-vehicles-${crypto.randomUUID()}`);
  repo = new DexieVehicleRepository(db);
});

const newVehicle: NewVehicle = {
  name: 'Honda Civic',
  make: 'Honda',
  model: 'Civic',
  year: 2018,
  odometerUnit: 'mi',
};

describe('DexieVehicleRepository', () => {
  it('add_validInput_generatesUuidAndPersists', async () => {
    const vehicle = await repo.add(newVehicle);

    expect(vehicle.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(vehicle.name).toBe('Honda Civic');
    await expect(repo.get(vehicle.id)).resolves.toEqual(vehicle);
  });

  it('add_twice_generatesDistinctIds', async () => {
    const a = await repo.add(newVehicle);
    const b = await repo.add(newVehicle);

    expect(a.id).not.toBe(b.id);
  });

  it('getAll_afterAddingMultiple_returnsAll', async () => {
    await repo.add(newVehicle);
    await repo.add({ ...newVehicle, name: 'Toyota Corolla' });

    const all = await repo.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((v) => v.name).sort()).toEqual(['Honda Civic', 'Toyota Corolla']);
  });

  it('get_unknownId_returnsUndefined', async () => {
    await expect(repo.get('does-not-exist')).resolves.toBeUndefined();
  });

  it('update_existingVehicle_appliesPartialPatch', async () => {
    const vehicle = await repo.add(newVehicle);

    const updated = await repo.update(vehicle.id, { name: 'Honda Civic Si' });

    expect(updated).toEqual({ ...vehicle, name: 'Honda Civic Si' });
    await expect(repo.get(vehicle.id)).resolves.toEqual(updated);
  });

  it('update_unknownId_rejects', async () => {
    await expect(repo.update('does-not-exist', { name: 'x' })).rejects.toThrow();
  });

  it('delete_existingVehicle_removesIt', async () => {
    const vehicle = await repo.add(newVehicle);

    await repo.delete(vehicle.id);

    await expect(repo.get(vehicle.id)).resolves.toBeUndefined();
  });
});
