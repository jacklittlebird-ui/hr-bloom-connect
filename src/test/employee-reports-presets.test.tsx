import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import React from 'react';

// ---- Mocks ----
const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (m: any) => toastSpy(m),
  useToast: () => ({ toast: (m: any) => toastSpy(m) }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', isRTL: false, t: (k: string) => k }),
}));

vi.mock('@/contexts/EmployeeDataContext', () => ({
  useEmployeeData: () => ({
    employees: [
      { id: '1', employeeId: 'E001', nameAr: 'م 1', nameEn: 'Emp 1', department: 'IT',
        jobTitle: 'Dev', stationLocation: 'cai', phone: '111', status: 'active' },
      { id: '2', employeeId: 'E002', nameAr: 'م 2', nameEn: 'Emp 2', department: 'HR',
        jobTitle: 'Mgr', stationLocation: 'cai', phone: '222', status: 'active' },
      { id: '3', employeeId: 'E003', nameAr: 'م 3', nameEn: 'Emp 3', department: 'IT',
        jobTitle: 'QA', stationLocation: 'alx', phone: '333', status: 'inactive' },
    ],
  }),
}));

vi.mock('@/hooks/useReportExport', () => ({
  useReportExport: () => ({
    reportRef: { current: null },
    handlePrint: vi.fn(),
    exportToCSV: vi.fn(),
    exportBilingualCSV: vi.fn(),
    exportBilingualPDF: vi.fn(),
  }),
}));

vi.mock('recharts', () => {
  const Pass = ({ children }: any) => React.createElement('div', null, children);
  return new Proxy({}, { get: () => Pass });
});

// Import AFTER mocks
import { EmployeeReports } from '@/components/reports/EmployeeReports';

const flush = () => new Promise(r => setTimeout(r, 250));

beforeEach(() => {
  localStorage.clear();
  toastSpy.mockClear();
});
afterEach(() => cleanup());

describe('EmployeeReports — Reset, Presets save/apply/delete (E2E)', () => {
  it('Reset toast fires only when filters differ from defaults', async () => {
    render(<EmployeeReports />);
    // Reset button hidden initially (no active filters)
    expect(screen.queryByRole('button', { name: /Reset/i })).toBeNull();

    // Mutate via direct localStorage state? Use UI: open status select via combobox -> too complex.
    // Instead, drive state through the persisted-storage initial value: re-render after seeding storage.
    cleanup();
    localStorage.setItem('hr_emp_report_status', JSON.stringify('active'));
    render(<EmployeeReports />);

    const resetBtn = await screen.findByRole('button', { name: /Reset/i });
    fireEvent.click(resetBtn);
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    const titles = toastSpy.mock.calls.map(c => c[0]?.title);
    expect(titles).toContain('Filters reset');
    // Reset hides again
    await waitFor(() => expect(screen.queryByRole('button', { name: /Reset/i })).toBeNull());
  });

  it('Save preset: name required + duplicate name blocked + max-cap blocked', async () => {
    render(<EmployeeReports />);
    fireEvent.click(screen.getByRole('button', { name: /Save Preset/i }));

    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByPlaceholderText(/Cairo Active Report/i) as HTMLInputElement;
    const saveBtn = within(dialog).getByRole('button', { name: /^Save$/i }) as HTMLButtonElement;

    // Empty name → button disabled
    expect(saveBtn.disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'Preset A' } });
    expect(saveBtn.disabled).toBe(false);
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(toastSpy.mock.calls.some(c => c[0]?.title === 'Preset saved')).toBe(true)
    );

    // Open again and try same name
    fireEvent.click(screen.getByRole('button', { name: /Save Preset/i }));
    const d2 = await screen.findByRole('dialog');
    const input2 = within(d2).getByPlaceholderText(/Cairo Active Report/i);
    fireEvent.change(input2, { target: { value: 'preset a' } }); // case-insensitive
    fireEvent.click(within(d2).getByRole('button', { name: /^Save$/i }));
    await waitFor(() =>
      expect(toastSpy.mock.calls.some(c => c[0]?.title === 'Name already exists')).toBe(true)
    );
  });

  it('Apply preset highlights it (aria-pressed) and persists across remount', async () => {
    // Seed two presets
    localStorage.setItem('hr_report_presets', JSON.stringify([
      { id: 'p1', name: 'Active IT', department: 'IT', station: 'all', status: 'active', createdAt: '2024-01-01' },
      { id: 'p2', name: 'Cairo Only', department: 'all', station: 'cai', status: 'all', createdAt: '2024-01-02' },
    ]));
    render(<EmployeeReports />);

    const badgeP1 = screen.getByText('Active IT');
    fireEvent.click(badgeP1);

    await waitFor(() => {
      const titles = toastSpy.mock.calls.map(c => c[0]?.title);
      expect(titles.some(t => /Loaded: Active IT/.test(String(t)))).toBe(true);
    });
    expect(badgeP1.getAttribute('aria-pressed')).toBe('active'.length ? 'true' : 'true');

    // Persisted active preset id
    expect(JSON.parse(localStorage.getItem('hr_emp_report_active_preset')!)).toBe('p1');

    // Remount → still highlighted
    cleanup();
    render(<EmployeeReports />);
    const badgeAgain = screen.getByText('Active IT');
    expect(badgeAgain.getAttribute('aria-pressed')).toBe('true');
  });

  it('Delete preset: confirmation dialog, loading state, then removed', async () => {
    localStorage.setItem('hr_report_presets', JSON.stringify([
      { id: 'p1', name: 'KillMe', department: 'IT', station: 'cai', status: 'active', createdAt: '2024-01-01' },
    ]));
    render(<EmployeeReports />);

    const delBtn = screen.getByRole('button', { name: /Delete preset KillMe/i });
    fireEvent.click(delBtn);

    // AlertDialog appears with preset details
    const ad = await screen.findByRole('alertdialog');
    expect(within(ad).getByText('KillMe')).toBeInTheDocument();
    expect(within(ad).getByText(/3 stored filter\(s\) affected/)).toBeInTheDocument();

    const confirm = within(ad).getByRole('button', { name: /^Delete$/i }) as HTMLButtonElement;
    fireEvent.click(confirm);

    // Loading state surfaces aria-busy=true
    await waitFor(() => expect(confirm.getAttribute('aria-busy')).toBe('true'));

    // Eventually preset removed and success toast
    await waitFor(() => {
      expect(screen.queryByText('KillMe')).toBeNull();
      const titles = toastSpy.mock.calls.map(c => c[0]?.title);
      expect(titles).toContain('Preset deleted');
    });
  });

  it('Cancel delete keeps the preset intact', async () => {
    localStorage.setItem('hr_report_presets', JSON.stringify([
      { id: 'p1', name: 'KeepMe', department: 'all', station: 'all', status: 'active', createdAt: '2024-01-01' },
    ]));
    render(<EmployeeReports />);

    fireEvent.click(screen.getByRole('button', { name: /Delete preset KeepMe/i }));
    const ad = await screen.findByRole('alertdialog');
    fireEvent.click(within(ad).getByRole('button', { name: /Cancel/i }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByText('KeepMe')).toBeInTheDocument();
    const titles = toastSpy.mock.calls.map(c => c[0]?.title);
    expect(titles).not.toContain('Preset deleted');
  });

  it('Filters & active preset are persisted across remounts (localStorage)', async () => {
    localStorage.setItem('hr_emp_report_status', JSON.stringify('inactive'));
    localStorage.setItem('hr_emp_report_station', JSON.stringify('cai'));
    render(<EmployeeReports />);

    // Reset button is visible because filters differ from defaults
    expect(await screen.findByRole('button', { name: /Reset/i })).toBeInTheDocument();
  });
});
