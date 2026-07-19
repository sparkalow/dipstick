import type { ServiceDetails } from './serviceTypes';

export interface ServiceRecordBase {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  cost?: number;
  notes?: string;
}

export type ServiceRecord = ServiceRecordBase & ServiceDetails;

export type NewServiceRecord = Omit<ServiceRecordBase, 'id'> & ServiceDetails;
