import { beforeEach, describe, expect, it } from 'vitest';
import { useVehicles } from './useVehicles';
import { vehicleRepository } from '../repositories';
import type { NewVehicle } from '../domain/vehicle';

beforeEach(async () => {
  const existing = await vehicleRepository.getAll();
  await Promise.all(existing.map((v) => vehicleRepository.delete(v.id)));
});

const newVehicle: NewVehicle = {
  name: 'Honda Civic',
  make: 'Honda',
  model: 'Civic',
  year: 2018,
  odometerUnit: 'mi',
};

describe('useVehicles', () => {
  it('refresh_loadsVehiclesFromRepository', async () => {
    await vehicleRepository.add(newVehicle);
    const { vehicles, refresh } = useVehicles();

    await refresh();

    expect(vehicles.value).toHaveLength(1);
    expect(vehicles.value[0].name).toBe('Honda Civic');
  });

  it('refresh_setsLoadingTrueThenFalse', async () => {
    const { loading, refresh } = useVehicles();

    const pending = refresh();
    expect(loading.value).toBe(true);
    await pending;
    expect(loading.value).toBe(false);
  });

  it('add_persistsVehicleAndRefreshesReactiveList', async () => {
    const { vehicles, add } = useVehicles();

    const vehicle = await add(newVehicle);

    expect(vehicle.id).toBeTruthy();
    expect(vehicles.value.map((v) => v.id)).toContain(vehicle.id);
    await expect(vehicleRepository.get(vehicle.id)).resolves.toEqual(vehicle);
  });

  it('update_patchesVehicleAndRefreshesReactiveList', async () => {
    const { vehicles, add, update } = useVehicles();
    const vehicle = await add(newVehicle);

    await update(vehicle.id, { name: 'Honda Civic Si' });

    expect(vehicles.value.find((v) => v.id === vehicle.id)?.name).toBe('Honda Civic Si');
  });

  it('remove_deletesVehicleAndRefreshesReactiveList', async () => {
    const { vehicles, add, remove } = useVehicles();
    const vehicle = await add(newVehicle);

    await remove(vehicle.id);

    expect(vehicles.value.map((v) => v.id)).not.toContain(vehicle.id);
    await expect(vehicleRepository.get(vehicle.id)).resolves.toBeUndefined();
  });

  it('calling_useVehiclesTwice_sharesReactiveState', async () => {
    const first = useVehicles();
    const second = useVehicles();

    await first.add(newVehicle);

    expect(second.vehicles.value).toHaveLength(1);
  });
});
