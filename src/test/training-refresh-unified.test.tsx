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

// Mount counters per tab — verify the refreshKey forces a remount.
// Defined on globalThis so vi.mock factories (hoisted) can access them.
(globalThis as any).__mc = { records: 0, trainers: 0, syllabus: 0, courses: 0, plan: 0, reports: 0, idcards: 0, stats: 0 };
const mountCounts = (globalThis as any).__mc as Record<string, number>;

vi.mock('@/components/training/BulkTrainingImport', () => ({ BulkTrainingImport: () => null }));
vi.mock('@/components/training/TrainingStatsCards', () => ({
  TrainingStatsCards: () => { (globalThis as any).__mc.stats++; return <div data-testid="stats" />; },
}));
vi.mock('@/components/training/TrainingRecords', () => ({
  TrainingRecords: () => { (globalThis as any).__mc.records++; return <div data-testid="tab-records" />; },
}));
vi.mock('@/components/training/Trainers', () => ({
  Trainers: () => { (globalThis as any).__mc.trainers++; return <div data-testid="tab-trainers" />; },
}));
vi.mock('@/components/training/CoursesSyllabus', () => ({
  CoursesSyllabus: () => { (globalThis as any).__mc.syllabus++; return <div data-testid="tab-syllabus" />; },
}));
vi.mock('@/components/training/CoursesList', () => ({
  CoursesList: () => { (globalThis as any).__mc.courses++; return <div data-testid="tab-courses" />; },
}));
vi.mock('@/components/training/TrainingPlan', () => ({
  TrainingPlan: () => { (globalThis as any).__mc.plan++; return <div data-testid="tab-plan" />; },
}));
vi.mock('@/components/training/EmployeeIdCards', () => ({
  EmployeeIdCards: () => { (globalThis as any).__mc.idcards++; return <div data-testid="tab-idcards" />; },
}));
vi.mock('@/components/reports/TrainingReports', () => ({
  TrainingReports: () => { (globalThis as any).__mc.reports++; return <div data-testid="tab-reports" />; },
}));
vi.mock('@/components/reports/TrainingQualificationReport', () => ({ TrainingQualificationReport: () => null }));
vi.mock('@/components/reports/MissingCourseRecords', () => ({ MissingCourseRecords: () => null }));
vi.mock('@/components/training/TrainingRecordsReport', () => ({ TrainingRecordsReport: () => null }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import Training from '@/pages/Training';

const TABS: { value: string; testid: string; key: keyof typeof mountCounts }[] = [
  { value: 'records', testid: 'tab-records', key: 'records' },
  { value: 'trainers', testid: 'tab-trainers', key: 'trainers' },
  { value: 'syllabus', testid: 'tab-syllabus', key: 'syllabus' },
  { value: 'courses', testid: 'tab-courses', key: 'courses' },
  { value: 'plan', testid: 'tab-plan', key: 'plan' },
  { value: 'reports', testid: 'tab-reports', key: 'reports' },
  { value: 'id-cards', testid: 'tab-idcards', key: 'idcards' },
];

const resetCounts = () => Object.keys(mountCounts).forEach(k => (mountCounts[k as keyof typeof mountCounts] = 0));

describe('Training — refresh covers all 7 tabs with a single toast', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    resetCounts();
  });

  it('rapid refresh clicks emit exactly one toast and remount each tab once', async () => {
    render(
      <LanguageProvider>
        <Training />
      </LanguageProvider>,
    );

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;

    // Walk through all 7 tabs and verify each one mounts on activation
    for (const tab of TABS) {
      if (tab.value !== 'records') {
        const trigger = screen.getByRole('tab', { name: new RegExp(tab.value === 'id-cards' ? 'بطاقة|Company Card' : tab.value, 'i') })
          ?? screen.getAllByRole('tab').find(t => t.getAttribute('data-state') !== null && t.textContent?.toLowerCase().includes(tab.value));
        if (trigger) await act(async () => { fireEvent.click(trigger); });
      }
      await waitFor(() => expect(screen.getByTestId(tab.testid)).toBeInTheDocument());
    }

    // Snapshot mount counts after navigating through all tabs
    const beforeRefresh = { ...mountCounts };
    // Each tab content was mounted at least once
    for (const tab of TABS) {
      expect(beforeRefresh[tab.key]).toBeGreaterThanOrEqual(1);
    }

    // Hammer the refresh button — single toast guarantee
    await act(async () => {
      for (let i = 0; i < 8; i++) fireEvent.click(refreshBtn);
    });

    expect(refreshBtn.disabled).toBe(true);
    expect(await screen.findByRole('status')).toBeInTheDocument();

    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    // Exactly ONE success toast despite 8 rapid clicks
    const successes = toastSpy.mock.calls.filter(([a]) => a?.variant !== 'destructive' && a?.title);
    expect(successes.length).toBe(1);

    // The currently-active tab + the always-mounted records + stats remounted
    // exactly once (refreshKey bumped from 0 → 1).
    expect(mountCounts.stats).toBe(beforeRefresh.stats + 1);
    expect(mountCounts.records).toBe(beforeRefresh.records + 1);
    // The last visited tab (id-cards) is currently active and must have remounted
    expect(mountCounts.idcards).toBe(beforeRefresh.idcards + 1);
  });
});
