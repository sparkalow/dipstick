import type { DipStickDB } from './db';
import type { ServiceRecordRepository } from './types';
import type { NewServiceRecord, ServiceRecord } from '../domain/serviceRecord';
import { serviceTypes } from '../domain/serviceTypes';

function validateDetails(record: Pick<ServiceRecord, 'type' | 'details'>): void {
  const config = serviceTypes[record.type];
  if (!config) {
    throw new Error(`Unknown service type: ${record.type}`);
  }
  config.detailsSchema.parse(record.details);
}

export class DexieServiceRecordRepository implements ServiceRecordRepository {
  private db: DipStickDB;

  constructor(db: DipStickDB) {
    this.db = db;
  }

  async getAll(): Promise<ServiceRecord[]> {
    return this.db.serviceRecords.toArray();
  }

  async getByVehicle(vehicleId: string): Promise<ServiceRecord[]> {
    return this.db.serviceRecords.where('vehicleId').equals(vehicleId).toArray();
  }

  async get(id: string): Promise<ServiceRecord | undefined> {
    return this.db.serviceRecords.get(id);
  }

  async add(input: NewServiceRecord): Promise<ServiceRecord> {
    validateDetails(input);
    const record = { ...input, id: crypto.randomUUID() } as ServiceRecord;
    await this.db.serviceRecords.add(record);
    return record;
  }

  async update(id: string, patch: Partial<ServiceRecord>): Promise<ServiceRecord> {
    const existing = await this.db.serviceRecords.get(id);
    if (!existing) {
      throw new Error(`Service record not found: ${id}`);
    }
    const updated = { ...existing, ...patch, id } as ServiceRecord;
    validateDetails(updated);
    await this.db.serviceRecords.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.serviceRecords, this.db.receipts, async () => {
      const receiptIds = await this.db.receipts.where('serviceRecordId').equals(id).primaryKeys();
      await this.db.receipts.bulkDelete(receiptIds);
      await this.db.serviceRecords.delete(id);
    });
  }
}
