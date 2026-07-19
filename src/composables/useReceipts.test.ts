import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReceipts } from './useReceipts';
import { receiptRepository } from '../repositories';

beforeEach(async () => {
  const existing = await Promise.all(
    [recordAId, recordBId].map((id) => receiptRepository.getByServiceRecord(id)),
  );
  await Promise.all(existing.flat().map((r) => receiptRepository.delete(r.id)));
});

const recordAId = 'record-a';
const recordBId = 'record-b';

function makeFile(name = 'receipt.png', type = 'image/png') {
  return new File(['bytes'], name, { type });
}

describe('useReceipts', () => {
  it('loadByServiceRecord_loadsOnlyThatRecordsReceipts', async () => {
    await receiptRepository.add(makeFile(), recordAId);
    await receiptRepository.add(makeFile(), recordBId);
    const { receipts, loadByServiceRecord } = useReceipts();

    await loadByServiceRecord(recordAId);

    expect(receipts.value).toHaveLength(1);
    expect(receipts.value[0].serviceRecordId).toBe(recordAId);
  });

  it('add_afterLoadByServiceRecord_refreshesReactiveList', async () => {
    const { receipts, loadByServiceRecord, add } = useReceipts();
    await loadByServiceRecord(recordAId);

    await add(makeFile(), recordAId);

    expect(receipts.value).toHaveLength(1);
  });

  it('remove_deletesReceiptAndRefreshesReactiveList', async () => {
    const { receipts, loadByServiceRecord, add, remove } = useReceipts();
    await loadByServiceRecord(recordAId);
    const receipt = await add(makeFile(), recordAId);

    await remove(receipt.id);

    expect(receipts.value).toHaveLength(0);
    await expect(receiptRepository.getByServiceRecord(recordAId)).resolves.toEqual([]);
  });

  it('getObjectUrl_calledTwiceForSameId_returnsCachedUrlWithoutRefetching', async () => {
    const { add, getObjectUrl } = useReceipts();
    const receipt = await add(makeFile(), recordAId);
    const spy = vi.spyOn(receiptRepository, 'getObjectUrl');

    const first = await getObjectUrl(receipt.id);
    const second = await getObjectUrl(receipt.id);

    expect(second).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('remove_revokesTheReceiptsCachedObjectUrl', async () => {
    const { add, remove, getObjectUrl } = useReceipts();
    const receipt = await add(makeFile(), recordAId);
    const url = await getObjectUrl(receipt.id);
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    await remove(receipt.id);

    expect(revokeSpy).toHaveBeenCalledWith(url);
    revokeSpy.mockRestore();
  });
});
