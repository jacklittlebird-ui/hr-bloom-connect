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

(globalThis as any).__amc = { registry: 0, assignment: 0, maintenance: 0, reports: 0 };
(globalThis as any).__aapi = 0;

vi.mock('@/components/assets/AssetRegistry', () => ({
  AssetRegistry: () => { (globalThis as any).__amc.registry++; (globalThis as any).__aapi++; return <div data-testid="tab-registry" />; },
}));
vi.mock('@/components/assets/AssetAssignment', () => ({
  AssetAssignment: () => { (globalThis as any).__amc.assignment++; (globalThis as any).__aapi++; return <div data-testid="tab-assignment" />; },
}));
vi.mock('@/components/assets/AssetMaintenance', () => ({
  AssetMaintenance: () => { (globalThis as any).__amc.maintenance++; (globalThis as any).__aapi++; return <div data-testid="tab-maintenance" />; },
}));
vi.mock('@/components/assets/AssetReports', () => ({
  AssetReports: () => { (globalThis as any).__amc.reports++; (globalThis as any).__aapi++; return <div data-testid="tab-reports" />; },
}));

import { LanguageProvider } from '@/contexts/LanguageContext';
import Assets from '@/pages/Assets';

const TABS = ['registry', 'assignment', 'maintenance', 'reports'] as const;

const switchTab = async (value: string) => {
  const trigger = screen.getAllByRole('tab').find(el => (el.id || '').endsWith(`-trigger-${value}`)) as HTMLElement;
  expect(trigger).toBeTruthy();
  await act(async () => {
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.mouseDown(trigger, { button: 0 });
    fireEvent.click(trigger);
  });
};

const reset = () => {
  (globalThis as any).__amc = { registry: 0, assignment: 0, maintenance: 0, reports: 0 };
  (globalThis as any).__aapi = 0;
};

describe('Assets — refresh covers all 4 tabs with a single toast', () => {
  beforeEach(() => { toastSpy.mockClear(); reset(); });

  it('rapid clicks → 1 toast, 1 banner, refreshKey remounts every visited tab', async () => {
    render(<LanguageProvider><Assets /></LanguageProvider>);

    const triggers = screen.getAllByRole('tab');
    expect(triggers.length).toBe(4);
    for (const v of TABS) {
      expect(triggers.find(el => (el.id || '').endsWith(`-trigger-${v}`)), v).toBeTruthy();
    }

    // Visit every tab once so each component has been mounted
    for (const v of TABS) {
      await switchTab(v);
      await screen.findByTestId(`tab-${v}`);
    }

    const mc = (globalThis as any).__amc;
    const before: Record<string, number> = { ...mc };
    const apiBefore = (globalThis as any).__aapi;

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;
    await act(async () => { for (let i = 0; i < 12; i++) fireEvent.click(refreshBtn); });

    expect(refreshBtn.disabled).toBe(true);
    const banners = screen.getAllByRole('status');
    expect(banners.length).toBe(1);
    expect(banners[0].textContent).toMatch(/تحديث|Refreshing/);

    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    // Single toast despite 12 clicks
    const toasts = toastSpy.mock.calls.filter(([a]) => a?.title);
    expect(toasts.length).toBe(1);
    expect(toasts[0][0].variant).not.toBe('destructive');

    // Registry stays mounted → MUST have remounted via refreshKey
    expect(mc.registry).toBeGreaterThan(before.registry);

    // Visit the conditional tabs → each remounts via new refreshKey
    for (const v of TABS) {
      if (v === 'registry') continue;
      await switchTab(v);
      await waitFor(() => expect(mc[v]).toBeGreaterThan(before[v]));
      expect(mc[v], `${v} remounted after refresh`).toBeGreaterThan(before[v]);
    }

    const apiAfter = (globalThis as any).__aapi;
    const delta = apiAfter - apiBefore;
    expect(delta).toBeGreaterThanOrEqual(4); // every tab refetched at least once
    expect(delta).toBeLessThanOrEqual(12); // no runaway from 12 rapid clicks
  });

  it('sequential refresh cycles produce N toasts (one per cycle)', async () => {
    render(<LanguageProvider><Assets /></LanguageProvider>);
    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;

    for (let cycle = 1; cycle <= 3; cycle++) {
      await act(async () => { for (let i = 0; i < 5; i++) fireEvent.click(refreshBtn); });
      await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
      expect(toastSpy.mock.calls.filter(([a]) => a?.title).length).toBe(cycle);
    }
  });
});
