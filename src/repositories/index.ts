import { DipStickDB } from './db';
import { DexieVehicleRepository } from './DexieVehicleRepository';
import { DexieServiceRecordRepository } from './DexieServiceRecordRepository';
import type { VehicleRepository, ServiceRecordRepository } from './types';

const db = new DipStickDB();

// Single swap point: change these two lines to select an HttpServiceRepository
// implementation later without touching any composable or component.
export const vehicleRepository: VehicleRepository = new DexieVehicleRepository(db);
export const serviceRecordRepository: ServiceRecordRepository = new DexieServiceRecordRepository(db);

export type { VehicleRepository, ServiceRecordRepository } from './types';
