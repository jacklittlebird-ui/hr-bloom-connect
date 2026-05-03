import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LoanSettings } from '@/components/loans/LoanSettings';

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (args: any) => toastSpy(args),
  useToast: () => ({ toast: toastSpy, dismiss: () => {}, toasts: [] }),
}));

describe('LoanSettings — critical changes confirmation AlertDialog', () => {
  beforeEach(() => toastSpy.mockClear());

  it('opens confirmation dialog and blocks save until user confirms', async () => {
    render(
      <LanguageProvider>
        <LoanSettings />
      </LanguageProvider>,
    );

    // Change a critical field: advanceMaxPercent (general settings input)
    const numberInputs = document.querySelectorAll('input[type="number"]');
    expect(numberInputs.length).toBeGreaterThan(1);
    // Index 1 = advanceMaxPercent (after maxConcurrentLoans)
    const advancePercentInput = numberInputs[1] as HTMLInputElement;
    await act(async () => {
      fireEvent.change(advancePercentInput, { target: { value: '75' } });
    });

    const saveBtn = screen.getByTestId('loan-settings-save') as HTMLButtonElement;
    await act(async () => { fireEvent.click(saveBtn); });

    // Confirmation dialog must appear, NO save toast yet
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    const successToasts = toastSpy.mock.calls.filter(([a]) => a?.variant !== 'destructive');
    expect(successToasts.length).toBe(0);

    // Cancel — still no save
    const cancelBtn = screen.getByText(/إلغاء|Cancel/);
    await act(async () => { fireEvent.click(cancelBtn); });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(toastSpy.mock.calls.filter(([a]) => a?.variant !== 'destructive').length).toBe(0);

    // Click Save again, then Confirm
    await act(async () => { fireEvent.click(saveBtn); });
    await screen.findByRole('alertdialog');
    const confirmBtn = screen.getByText(/تأكيد الحفظ|Confirm & Save/);
    await act(async () => { fireEvent.click(confirmBtn); });

    // After confirmation, exactly one success toast
    await waitFor(() => {
      const successes = toastSpy.mock.calls.filter(([a]) => a?.variant !== 'destructive' && a?.title);
      expect(successes.length).toBe(1);
    }, { timeout: 2000 });
  });
});
