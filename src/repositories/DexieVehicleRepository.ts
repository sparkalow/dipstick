import type { DipStickDB } from './db';
import type { VehicleRepository } from './types';
import type { NewVehicle, Vehicle } from '../domain/vehicle';

export class DexieVehicleRepository implements VehicleRepository {
  private db: DipStickDB;

  constructor(db: DipStickDB) {
    this.db = db;
  }

  async getAll(): Promise<Vehicle[]> {
    return this.db.vehicles.toArray();
  }

  async get(id: string): Promise<Vehicle | undefined> {
    return this.db.vehicles.get(id);
  }

  async add(input: NewVehicle): Promise<Vehicle> {
    const vehicle: Vehicle = { ...input, id: crypto.randomUUID() };
    await this.db.vehicles.add(vehicle);
    return vehicle;
  }

  async update(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
    const existing = await this.db.vehicles.get(id);
    if (!existing) {
      throw new Error(`Vehicle not found: ${id}`);
    }
    const updated: Vehicle = { ...existing, ...patch, id };
    await this.db.vehicles.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.vehicles.delete(id);
  }
}
