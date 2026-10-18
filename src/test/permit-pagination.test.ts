import { describe, expect, it } from 'vitest';
import { fetchAllPages } from '@/lib/fetchAllPages';

describe('permit list pagination', () => {
  it('loads every renewal entry after adding issuance entries beyond the first 1000 rows', async () => {
    const records = [
      ...Array.from({ length: 396 }, (_, id) => ({ id, list: 'issue' })),
      ...Array.from({ length: 852 }, (_, id) => ({ id: id + 396, list: id % 2 ? 'airports_renew' : 'ports_renew' })),
    ];
    const ranges: number[][] = [];
    const loaded = await fetchAllPages(async (from, to) => {
      ranges.push([from, to]);
      return { data: records.slice(from, to + 1), error: null };
    });
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
    expect(loaded).toHaveLength(1248);
    expect(loaded.filter(row => row.list === 'airports_renew')).toHaveLength(426);
    expect(loaded.filter(row => row.list === 'ports_renew')).toHaveLength(426);
  });

  it('rejects failed pages instead of returning a partial list', async () => {
    const error = new Error('Network unavailable');
    await expect(fetchAllPages(async () => ({ data: null, error }))).rejects.toThrow(error);
  });
});