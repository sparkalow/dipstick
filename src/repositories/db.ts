import Dexie, { type EntityTable } from 'dexie';
import type { Vehicle } from '../domain/vehicle';
import type { ServiceRecord } from '../domain/serviceRecord';

export class DipStickDB extends Dexie {
  vehicles!: EntityTable<Vehicle, 'id'>;
  serviceRecords!: EntityTable<ServiceRecord, 'id'>;

  constructor(name = 'dipstick') {
    super(name);
    this.version(1).stores({
      vehicles: '&id',
      serviceRecords: '&id, vehicleId',
    });
  }
}
