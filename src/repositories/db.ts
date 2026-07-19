import Dexie, { type EntityTable } from 'dexie';
import type { Vehicle } from '../domain/vehicle';
import type { ServiceRecord } from '../domain/serviceRecord';
import type { Receipt } from '../domain/receipt';

export class DipStickDB extends Dexie {
  vehicles!: EntityTable<Vehicle, 'id'>;
  serviceRecords!: EntityTable<ServiceRecord, 'id'>;
  receipts!: EntityTable<Receipt, 'id'>;

  constructor(name = 'dipstick') {
    super(name);
    this.version(1).stores({
      vehicles: '&id',
      serviceRecords: '&id, vehicleId',
      receipts: '&id, serviceRecordId',
    });
  }
}
