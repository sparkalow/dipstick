import type { DipStickDB } from './db';
import type { ReceiptRepository } from './types';
import type { Receipt } from '../domain/receipt';

export class DexieReceiptRepository implements ReceiptRepository {
  private db: DipStickDB;

  constructor(db: DipStickDB) {
    this.db = db;
  }

  async getByServiceRecord(serviceRecordId: string): Promise<Receipt[]> {
    return this.db.receipts.where('serviceRecordId').equals(serviceRecordId).toArray();
  }

  async add(file: File, serviceRecordId: string): Promise<Receipt> {
    const receipt: Receipt = {
      id: crypto.randomUUID(),
      serviceRecordId,
      blob: file,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      addedAt: new Date().toISOString(),
    };
    await this.db.receipts.add(receipt);
    return receipt;
  }

  async delete(id: string): Promise<void> {
    await this.db.receipts.delete(id);
  }

  async getObjectUrl(id: string): Promise<string> {
    const receipt = await this.db.receipts.get(id);
    if (!receipt) {
      throw new Error(`Receipt not found: ${id}`);
    }
    return URL.createObjectURL(receipt.blob);
  }
}
