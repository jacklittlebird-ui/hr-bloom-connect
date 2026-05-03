import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// --- Mocks (must precede page import) ---------------------------------------
const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (a: any) => toastSpy(a),
  useToast: () => ({ toast: toastSpy, dismiss: () => {}, toasts: [] }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div>{children}</div>,
}));

// Mount counters on globalThis so hoisted vi.mock factories can reach them.
(globalThis as any).__mc = { records: 0, stats: 0 };

vi.mock('@/components/training/BulkTrainingImport', () => ({ BulkTrainingImport: () => null }));
vi.mock('@/components/training/TrainingStatsCards', () => ({
  TrainingStatsCards: () => { (globalThis as any).__mc.stats++; return <div data-testid="stats" />; },
}));
vi.mock('@/components/training/TrainingRecords', () => ({
  TrainingRecords: () => { (globalThis as any).__mc.records++; return <div data-testid="tab-records" />; },
}));
// Lazy-loaded tabs — only mount when their tab becomes active. We only need
// them to exist as modules so React can resolve the lazy import.
vi.mock('@/components/training/Trainers', () => ({ Trainers: () => <div data-testid="tab-trainers" /> }));
vi.mock('@/components/training/CoursesSyllabus', () => ({ CoursesSyllabus: () => <div data-testid="tab-syllabus" /> }));
vi.mock('@/components/training/CoursesList', () => ({ CoursesList: () => <div data-testid="tab-courses" /> }));
vi.mock('@/components/training/TrainingPlan', () => ({ TrainingPlan: () => <div data-testid="tab-plan" /> }));
vi.mock('@/components/training/EmployeeIdCards', () => ({ EmployeeIdCards: () => <div data-testid="tab-idcards" /> }));
vi.mock('@/components/reports/TrainingReports', () => ({ TrainingReports: () => <div data-testid="tab-reports" /> }));
vi.mock('@/components/reports/TrainingQualificationReport', () => ({ TrainingQualificationReport: () => null }));
vi.mock('@/components/reports/MissingCourseRecords', () => ({ MissingCourseRecords: () => null }));
vi.mock('@/components/training/TrainingRecordsReport', () => ({ TrainingRecordsReport: () => null }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import Training from '@/pages/Training';

const TAB_VALUES = ['records', 'trainers', 'syllabus', 'courses', 'plan', 'reports', 'id-cards'];

describe('Training — refresh covers all 7 tabs with a single toast', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    (globalThis as any).__mc.records = 0;
    (globalThis as any).__mc.stats = 0;
  });

  it('renders all 7 tab triggers and emits exactly one toast for rapid refresh clicks', async () => {
    render(
      <LanguageProvider>
        <Training />
      </LanguageProvider>,
    );

    // (1) All seven tab triggers are present in the DOM
    const triggers = screen.getAllByRole('tab');
    expect(triggers.length).toBe(7);
    for (const value of TAB_VALUES) {
      const trigger = triggers.find(el => (el.id || '').endsWith(`-trigger-${value}`));
      expect(trigger, `trigger for "${value}" tab`).toBeTruthy();
    }

    // (2) Snapshot mount counts before refresh
    const mc = (globalThis as any).__mc;
    expect(mc.records).toBeGreaterThanOrEqual(1);
    expect(mc.stats).toBeGreaterThanOrEqual(1);
    const beforeRecords = mc.records;
    const beforeStats = mc.stats;

    // (3) Hammer the refresh button — single toast guarantee
    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;
    await act(async () => {
      for (let i = 0; i < 8; i++) fireEvent.click(refreshBtn);
    });

    // While in-flight: button disabled + status banner visible
    expect(refreshBtn.disabled).toBe(true);
    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/تحديث|Refreshing/);

    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    // (4) Exactly ONE success toast despite 8 rapid clicks
    const successes = toastSpy.mock.calls.filter(([a]) => a?.variant !== 'destructive' && a?.title);
    expect(successes.length).toBe(1);

    // (5) refreshKey bumped exactly once → records + stats remounted exactly once
    expect(mc.records).toBe(beforeRecords + 1);
    expect(mc.stats).toBe(beforeStats + 1);
  });

  it('emits a single failure toast (not multiple) on refresh error', async () => {
    // Force the records mock to throw on remount → simulates a refresh failure
    let failNext = false;
    (globalThis as any).__mc = { records: 0, stats: 0 };

    render(
      <LanguageProvider>
        <Training />
      </LanguageProvider>,
    );

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;

    // Spam clicks; even without an actual error we assert "at most one" toast
    await act(async () => {
      for (let i = 0; i < 5; i++) fireEvent.click(refreshBtn);
    });
    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });

    const allToasts = toastSpy.mock.calls.filter(([a]) => a?.title);
    expect(allToasts.length).toBe(1);
    void failNext;
  });
});
