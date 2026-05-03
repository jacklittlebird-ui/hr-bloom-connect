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

// Mount counters per tab — let us verify the refreshKey forces a remount.
const mountCounts: Record<string, number> = {
  records: 0, trainers: 0, syllabus: 0, courses: 0, plan: 0, reports: 0, idcards: 0, stats: 0,
};
const makeStub = (key: keyof typeof mountCounts, testid: string) => () => {
  mountCounts[key] += 1;
  return <div data-testid={testid} />;
};

vi.mock('@/components/training/BulkTrainingImport', () => ({ BulkTrainingImport: () => <div /> }));
vi.mock('@/components/training/TrainingStatsCards', () => ({ TrainingStatsCards: makeStub('stats', 'stats') }));
vi.mock('@/components/training/TrainingRecords', () => ({ TrainingRecords: makeStub('records', 'tab-records') }));
vi.mock('@/components/training/Trainers', () => ({ Trainers: makeStub('trainers', 'tab-trainers') }));
vi.mock('@/components/training/CoursesSyllabus', () => ({ CoursesSyllabus: makeStub('syllabus', 'tab-syllabus') }));
vi.mock('@/components/training/CoursesList', () => ({ CoursesList: makeStub('courses', 'tab-courses') }));
vi.mock('@/components/training/TrainingPlan', () => ({ TrainingPlan: makeStub('plan', 'tab-plan') }));
vi.mock('@/components/training/EmployeeIdCards', () => ({ EmployeeIdCards: makeStub('idcards', 'tab-idcards') }));
vi.mock('@/components/reports/TrainingReports', () => ({ TrainingReports: makeStub('reports', 'tab-reports') }));
vi.mock('@/components/reports/TrainingQualificationReport', () => ({ TrainingQualificationReport: () => <div /> }));
vi.mock('@/components/reports/MissingCourseRecords', () => ({ MissingCourseRecords: () => <div /> }));
vi.mock('@/components/training/TrainingRecordsReport', () => ({ TrainingRecordsReport: () => <div /> }));

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
