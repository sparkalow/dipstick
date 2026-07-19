import { describe, expect, it } from 'vitest';
import { getCurrentOdometer } from './vehicle';
import type { ServiceRecord } from './serviceRecord';

function tireRotation(vehicleId: string, odometer: number): ServiceRecord {
  return {
    id: crypto.randomUUID(),
    vehicleId,
    date: '2026-01-01',
    odometer,
    type: 'tire_rotation',
    details: {},
  };
}

describe('getCurrentOdometer', () => {
  it('multipleRecordsForVehicle_returnsMax', () => {
    const records = [tireRotation('v1', 1000), tireRotation('v1', 5000), tireRotation('v1', 3000)];

    expect(getCurrentOdometer(records, 'v1')).toBe(5000);
  });

  it('recordsFromOtherVehiclesPresent_ignoresThem', () => {
    const records = [tireRotation('v1', 1000), tireRotation('v2', 9000)];

    expect(getCurrentOdometer(records, 'v1')).toBe(1000);
  });

  it('noRecordsForVehicle_returnsUndefined', () => {
    expect(getCurrentOdometer([], 'v1')).toBeUndefined();
  });
});
