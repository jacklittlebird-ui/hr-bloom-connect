import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LoanSettings } from '@/components/loans/LoanSettings';

// Spy on toast so we can count successful saves
const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (args: any) => toastSpy(args),
  useToast: () => ({ toast: toastSpy, dismiss: () => {}, toasts: [] }),
}));

describe('LoanSettings — prevents double submission', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    vi.useRealTimers();
  });

  it('emits at most one save toast even when the Save button is clicked many times rapidly', async () => {
    render(
      <LanguageProvider>
        <LoanSettings />
      </LanguageProvider>,
    );

    const saveBtn = screen.getByTestId('loan-settings-save') as HTMLButtonElement;
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn.disabled).toBe(false);

    // Hammer the button — no critical fields changed → save runs immediately
    await act(async () => {
      for (let i = 0; i < 8; i++) fireEvent.click(saveBtn);
    });

    // While in-flight, button must be disabled
    expect(saveBtn.disabled).toBe(true);

    // Wait for the simulated async save (setTimeout 400ms) to complete
    await waitFor(() => expect(saveBtn.disabled).toBe(false), { timeout: 2000 });

    // Exactly one success toast should have been emitted
    const successToasts = toastSpy.mock.calls.filter(([arg]) => {
      const title = String(arg?.title ?? '');
      return arg?.variant !== 'destructive' && title.length > 0;
    });
    expect(successToasts.length).toBe(1);
  });
});
