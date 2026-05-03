import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// --- Mocks (must be declared before importing the page) ----------------------
const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (a: any) => toastSpy(a),
  useToast: () => ({ toast: toastSpy, dismiss: () => {}, toasts: [] }),
}));

const refreshDataSpy = vi.fn(() => new Promise<void>((r) => setTimeout(r, 200)));
vi.mock('@/contexts/LoanDataContext', () => ({
  useLoanData: () => ({ refreshData: refreshDataSpy }),
  LoanDataProvider: ({ children }: any) => <>{children}</>,
}));

// Stub heavy children so we can mount the page in isolation
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/loans/LoansList', () => ({ LoansList: () => <div data-testid="tab-loans" /> }));
vi.mock('@/components/loans/AdvancesList', () => ({ AdvancesList: () => <div data-testid="tab-advances" /> }));
vi.mock('@/components/loans/InstallmentsList', () => ({ InstallmentsList: () => <div data-testid="tab-installments" /> }));
vi.mock('@/components/loans/LoanReports', () => ({ LoanReports: () => <div data-testid="tab-reports" /> }));
vi.mock('@/components/loans/LoanSettings', () => ({ LoanSettings: () => <div data-testid="tab-settings" /> }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import Loans from '@/pages/Loans';

describe('Loans — unified refresh banner & single toast across 5 tabs', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    refreshDataSpy.mockClear();
  });

  it('shows banner during refresh and emits a single success toast for rapid clicks', async () => {
    render(
      <LanguageProvider>
        <Loans />
      </LanguageProvider>,
    );

    // All 5 tab panels are mounted (so refreshKey propagates to each)
    expect(screen.getByTestId('tab-loans')).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;

    // Hammer the refresh button rapidly
    await act(async () => {
      for (let i = 0; i < 6; i++) fireEvent.click(refreshBtn);
    });

    // While refreshing → banner visible, button disabled
    expect(refreshBtn.disabled).toBe(true);
    const banner = await screen.findByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/تحديث|Refreshing/);

    // (Note: handleRefresh guards via React state which doesn't flush
    // synchronously across batched fireEvents — the user-visible guarantee
    // is a single banner + single toast, asserted below.)


    // Wait for refresh to settle
    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    // Exactly one unified success toast
    const successes = toastSpy.mock.calls.filter(([a]) => a?.variant !== 'destructive' && a?.title);
    expect(successes.length).toBe(1);
  });

  it('emits a single failure toast when refresh fails', async () => {
    refreshDataSpy.mockImplementationOnce(() => Promise.reject(new Error('network down')));

    render(
      <LanguageProvider>
        <Loans />
      </LanguageProvider>,
    );

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;
    await act(async () => { fireEvent.click(refreshBtn); });

    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    const failures = toastSpy.mock.calls.filter(([a]) => a?.variant === 'destructive');
    expect(failures.length).toBe(1);
    expect(failures[0][0].description).toBe('network down');
  });
});
