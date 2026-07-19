import { beforeEach, describe, expect, it } from 'vitest';
import { DipStickDB } from './db';
import { DexieReceiptRepository } from './DexieReceiptRepository';

let db: DipStickDB;
let repo: DexieReceiptRepository;

beforeEach(() => {
  db = new DipStickDB(`test-receipts-${crypto.randomUUID()}`);
  repo = new DexieReceiptRepository(db);
});

const serviceRecordId = 'record-1';

function makeFile(name: string, contents: string, type: string): File {
  return new File([contents], name, { type });
}

describe('DexieReceiptRepository', () => {
  it('add_validFile_generatesUuidCapturesMetadataAndPersistsBlob', async () => {
    const file = makeFile('receipt.png', 'fake-image-bytes', 'image/png');

    const receipt = await repo.add(file, serviceRecordId);

    expect(receipt.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(receipt.serviceRecordId).toBe(serviceRecordId);
    expect(receipt.filename).toBe('receipt.png');
    expect(receipt.mimeType).toBe('image/png');
    expect(receipt.size).toBe(file.size);
    expect(receipt.blob).toBeInstanceOf(Blob);
    await expect(receipt.blob.text()).resolves.toBe('fake-image-bytes');
  });

  it('getByServiceRecord_multipleServiceRecords_returnsOnlyMatchingReceipts', async () => {
    const own = await repo.add(makeFile('a.png', 'a', 'image/png'), serviceRecordId);
    await repo.add(makeFile('b.png', 'b', 'image/png'), 'record-2');

    const receipts = await repo.getByServiceRecord(serviceRecordId);

    expect(receipts.map((r) => r.id)).toEqual([own.id]);
  });

  it('delete_existingReceipt_removesIt', async () => {
    const receipt = await repo.add(makeFile('a.png', 'a', 'image/png'), serviceRecordId);

    await repo.delete(receipt.id);

    await expect(repo.getByServiceRecord(serviceRecordId)).resolves.toEqual([]);
  });

  it('getObjectUrl_existingReceipt_returnsBlobUrl', async () => {
    const receipt = await repo.add(makeFile('a.png', 'a', 'image/png'), serviceRecordId);

    const url = await repo.getObjectUrl(receipt.id);

    expect(url).toMatch(/^blob:/);
  });

  it('getObjectUrl_unknownId_rejects', async () => {
    await expect(repo.getObjectUrl('does-not-exist')).rejects.toThrow();
  });
});
