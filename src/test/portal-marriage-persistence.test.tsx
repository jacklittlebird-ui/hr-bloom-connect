import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalDataProvider, usePortalData } from '@/contexts/PortalDataContext';

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'employee', employeeUuid: 'employee-uuid' } }),
}));
vi.mock('@/lib/queryOptimizer', () => ({
  trackQuery: vi.fn(), invalidateCache: vi.fn(),
  debouncedFetch: async (_key: string, fetcher: () => Promise<unknown>) => fetcher(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: () => {
      const channel = { on: () => channel, subscribe: () => channel };
      return channel;
    },
    removeChannel: vi.fn(),
    from: (table: string) => {
      let payload: Record<string, unknown> | undefined;
      let approvedOnly = false;
      const query = {
        select: () => query,
        insert: (value: Record<string, unknown>) => { payload = value; return query; },
        eq: (field: string, value: unknown) => {
          if (field === 'status' && value === 'approved') approvedOnly = true;
          return query;
        },
        neq: () => query, gte: () => query, lte: () => query,
        order: () => query, limit: () => query,
        single: async () => {
          if (!payload) throw new Error('Missing insert');
          state.inserts.push(payload);
          const row = { ...payload, id: 'saved-request', status: 'pending' };
          state.rows.push(row);
          return { data: row, error: null };
        },
        then: (resolve: (result: unknown) => unknown) => {
          const data = table === 'leave_balances'
            ? [{ employee_id: 'employee-uuid', annual_total: 21, sick_total: 10, casual_total: 6 }]
            : table === 'leave_requests'
              ? state.rows.filter(row => !approvedOnly || row.status === 'approved')
              : [];
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return query;
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <PortalDataProvider>{children}</PortalDataProvider>;

describe('Marriage leave persistence and balances', () => {
  beforeEach(() => { cleanup(); state.rows = []; state.inserts = []; });

  it('stores marriage rather than annual and reads back the saved marriage request', async () => {
    const { result } = renderHook(() => usePortalData(), { wrapper });
    await act(async () => {
      await result.current.addLeaveRequest({
        employeeId: 'employee-uuid', typeAr: 'زواج', typeEn: 'Marriage',
        from: '2026-10-17', to: '2026-10-24', days: 7,
      });
    });
    expect(state.inserts[0].leave_type).toBe('marriage');
    expect(result.current.getLeaveRequests('employee-uuid')[0]).toMatchObject({
      typeAr: 'زواج', typeEn: 'Marriage', days: 7,
    });
  });

  it('does not consume annual, sick or casual balances even after marriage leave approval', async () => {
    state.rows = [{ employee_id: 'employee-uuid', leave_type: 'marriage', days: 7, status: 'approved' }];
    const { result } = renderHook(() => usePortalData(), { wrapper });
    await act(async () => { await result.current.ensureLeaves(true); });
    const balances = result.current.getLeaveBalances('employee-uuid');
    expect(balances.find(b => b.typeEn === 'Annual')).toMatchObject({ used: 0, remaining: 21 });
    expect(balances.find(b => b.typeEn === 'Sick')).toMatchObject({ used: 0, remaining: 10 });
    expect(balances.find(b => b.typeEn === 'Casual')).toMatchObject({ used: 0, remaining: 6 });
  });

  it('rejects an unknown type instead of silently saving it as annual', async () => {
    const { result } = renderHook(() => usePortalData(), { wrapper });
    await expect(result.current.addLeaveRequest({
      employeeId: 'employee-uuid', typeAr: 'unknown', typeEn: 'unknown',
      from: '2026-10-17', to: '2026-10-24', days: 7,
    })).rejects.toThrow('Unknown leave type');
    expect(state.inserts).toHaveLength(0);
  });
});