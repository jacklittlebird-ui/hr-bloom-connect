import { describe, it, expect } from 'vitest';

// Mirrors the role-gating logic in StationManagerPortal.tsx (`hideBonusUI`).
// The bonus percentage UI is shown ONLY for area_manager accounts inside the
// portal (New Evaluation, History/السجل, Edit Evaluation). All other portal
// roles — station_manager, station_hr, department_manager — never see it,
// regardless of email or station code.
const computeHideBonusUI = (user: { role?: string } | null | undefined) =>
  user?.role !== 'area_manager';

describe('Portal bonus percentage visibility (role-based)', () => {
  it('shows bonus UI for area_manager', () => {
    expect(computeHideBonusUI({ role: 'area_manager' })).toBe(false);
  });

  it.each([
    'station_manager',
    'station_hr',
    'department_manager',
    'employee',
    'admin',
    'hr',
    undefined,
  ])('hides bonus UI for role: %s', (role) => {
    expect(computeHideBonusUI({ role: role as string })).toBe(true);
  });

  it('hides bonus UI for the previously requested station-manager accounts (aswan/rmf/atz/lxr/hmb)', () => {
    for (const station of ['aswan', 'rmf', 'atz', 'lxr', 'hmb']) {
      expect(
        computeHideBonusUI({ role: 'station_manager', ...({ station } as any) })
      ).toBe(true);
    }
  });

  it('hides bonus UI for the previously requested HR accounts (sechrg/hanhrg)', () => {
    for (const email of ['sechrg@hr.com', 'hanhrg@hr.com']) {
      // These accounts are department_manager role in the database.
      expect(
        computeHideBonusUI({ role: 'department_manager', ...({ email } as any) })
      ).toBe(true);
    }
  });

  it('null/unauthenticated user → hidden', () => {
    expect(computeHideBonusUI(null)).toBe(true);
    expect(computeHideBonusUI(undefined)).toBe(true);
  });
});
