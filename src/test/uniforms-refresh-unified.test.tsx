import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within, cleanup } from '@testing-library/react';
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

const refreshUniformsMock = vi.fn(async () => {
  await new Promise(r => setTimeout(r, 50));
});
const updateUniformMock = vi.fn(async () => {
  await new Promise(r => setTimeout(r, 30));
});
const deleteUniformMock = vi.fn(async () => {
  await new Promise(r => setTimeout(r, 20));
});
const addUniformMock = vi.fn(async () => { await new Promise(r => setTimeout(r, 10)); });

const sampleUniforms = [
  { id: 1, employeeId: 'emp-1', typeAr: 'قميص أبيض', typeEn: 'White Shirt', quantity: 3, unitPrice: 100, totalPrice: 300, deliveryDate: new Date().toISOString().slice(0, 10), notes: '' },
  { id: 2, employeeId: 'emp-1', typeAr: 'بنطلون كحلي', typeEn: 'Navy Pants', quantity: 2, unitPrice: 150, totalPrice: 300, deliveryDate: new Date().toISOString().slice(0, 10), notes: '' },
];

vi.mock('@/contexts/UniformDataContext', async () => {
  const actual: any = await vi.importActual('@/contexts/UniformDataContext');
  return {
    ...actual,
    useUniformData: () => ({
      uniforms: sampleUniforms,
      refreshUniforms: refreshUniformsMock,
      addUniform: addUniformMock,
      updateUniform: updateUniformMock,
      deleteUniform: deleteUniformMock,
      getEmployeeUniforms: () => sampleUniforms,
    }),
  };
});

vi.mock('@/contexts/EmployeeDataContext', () => ({
  useEmployeeData: () => ({
    employees: [{ id: 'emp-1', employeeId: 'E001', nameAr: 'موظف', nameEn: 'Emp', status: 'active', stationLocation: '', department: '' }],
  }),
}));

vi.mock('@/hooks/useReportExport', () => ({
  useReportExport: () => ({ reportRef: { current: null }, handlePrint: vi.fn(), exportToCSV: vi.fn() }),
}));

vi.mock('@/hooks/usePagination', () => ({
  usePagination: (items: any[]) => ({
    paginatedItems: items, currentPage: 1, totalPages: 1, totalItems: items.length,
    startIndex: 0, endIndex: items.length, setCurrentPage: () => {},
  }),
}));

import { LanguageProvider } from '@/contexts/LanguageContext';
import Uniforms from '@/pages/Uniforms';

const reset = () => {
  cleanup();
  refreshUniformsMock.mockClear();
  updateUniformMock.mockClear();
  deleteUniformMock.mockClear();
  addUniformMock.mockClear();
  sonnerSpy.success.mockClear();
  sonnerSpy.error.mockClear();
  sonnerSpy.message.mockClear();
};

describe('Uniforms — unified refresh + safe edit/delete', () => {
  beforeEach(reset);

  it('rapid clicks on Refresh → 1 toast, 1 banner, single refreshUniforms call', async () => {
    render(<LanguageProvider><Uniforms /></LanguageProvider>);

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;
    const tabsBefore = screen.getAllByRole('tab').length;
    expect(tabsBefore).toBe(2);

    await act(async () => { for (let i = 0; i < 12; i++) fireEvent.click(refreshBtn); });

    expect(refreshBtn.disabled).toBe(true);
    const banners = screen.getAllByRole('status');
    expect(banners.length).toBe(1);

    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    expect(refreshUniformsMock).toHaveBeenCalledTimes(1);
    expect(sonnerSpy.success).toHaveBeenCalledTimes(1);
  });

  it('sequential refresh cycles each emit exactly 1 success toast', async () => {
    render(<LanguageProvider><Uniforms /></LanguageProvider>);
    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;

    for (let cycle = 1; cycle <= 3; cycle++) {
      await act(async () => { for (let i = 0; i < 5; i++) fireEvent.click(refreshBtn); });
      await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
      expect(sonnerSpy.success).toHaveBeenCalledTimes(cycle);
      expect(refreshUniformsMock).toHaveBeenCalledTimes(cycle);
    }
  });

  it('Delete: dialog appears only on trash click; no delete until Confirm; identifies item', async () => {
    render(<LanguageProvider><Uniforms /></LanguageProvider>);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deleteUniformMock).not.toHaveBeenCalled();

    // Click first row's delete (Trash) icon — only row action buttons have h-8 w-8 + text-destructive
    const trashButtons = screen.getAllByRole('button').filter(b => b.className.includes('h-8 w-8') && b.className.includes('text-destructive'));
    expect(trashButtons.length).toBeGreaterThan(0);
    await act(async () => { fireEvent.click(trashButtons[0]); });

    const dialog = await screen.findByRole('alertdialog');
    // Item details are shown
    const details = within(dialog).getByTestId('delete-item-details');
    expect(details.textContent).toMatch(/قميص أبيض|White Shirt/);
    expect(details.textContent).toContain('3'); // quantity

    // Cancel does not delete
    fireEvent.click(within(dialog).getByRole('button', { name: /إلغاء|Cancel/ }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(deleteUniformMock).not.toHaveBeenCalled();

    // Re-open and confirm
    await act(async () => { fireEvent.click(trashButtons[0]); });
    const dialog2 = await screen.findByRole('alertdialog');
    await act(async () => {
      fireEvent.click(within(dialog2).getByRole('button', { name: /^حذف$|^Delete$/ }));
    });
    await waitFor(() => expect(deleteUniformMock).toHaveBeenCalledTimes(1));
    expect(deleteUniformMock).toHaveBeenCalledWith(1);
  });

  it('Refresh is blocked while a save/edit operation is in progress', async () => {
    render(<LanguageProvider><Uniforms /></LanguageProvider>);

    // Capture the page-level Refresh button BEFORE opening the modal (Radix sets aria-hidden on outer content)
    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;

    // Open Edit dialog on first row
    const editButtons = screen.getAllByRole('button').filter(b => b.className.includes('h-8 w-8') && b.className.includes('text-primary'));
    await act(async () => { fireEvent.click(editButtons[0]); });
    const editDialog = await screen.findByRole('dialog');
    const saveBtn = within(editDialog).getByRole('button', { name: /^حفظ$|^Save$/ }) as HTMLButtonElement;

    // Click Save (will be in flight ~30ms)
    await act(async () => { fireEvent.click(saveBtn); });
    // Save button should be disabled during the in-flight call
    expect(saveBtn.disabled).toBe(true);

    // While editing is in flight, try clicking Refresh: must NOT trigger refreshUniforms
    expect(refreshBtn.disabled).toBe(true);
    await act(async () => { fireEvent.click(refreshBtn); });
    expect(refreshUniformsMock).not.toHaveBeenCalled();

    await waitFor(() => expect(updateUniformMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(sonnerSpy.success).toHaveBeenCalledTimes(1));
  });

  it('Edit: double-clicking Save still triggers exactly one updateUniform', async () => {
    render(<LanguageProvider><Uniforms /></LanguageProvider>);

    const editButtons = screen.getAllByRole('button').filter(b => b.className.includes('h-8 w-8') && b.className.includes('text-primary'));
    await act(async () => { fireEvent.click(editButtons[0]); });
    const editDialog = await screen.findByRole('dialog');
    const saveBtn = within(editDialog).getByRole('button', { name: /^حفظ$|^Save$|جاري الحفظ|Saving/ }) as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);
    });
    await waitFor(() => expect(updateUniformMock).toHaveBeenCalledTimes(1), { timeout: 1500 });
  });

  it('refreshKey remounts the tabs container exactly once per refresh cycle', async () => {
    cleanup();
    // Drain any stray microtasks/timers from previous tests before measuring
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    refreshUniformsMock.mockClear();
    sonnerSpy.success.mockClear();

    const { container } = render(<LanguageProvider><Uniforms /></LanguageProvider>);
    expect(container.querySelector('[role="tablist"]')).toBeTruthy();

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;
    await act(async () => { for (let i = 0; i < 6; i++) fireEvent.click(refreshBtn); });
    await waitFor(() => expect(refreshBtn.disabled).toBe(false));

    expect(container.querySelector('[role="tablist"]')).toBeTruthy();
    expect(refreshUniformsMock).toHaveBeenCalledTimes(1);
    expect(sonnerSpy.success).toHaveBeenCalledTimes(1);
  });
});
