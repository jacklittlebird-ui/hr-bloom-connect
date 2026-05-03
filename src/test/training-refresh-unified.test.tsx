import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (a: any) => toastSpy(a),
  useToast: () => ({ toast: toastSpy, dismiss: () => {}, toasts: [] }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/training/BulkTrainingImport', () => ({ BulkTrainingImport: () => <div /> }));
vi.mock('@/components/training/TrainingStatsCards', () => ({ TrainingStatsCards: () => <div data-testid="stats" /> }));
vi.mock('@/components/training/TrainingRecords', () => ({ TrainingRecords: () => <div data-testid="tab-records" /> }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import Training from '@/pages/Training';

describe('Training — unified refresh banner & single toast across 7 tabs', () => {
  beforeEach(() => toastSpy.mockClear());

  it('shows banner during refresh and emits a single success toast for rapid clicks', async () => {
    render(
      <LanguageProvider>
        <Training />
      </LanguageProvider>,
    );

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;

    await act(async () => {
      for (let i = 0; i < 6; i++) fireEvent.click(refreshBtn);
    });

    expect(refreshBtn.disabled).toBe(true);
    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/تحديث|Refreshing/);

    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    const successes = toastSpy.mock.calls.filter(([a]) => a?.variant !== 'destructive' && a?.title);
    expect(successes.length).toBe(1);
  });
});
