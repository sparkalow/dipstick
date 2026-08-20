import type { DipStickDB } from './db';
import type { ServiceRecordRepository } from './types';
import type { NewServiceRecord, ServiceRecord } from '../domain/serviceRecord';
import { getServiceType, normalizeServiceType, validateServiceType } from '../domain/serviceTypes';

// An unrecognized type is a user-defined (custom) one, not an error — but it still
// has to be a usable label, and its details still have to match the type's schema.
// Returns the *parsed* details so what gets stored is the validated value, with any
// keys the type doesn't declare stripped rather than persisted alongside it.
function validatedDetails(record: Pick<ServiceRecord, 'type' | 'details'>): ServiceRecord['details'] {
  const typeError = validateServiceType(record.type);
  if (typeError) {
    throw new Error(typeError);
  }
  return getServiceType(record.type).detailsSchema.parse(record.details) as ServiceRecord['details'];
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
    const details = validatedDetails(input);
    // Normalize here, not just in the form, so no caller can seed a padded or
    // double-spaced near-duplicate of an existing custom type.
    const record = {
      ...input,
      type: normalizeServiceType(input.type),
      details,
      id: crypto.randomUUID(),
    } as ServiceRecord;
    await this.db.serviceRecords.add(record);
    return record;
  }

  async update(id: string, patch: Partial<ServiceRecord>): Promise<ServiceRecord> {
    const existing = await this.db.serviceRecords.get(id);
    if (!existing) {
      throw new Error(`Service record not found: ${id}`);
    }
    const merged = { ...existing, ...patch, id } as ServiceRecord;
    const updated = {
      ...merged,
      type: normalizeServiceType(merged.type),
      details: validatedDetails(merged),
    } as ServiceRecord;
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
