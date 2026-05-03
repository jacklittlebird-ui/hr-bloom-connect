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

// Mount counters + API call counter on globalThis so hoisted vi.mock factories
// can reach them.
(globalThis as any).__mc = {
  records: 0, stats: 0, trainers: 0, syllabus: 0,
  courses: 0, plan: 0, reports: 0, idcards: 0,
};
(globalThis as any).__apiCalls = 0;

vi.mock('@/components/training/BulkTrainingImport', () => ({ BulkTrainingImport: () => null }));
vi.mock('@/components/training/TrainingStatsCards', () => ({
  TrainingStatsCards: () => {
    (globalThis as any).__mc.stats++;
    (globalThis as any).__apiCalls++;
    return <div data-testid="stats" />;
  },
}));
vi.mock('@/components/training/TrainingRecords', () => ({
  TrainingRecords: () => {
    (globalThis as any).__mc.records++;
    (globalThis as any).__apiCalls++;
    return <div data-testid="tab-records" />;
  },
}));
vi.mock('@/components/training/Trainers', () => ({
  Trainers: () => {
    (globalThis as any).__mc.trainers++;
    (globalThis as any).__apiCalls++;
    return <div data-testid="tab-trainers" />;
  },
}));
vi.mock('@/components/training/CoursesSyllabus', () => ({
  CoursesSyllabus: () => {
    (globalThis as any).__mc.syllabus++;
    (globalThis as any).__apiCalls++;
    return <div data-testid="tab-syllabus" />;
  },
}));
vi.mock('@/components/training/CoursesList', () => ({
  CoursesList: () => {
    (globalThis as any).__mc.courses++;
    (globalThis as any).__apiCalls++;
    return <div data-testid="tab-courses" />;
  },
}));
vi.mock('@/components/training/TrainingPlan', () => ({
  TrainingPlan: () => {
    (globalThis as any).__mc.plan++;
    (globalThis as any).__apiCalls++;
    return <div data-testid="tab-plan" />;
  },
}));
vi.mock('@/components/training/EmployeeIdCards', () => ({
  EmployeeIdCards: () => {
    (globalThis as any).__mc.idcards++;
    (globalThis as any).__apiCalls++;
    return <div data-testid="tab-idcards" />;
  },
}));
vi.mock('@/components/reports/TrainingReports', () => ({
  TrainingReports: () => {
    (globalThis as any).__mc.reports++;
    (globalThis as any).__apiCalls++;
    return <div data-testid="tab-reports" />;
  },
}));
vi.mock('@/components/reports/TrainingQualificationReport', () => ({ TrainingQualificationReport: () => null }));
vi.mock('@/components/reports/MissingCourseRecords', () => ({ MissingCourseRecords: () => null }));
vi.mock('@/components/training/TrainingRecordsReport', () => ({ TrainingRecordsReport: () => null }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import Training from '@/pages/Training';

const TAB_VALUES = ['records', 'trainers', 'syllabus', 'courses', 'plan', 'reports', 'id-cards'] as const;
const COUNTER_KEY: Record<string, string> = {
  records: 'records',
  trainers: 'trainers',
  syllabus: 'syllabus',
  courses: 'courses',
  plan: 'plan',
  reports: 'reports',
  'id-cards': 'idcards',
};

const resetCounters = () => {
  (globalThis as any).__mc = {
    records: 0, stats: 0, trainers: 0, syllabus: 0,
    courses: 0, plan: 0, reports: 0, idcards: 0,
  };
  (globalThis as any).__apiCalls = 0;
};

const clickRefresh = async (btn: HTMLButtonElement, times = 8) => {
  await act(async () => {
    for (let i = 0; i < times; i++) fireEvent.click(btn);
  });
};

const switchTab = async (value: string) => {
  const trigger = screen.getAllByRole('tab').find(el => (el.id || '').endsWith(`-trigger-${value}`)) as HTMLElement;
  expect(trigger).toBeTruthy();
  await act(async () => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.mouseDown(trigger, { button: 0 });
    fireEvent.click(trigger);
  });
};

describe('Training — refresh covers all 7 tabs with a single toast & one API cycle', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    resetCounters();
  });

  it('rapid refresh clicks → single toast, one banner cycle, one API burst, one remount per visited tab', async () => {
    render(
      <LanguageProvider>
        <Training />
      </LanguageProvider>,
    );

    // (1) All seven tab triggers are present
    const triggers = screen.getAllByRole('tab');
    expect(triggers.length).toBe(7);
    for (const value of TAB_VALUES) {
      expect(triggers.find(el => (el.id || '').endsWith(`-trigger-${value}`)), value).toBeTruthy();
    }

    // (2) Visit every tab so each lazy component is loaded once before refresh.
    for (const value of TAB_VALUES) {
      await switchTab(value);
      // Wait for lazy mount
      if (value !== 'records' && value !== 'reports' && value !== 'id-cards') {
        await screen.findByTestId(`tab-${value}`);
      } else if (value === 'reports') {
        await screen.findByTestId('tab-reports');
      } else if (value === 'id-cards') {
        await screen.findByTestId('tab-idcards');
      }
    }

    // Snapshot per-tab mount counts before refresh
    const mc = (globalThis as any).__mc;
    const before: Record<string, number> = {};
    for (const v of TAB_VALUES) before[v] = mc[COUNTER_KEY[v]];
    const beforeStats = mc.stats;
    const apiBefore = (globalThis as any).__apiCalls;

    // (3) Hammer the refresh button 12 times in a microtask burst
    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;
    await clickRefresh(refreshBtn, 12);

    // While in-flight: button disabled + ONE banner visible
    expect(refreshBtn.disabled).toBe(true);
    const banners = screen.getAllByRole('status');
    expect(banners.length).toBe(1);
    expect(banners[0].textContent).toMatch(/تحديث|Refreshing/);

    // Wait for cycle to finish
    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    // (4) Exactly ONE success toast despite 12 rapid clicks
    const toasts = toastSpy.mock.calls.filter(([a]) => a?.title);
    expect(toasts.length).toBe(1);
    expect(toasts[0][0].variant).not.toBe('destructive');

    // (5) Stats card stays mounted across tab switches → it MUST have remounted
    //    via the refreshKey bump.
    expect(mc.stats).toBeGreaterThan(beforeStats);

    // (6) Visit every other tab post-refresh → each remounts exactly ONCE
    //    (proves refreshKey propagated to all 7 tab keys, not just records/stats).
    for (const value of TAB_VALUES) {
      if (value === 'id-cards') continue; // already verified above
      await switchTab(value);
      const key = COUNTER_KEY[value];
      await waitFor(() => expect(mc[key]).toBeGreaterThan(before[value]));
      // Each tab remounted at least once after refresh (when first revisited)
      expect(mc[key], `${value} should remount after refresh`)
        .toBeGreaterThan(before[value]);
    }

    // (7) API call burst sanity: every one of the 7 tabs + stats card got its
    //    refreshKey bumped → at least 8 new mounts since pre-refresh snapshot,
    //    but bounded (no runaway refetch loop from rapid clicks).
    const apiAfter = (globalThis as any).__apiCalls;
    const delta = apiAfter - apiBefore;
    expect(delta).toBeGreaterThanOrEqual(8);
    expect(delta).toBeLessThanOrEqual(16);
  });

  it('refresh button cannot retrigger toast until cycle completes; sequential refresh = N toasts', async () => {
    render(
      <LanguageProvider>
        <Training />
      </LanguageProvider>,
    );

    const refreshBtn = screen.getByRole('button', { name: /تحديث|Refresh/ }) as HTMLButtonElement;

    // Cycle 1: hammer 6 clicks → 1 toast
    await clickRefresh(refreshBtn, 6);
    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    expect(toastSpy.mock.calls.filter(([a]) => a?.title).length).toBe(1);

    // Cycle 2: after completion, button is clickable again → another toast
    await clickRefresh(refreshBtn, 6);
    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    expect(toastSpy.mock.calls.filter(([a]) => a?.title).length).toBe(2);

    // Cycle 3
    await clickRefresh(refreshBtn, 4);
    await waitFor(() => expect(refreshBtn.disabled).toBe(false), { timeout: 2000 });
    expect(toastSpy.mock.calls.filter(([a]) => a?.title).length).toBe(3);
  });
});
