import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { fetchAllPages, fetchInBatches } from './supabasePagination';

describe('supabasePagination', () => {
  it('continues until a short page is returned', async () => {
    let call = 0;
    const fetchPage = mock.fn(async () =>
      call++ === 0
        ? { data: Array.from({ length: 1000 }, (_, id) => id), error: null }
        : { data: [1000], error: null }
    );
    const rows = await fetchAllPages<number>(fetchPage);
    assert.equal(rows.length, 1001);
    assert.equal(fetchPage.mock.callCount(), 2);
  });

  it('batches long ID lists', async () => {
    const ids = Array.from({ length: 76 }, (_, index) => String(index));
    const fetchPage = mock.fn(async (batch: string[]) => ({ data: batch, error: null }));
    const rows = await fetchInBatches<string>(ids, fetchPage);
    assert.deepEqual(rows, ids);
    assert.equal(fetchPage.mock.callCount(), 2);
  });
});
