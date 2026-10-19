import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const { tableData } = vi.hoisted(() => ({
  tableData: {
    stations: [{ id: 'st1', name_ar: 'القاهرة', name_en: 'Cairo' }],
    departments: [{ id: 'dp1', name_ar: 'الإدارة', name_en: 'Admin' }],
    training_courses: [{ id: 'c1', name_en: 'Safety', name_ar: 'سلامة', provider: 'ACA' }],
    training_records: [
      {
        id: 'r1', employee_id: '1', course_id: 'c1', start_date: '2026-01-01', end_date: '2026-01-02',
        provider: 'ACA', has_cert: true, status: 'completed',
        training_courses: { name_en: 'Safety', name_ar: 'سلامة', course_code: 'S1', provider: 'ACA' },
      },
      {
        id: 'r2', employee_id: '2', course_id: 'c1', start_date: '2026-02-01', end_date: '2026-02-02',
        provider: 'ACA', has_cert: false, status: 'completed',
        training_courses: { name_en: 'Safety', name_ar: 'سلامة', course_code: 'S1', provider: 'ACA' },
      },
      {
        id: 'r3', employee_id: '3', course_id: 'c1', start_date: '2026-03-01', end_date: '2026-03-02',
        provider: 'ACA', has_cert: false, status: 'completed',
        training_courses: { name_en: 'Safety', name_ar: 'سلامة', course_code: 'S1', provider: 'ACA' },
      },
    ],
  } as Record<string, any[]>,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', isRTL: false, t: (k: string) => k }),
}));

vi.mock('@/contexts/EmployeeDataContext', () => ({
  useEmployeeData: () => ({
    employees: [
      { id: '1', employeeId: 'E001', nameAr: 'م 1', nameEn: 'Emp Active', department: 'IT',
        jobTitle: 'Dev', jobTitleAr: 'مطور', jobTitleEn: 'Dev', stationId: 'st1', departmentId: 'dp1',
        deptCode: 'PS', educationAr: 'بكالوريوس', hireDate: '2024-01-01', phone: '111', status: 'active' },
      { id: '2', employeeId: 'E002', nameAr: 'م 2', nameEn: 'Emp Resigned', department: 'HR',
        jobTitle: 'Mgr', jobTitleAr: 'مدير', jobTitleEn: 'Mgr', stationId: 'st1', departmentId: 'dp1',
        deptCode: 'AD', educationAr: 'بكالوريوس', hireDate: '2023-01-01', phone: '222', status: 'resigned' },
      { id: '3', employeeId: 'E003', nameAr: 'م 3', nameEn: 'Emp Pending', department: 'IT',
        jobTitle: 'QA', jobTitleAr: 'فاحص', jobTitleEn: 'QA', stationId: 'st1', departmentId: 'dp1',
        deptCode: 'TR', educationAr: 'دبلوم', hireDate: '2025-01-01', phone: '333', status: 'pending_hire' },
    ],
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const q: any = {
        select: () => q, eq: () => q, order: () => q, range: () => q, is: () => q, in: () => q,
        then: (res: any) => res({ data: tableData[table] || [], error: null }),
      };
      return q;
    },
  },
}));

vi.mock('@/hooks/useReportExport', () => ({
  useReportExport: () => ({
    reportRef: { current: null },
    handlePrint: vi.fn(),
    exportToCSV: vi.fn(),
    exportBilingualCSV: vi.fn(),
    exportBilingualPDF: vi.fn(),
  }),
}));

import { TrainingQualificationReport } from '@/components/reports/TrainingQualificationReport';

const flush = () => new Promise(r => setTimeout(r, 250));

const openStatusDropdown = () => {
  const label = screen.getByText('Employment Status');
  const trigger = label.parentElement!.querySelector('button')!;
  fireEvent.click(trigger);
};

const clickOption = (name: string) => {
  const opt = screen.getByRole('option', { name: new RegExp(name, 'i') });
  fireEvent.click(opt);
};

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => cleanup());

describe('Qualification Record — Employment Status filter', () => {
  it('shows nothing until a filter is picked', async () => {
    render(<TrainingQualificationReport />);
    await flush();
    expect(screen.getByText(/Select a filter to view the report/i)).toBeInTheDocument();
  });

  it('filters records down to the selected employment status only', async () => {
    render(<TrainingQualificationReport />);
    await flush();

    openStatusDropdown();
    clickOption('Resigned');
    await flush();

    expect(screen.getByText('Emp Resigned')).toBeInTheDocument();
    expect(screen.queryByText('Emp Active')).toBeNull();
    expect(screen.queryByText('Emp Pending')).toBeNull();
  });

  it('supports multiple selection (Active + Pending Hire shows both, hides Resigned)', async () => {
    render(<TrainingQualificationReport />);
    await flush();

    openStatusDropdown();
    clickOption('Active');
    clickOption('Pending Hire');
    await flush();

    expect(screen.getByText('Emp Active')).toBeInTheDocument();
    expect(screen.getByText('Emp Pending')).toBeInTheDocument();
    expect(screen.queryByText('Emp Resigned')).toBeNull();
  });

  it('clearing the status filter returns to the empty prompt', async () => {
    render(<TrainingQualificationReport />);
    await flush();

    openStatusDropdown();
    clickOption('Resigned');
    await flush();
    expect(screen.getByText('Emp Resigned')).toBeInTheDocument();

    openStatusDropdown();
    fireEvent.click(screen.getByRole('button', { name: /^Clear$/i }));
    await flush();

    expect(screen.getByText(/Select a filter to view the report/i)).toBeInTheDocument();
  });
});
