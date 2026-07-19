import type { ServiceRecord } from './serviceRecord';

export type OdometerUnit = 'mi' | 'km';

export interface Vehicle {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  odometerUnit: OdometerUnit;
}

export type NewVehicle = Omit<Vehicle, 'id'>;

/** Derives a vehicle's current odometer as the max odometer across its service records. Never stored. */
export function getCurrentOdometer(
  records: ServiceRecord[],
  vehicleId: string,
): number | undefined {
  const odometers = records
    .filter((record) => record.vehicleId === vehicleId)
    .map((record) => record.odometer);
  return odometers.length === 0 ? undefined : Math.max(...odometers);
}
