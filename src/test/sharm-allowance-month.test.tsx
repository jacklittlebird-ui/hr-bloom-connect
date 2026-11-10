import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SharmAllowances from '@/components/salaries/SharmAllowances';

const state = vi.hoisted(() => ({
  writes: [] as { table: string; payload: any }[],
  dates: [] as [string, string][],
  eligibleIds: [] as string[][],
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'admin-id' } } }) },
  rpc: async (_name: string, args: { p_ids: string[] }) => {
    state.eligibleIds.push(args.p_ids);
    return { data: ['eligible-employee'], error: null };
  },
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, in: () => query, order: () => query,
      gte: (_key: string, value: string) => { state.dates.push(['start', value]); return query; },
      lte: (_key: string, value: string) => { state.dates.push(['end', value]); return query; },
      single: async () => ({ data: { id: 'sharm-station' }, error: null }),
      range: async () => ({ data: table === 'employees'
        ? [{ id: 'eligible-employee', employee_code: 'emp001', name_ar: 'Eligible' },
          { id: 'no-allowance', employee_code: 'emp002', name_ar: 'Not eligible' }]
        : [{ id: 'attendance-1', employee_id: 'eligible-employee', date: '2026-10-01' }], error: null }),
      upsert: async (payload: any) => { state.writes.push({ table, payload }); return { error: null }; },
    };
    return query;
  },
} }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); state.writes = []; state.dates = []; state.eligibleIds = []; });

describe('Sharm selected payroll month', () => {
  it('writes October allowances and the October prerequisite from a November run date', async () => {
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('2026-11-10');
    render(<SharmAllowances />);
    const run = screen.getByRole('button', { name: 'تشغيل بدلات شرم' });
    expect(run).toBeDisabled();
    fireEvent.change(screen.getByLabelText('شهر البدلات'), { target: { value: '2026-10' } });
    expect(run).toBeEnabled();
    fireEvent.click(run);
    await waitFor(() => expect(state.writes).toHaveLength(2));
    expect(state.dates).toEqual([['start', '2026-09-26'], ['end', '2026-10-25']]);
    expect(state.writes[0]).toEqual({ table: 'living_allowances', payload: [{
      employee_id: 'eligible-employee', amount: 350, allowance_month: '2026-10', status: 'pending', uploaded_by: 'admin-id',
    }] });
    expect(state.writes[1].table).toBe('sharm_allowance_runs');
    expect(state.writes[1].payload).toMatchObject({ run_month: '2026-10', employees_count: 1, total_amount: 350 });
    expect(screen.getByText('Eligible')).toBeInTheDocument();
    expect(screen.queryByText('Not eligible')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('شهر البدلات'), { target: { value: '2026-09' } });
    expect(screen.queryByText('Eligible')).not.toBeInTheDocument();
  });
});