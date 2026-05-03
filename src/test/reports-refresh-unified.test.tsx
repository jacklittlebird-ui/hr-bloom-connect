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

// Track mount counts on global to survive vi.mock hoisting
(globalThis as any).__mountCounts = (globalThis as any).__mountCounts || {};
const mountCounts: Record<string, number> = (globalThis as any).__mountCounts;

const inlineMock = (name: string) => () => {
  const ReactLib = require('react');
  const Comp = () => {
    ReactLib.useEffect(() => {
      const c = ((globalThis as any).__mountCounts ||= {});
      c[name] = (c[name] || 0) + 1;
    }, []);
    return ReactLib.createElement('div', { 'data-testid': `report-${name}` }, name);
  };
  return { [name]: Comp, default: Comp };
};

// NOTE: factories must be self-contained because vi.mock is hoisted; we inline a helper inside each.
vi.mock('@/components/reports/EmployeeReports', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['EmployeeReports'] = (c['EmployeeReports']||0)+1; }, []); return R.createElement('div', null, 'EmployeeReports'); };
  return { EmployeeReports: C };
});
vi.mock('@/components/reports/AttendanceReportsTab', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['AttendanceReportsTab'] = (c['AttendanceReportsTab']||0)+1; }, []); return R.createElement('div', null, 'AttendanceReportsTab'); };
  return { AttendanceReportsTab: C };
});
vi.mock('@/components/reports/StationAttendanceReport', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['StationAttendanceReport'] = (c['StationAttendanceReport']||0)+1; }, []); return R.createElement('div', null, 'StationAttendanceReport'); };
  return { StationAttendanceReport: C };
});
vi.mock('@/components/reports/DailyAttendanceReport', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['DailyAttendanceReport'] = (c['DailyAttendanceReport']||0)+1; }, []); return R.createElement('div', null, 'DailyAttendanceReport'); };
  return { DailyAttendanceReport: C };
});
vi.mock('@/components/reports/LeaveReports', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['LeaveReports'] = (c['LeaveReports']||0)+1; }, []); return R.createElement('div', null, 'LeaveReports'); };
  return { LeaveReports: C };
});
vi.mock('@/components/reports/SalaryReports', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['SalaryReports'] = (c['SalaryReports']||0)+1; }, []); return R.createElement('div', null, 'SalaryReports'); };
  return { SalaryReports: C };
});
vi.mock('@/components/reports/PerformanceReports', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['PerformanceReports'] = (c['PerformanceReports']||0)+1; }, []); return R.createElement('div', null, 'PerformanceReports'); };
  return { PerformanceReports: C };
});
vi.mock('@/components/reports/TrainingReports', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['TrainingReports'] = (c['TrainingReports']||0)+1; }, []); return R.createElement('div', null, 'TrainingReports'); };
  return { TrainingReports: C };
});
vi.mock('@/components/reports/TrainingDebtReport', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['TrainingDebtReport'] = (c['TrainingDebtReport']||0)+1; }, []); return R.createElement('div', null, 'TrainingDebtReport'); };
  return { TrainingDebtReport: C };
});
vi.mock('@/components/reports/UniformReport', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['UniformReport'] = (c['UniformReport']||0)+1; }, []); return R.createElement('div', null, 'UniformReport'); };
  return { UniformReport: C };
});
vi.mock('@/components/reports/TrainingQualificationReport', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['TrainingQualificationReport'] = (c['TrainingQualificationReport']||0)+1; }, []); return R.createElement('div', null, 'TrainingQualificationReport'); };
  return { TrainingQualificationReport: C };
});
vi.mock('@/components/training/TrainingRecordsReport', () => {
  const R = require('react');
  const C = () => { R.useEffect(() => { const c = ((globalThis as any).__mountCounts ||= {}); c['TrainingRecordsReport'] = (c['TrainingRecordsReport']||0)+1; }, []); return R.createElement('div', null, 'TrainingRecordsReport'); };
  return { TrainingRecordsReport: C };
});

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
    render(<Reports />);
    await waitFor(() => expect(mountCounts['EmployeeReports']).toBe(1));
    const btn = screen.getByLabelText('Refresh');

    // Force the success path to throw exactly once → triggers catch → toast.error
    sonnerSpy.success.mockImplementationOnce(() => { throw new Error('toast failed'); });

    await act(async () => { fireEvent.click(btn); });
    await flush(600);

    expect(sonnerSpy.error).toHaveBeenCalledTimes(1);
    // refreshKey bumped exactly once → at most one extra remount
    expect(mountCounts['EmployeeReports']).toBeLessThanOrEqual(2);
    // Refresh button is re-enabled and banner cleared even on error
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('switching tabs during a refresh only mounts the newly active tab (no over-remount)', async () => {
    render(<Reports />);
    await waitFor(() => expect(mountCounts['EmployeeReports']).toBe(1));

    const btn = screen.getByLabelText('Refresh');
    // Start refresh
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByRole('status')).toBeInTheDocument();

    // While refreshing, switch to a different tab. Radix Tabs activate on pointerDown+mouseDown+click.
    const leavesTab = screen.getByRole('tab', { name: /leaves/i });
    await act(async () => {
      fireEvent.pointerDown(leavesTab, { button: 0 });
      fireEvent.mouseDown(leavesTab, { button: 0 });
      fireEvent.click(leavesTab);
    });

    await flush(600);

    // EmployeeReports remounted at most once due to refreshKey bump
    expect(mountCounts['EmployeeReports']).toBeLessThanOrEqual(2);
    // The newly activated tab mounted exactly once (no over-remount across refresh cycle)
    expect(mountCounts['LeaveReports']).toBe(1);
    // Tabs the user never visited remain unmounted
    expect(mountCounts['PerformanceReports']).toBeUndefined();
    expect(mountCounts['UniformReport']).toBeUndefined();
    // Single success toast for the refresh cycle
    expect(sonnerSpy.success).toHaveBeenCalledTimes(1);
  });

  it('rapid Refresh clicks trigger only one refresh cycle (single setRefreshKey bump per cycle)', async () => {
    render(<Reports />);
    await waitFor(() => expect(mountCounts['EmployeeReports']).toBe(1));
    const btn = screen.getByLabelText('Refresh');

    await act(async () => {
      for (let i = 0; i < 8; i++) fireEvent.click(btn);
    });
    await flush(600);

    // Exactly one extra remount of the active tab → proves only one refreshKey bump
    expect(mountCounts['EmployeeReports']).toBe(2);
    expect(sonnerSpy.success).toHaveBeenCalledTimes(1);
    expect(sonnerSpy.error).not.toHaveBeenCalled();
  });

  it('verifies success/error toast text and role="status" banner text & lifecycle', async () => {
    render(<Reports />);
    const btn = screen.getByLabelText('Refresh') as HTMLButtonElement;

    // Success scenario — English (mocked language='en')
    await act(async () => { fireEvent.click(btn); });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/Refreshing all reports/i);
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(btn.disabled).toBe(true);

    await flush(600);
    expect(sonnerSpy.success).toHaveBeenCalledWith('Reports refreshed');
    expect(screen.queryByRole('status')).toBeNull();
    expect(btn.disabled).toBe(false);

    // Error scenario — force toast.success to throw → catch path fires toast.error
    sonnerSpy.success.mockImplementationOnce(() => { throw new Error('fail'); });
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByRole('status')).toBeInTheDocument();
    await flush(600);
    expect(sonnerSpy.error).toHaveBeenCalledWith('Refresh failed');
    expect(screen.queryByRole('status')).toBeNull();
    expect(btn.disabled).toBe(false);
  });
});
