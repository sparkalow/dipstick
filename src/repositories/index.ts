import { DipStickDB } from './db';
import { DexieVehicleRepository } from './DexieVehicleRepository';
import { DexieServiceRecordRepository } from './DexieServiceRecordRepository';
import { DexieReceiptRepository } from './DexieReceiptRepository';
import type { VehicleRepository, ServiceRecordRepository, ReceiptRepository } from './types';

const db = new DipStickDB();

// Single swap point: change these lines to select an HttpServiceRepository
// implementation later without touching any composable or component.
export const vehicleRepository: VehicleRepository = new DexieVehicleRepository(db);
export const serviceRecordRepository: ServiceRecordRepository = new DexieServiceRecordRepository(db);
export const receiptRepository: ReceiptRepository = new DexieReceiptRepository(db);

export type { VehicleRepository, ServiceRecordRepository, ReceiptRepository } from './types';
