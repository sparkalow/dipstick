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
