import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import React from 'react';

// --- Mocks ---
const sonnerSpy = { success: vi.fn(), error: vi.fn(), message: vi.fn() };
vi.mock('sonner', () => ({
  toast: Object.assign((m: any) => sonnerSpy.message(m), {
    success: (m: any) => sonnerSpy.success(m),
    error: (m: any) => sonnerSpy.error(m),
    message: (m: any) => sonnerSpy.message(m),
  }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    t: (k: string) => k,
  }),
}));

// Track mount counts per report subcomponent on global to survive hoisting
(globalThis as any).__mountCounts = (globalThis as any).__mountCounts || {};
const mountCounts: Record<string, number> = (globalThis as any).__mountCounts;

const buildMock = (name: string) => () => {
  const ReactLib = require('react');
  const Comp = () => {
    ReactLib.useEffect(() => {
      const c = (globalThis as any).__mountCounts;
      c[name] = (c[name] || 0) + 1;
    }, []);
    return ReactLib.createElement('div', { 'data-testid': `report-${name}` }, name);
  };
  return { [name]: Comp, default: Comp };
};

vi.mock('@/components/reports/EmployeeReports', buildMock('EmployeeReports'));
vi.mock('@/components/reports/AttendanceReportsTab', buildMock('AttendanceReportsTab'));
vi.mock('@/components/reports/StationAttendanceReport', buildMock('StationAttendanceReport'));
vi.mock('@/components/reports/DailyAttendanceReport', buildMock('DailyAttendanceReport'));
vi.mock('@/components/reports/LeaveReports', buildMock('LeaveReports'));
vi.mock('@/components/reports/SalaryReports', buildMock('SalaryReports'));
vi.mock('@/components/reports/PerformanceReports', buildMock('PerformanceReports'));
vi.mock('@/components/reports/TrainingReports', buildMock('TrainingReports'));
vi.mock('@/components/reports/TrainingDebtReport', buildMock('TrainingDebtReport'));
vi.mock('@/components/reports/UniformReport', buildMock('UniformReport'));
vi.mock('@/components/reports/TrainingQualificationReport', buildMock('TrainingQualificationReport'));
vi.mock('@/components/training/TrainingRecordsReport', buildMock('TrainingRecordsReport'));

import Reports from '@/pages/Reports';

const flush = async (ms = 500) => {
  await act(async () => { await new Promise(r => setTimeout(r, ms)); });
};

describe('Reports — unified refresh E2E', () => {
  beforeEach(() => {
    sonnerSpy.success.mockClear();
    sonnerSpy.error.mockClear();
    sonnerSpy.message.mockClear();
    Object.keys(mountCounts).forEach(k => delete mountCounts[k]);
  });
  afterEach(() => cleanup());

  it('rapid clicks on Refresh produce exactly one success toast per cycle', async () => {
    render(<Reports />);
    const btn = screen.getByLabelText('Refresh');
    await act(async () => {
      fireEvent.click(btn);
      fireEvent.click(btn);
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    await flush(600);
    expect(sonnerSpy.success).toHaveBeenCalledTimes(1);

    // Second cycle after completion -> another single toast
    await act(async () => { fireEvent.click(btn); });
    await flush(600);
    expect(sonnerSpy.success).toHaveBeenCalledTimes(2);
  });

  it('refreshKey remounts the active tab content exactly once per refresh', async () => {
    render(<Reports />);
    // Initial mount of default tab (employees)
    await waitFor(() => expect(mountCounts['EmployeeReports']).toBe(1));

    const btn = screen.getByLabelText('Refresh');
    await act(async () => { fireEvent.click(btn); });
    await flush(600);

    // After refresh, EmployeeReports should be remounted exactly once more
    expect(mountCounts['EmployeeReports']).toBe(2);
  });

  it('disables refresh button and shows role="status" banner during refresh, then clears', async () => {
    render(<Reports />);
    const btn = screen.getByLabelText('Refresh') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();

    await act(async () => { fireEvent.click(btn); });
    // While refreshing
    expect(btn.disabled).toBe(true);
    expect(screen.getByRole('status')).toBeInTheDocument();

    await flush(600);
    expect(btn.disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows an error toast when refresh cycle throws and does not over-remount tabs', async () => {
    // Force the refresh handler internal await to throw via setTimeout patch
    const originalSetTimeout = globalThis.setTimeout;
    let calls = 0;
    const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any, ms?: number) => {
      // Throw inside the awaited timeout used by handleRefresh (~400ms)
      if (ms === 400) {
        calls++;
        return originalSetTimeout(() => {
          try { fn(); } catch {}
          throw new Error('forced');
        }, 0) as any;
      }
      return originalSetTimeout(fn, ms) as any;
    }) as any);

    try {
      render(<Reports />);
      await waitFor(() => expect(mountCounts['EmployeeReports']).toBe(1));
      const btn = screen.getByLabelText('Refresh');

      // Make the awaited promise reject by stubbing once
      const rejectOnce = vi.spyOn(global, 'Promise').mockImplementationOnce(((exec: any) => {
        return new (Promise as any)((_res: any, rej: any) => rej(new Error('refresh failed')));
      }) as any);

      await act(async () => { fireEvent.click(btn); });
      await flush(600);

      rejectOnce.mockRestore();

      expect(sonnerSpy.error).toHaveBeenCalledTimes(1);
      // Tabs remount at most twice (initial + the one triggered before error)
      expect(mountCounts['EmployeeReports']).toBeLessThanOrEqual(2);
    } finally {
      spy.mockRestore();
    }
  });
});
