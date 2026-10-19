import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PortalLeaves } from '@/components/portal/sections/PortalLeaves';

const spies = vi.hoisted(() => ({ addLeaveRequest: vi.fn(), error: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'ar' }) }));
vi.mock('@/hooks/usePortalEmployee', () => ({ usePortalEmployee: () => 'employee-uuid' }));
vi.mock('sonner', () => ({ toast: { error: spies.error, success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock('@/contexts/PortalDataContext', () => ({
  usePortalData: () => ({
    getLeaveBalances: () => [{ typeEn: 'Annual', typeAr: 'سنوية', remaining: 0, total: 0, used: 0 }],
    getLeaveRequests: () => [], getPermissions: () => [], getOvertimeDays: () => [],
    ensureLeaves: vi.fn(), addLeaveRequest: spies.addLeaveRequest,
  }),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => <select aria-label="leave type" value={value} onChange={e => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: () => <option value="">Select</option>, SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <>{children}</>,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
  PopoverContent: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect }: any) => <input aria-label="leave date" type="date" value={selected ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}` : ''} onChange={e => onSelect(new Date(`${e.target.value}T00:00:00`))} />,
}));

describe('Employee marriage leave submission', () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); spies.addLeaveRequest.mockResolvedValue(undefined); });
  const fillRequest = (end: string) => {
    render(<PortalLeaves />);
    fireEvent.click(screen.getByRole('button', { name: 'طلب إجازة' }));
    fireEvent.change(screen.getByLabelText('leave type'), { target: { value: 'marriage' } });
    const dates = screen.getAllByLabelText('leave date');
    fireEvent.change(dates[0], { target: { value: '2026-10-17' } });
    fireEvent.change(dates[1], { target: { value: end } });
    fireEvent.change(screen.getByPlaceholderText('أدخل سبب الإجازة'), { target: { value: 'زواج' } });
    fireEvent.click(screen.getByRole('button', { name: 'تقديم الطلب' }));
  };
  it('saves seven counted days for Saturday-to-Saturday even with zero annual balance', async () => {
    fillRequest('2026-10-24');
    await waitFor(() => expect(spies.addLeaveRequest).toHaveBeenCalledWith({
      employeeId: 'employee-uuid', typeAr: 'زواج', typeEn: 'Marriage',
      from: '2026-10-17', to: '2026-10-24', days: 7,
    }));
    expect(spies.error).not.toHaveBeenCalled();
  });
  it('does not save a request with eight days after excluding Friday', () => {
    fillRequest('2026-10-25');
    expect(spies.addLeaveRequest).not.toHaveBeenCalled();
    expect(spies.error).toHaveBeenCalledTimes(1);
  });
});