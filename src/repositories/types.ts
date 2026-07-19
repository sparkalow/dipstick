import type { NewVehicle, Vehicle } from '../domain/vehicle';
import type { NewServiceRecord, ServiceRecord } from '../domain/serviceRecord';
import type { Receipt } from '../domain/receipt';

export interface VehicleRepository {
  getAll(): Promise<Vehicle[]>;
  get(id: string): Promise<Vehicle | undefined>;
  add(input: NewVehicle): Promise<Vehicle>;
  update(id: string, patch: Partial<Vehicle>): Promise<Vehicle>;
  delete(id: string): Promise<void>;
}

export interface ServiceRecordRepository {
  getAll(): Promise<ServiceRecord[]>;
  getByVehicle(vehicleId: string): Promise<ServiceRecord[]>;
  get(id: string): Promise<ServiceRecord | undefined>;
  add(input: NewServiceRecord): Promise<ServiceRecord>;
  update(id: string, patch: Partial<ServiceRecord>): Promise<ServiceRecord>;
  delete(id: string): Promise<void>; // MUST cascade-delete this record's receipts
}

export interface ReceiptRepository {
  getByServiceRecord(serviceRecordId: string): Promise<Receipt[]>;
  add(file: File, serviceRecordId: string): Promise<Receipt>;
  delete(id: string): Promise<void>;
  getObjectUrl(id: string): Promise<string>;
}
