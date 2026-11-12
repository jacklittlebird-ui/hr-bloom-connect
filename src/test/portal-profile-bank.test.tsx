import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalProfile } from '@/components/portal/sections/PortalProfile';

const state = vi.hoisted(() => ({ employee: null as any }));

vi.mock('@/hooks/usePortalEmployee', () => ({ usePortalEmployee: () => 'emp-own' }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));
vi.mock('@/contexts/EmployeeDataContext', () => ({
  useEmployeeData: () => ({ getEmployee: () => state.employee, refreshEmployees: async () => {} }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: async () => ({ error: null }) } }));

const base = {
  id: 'emp-own',
  employeeId: 'emp0001',
  nameAr: 'أحمد',
  nameEn: 'Ahmed',
  jobTitle: 'Officer',
  department: 'Security',
  status: 'active',
  email: 'a@b.com',
  phone: '01000000000',
  bankName: 'Crédit Agricole',
  bankAccountNumber: 'CA-123456',
  bankIdNumber: 'ID-999',
  bankAccountType: 'salary',
  nbeAccountNumber: '0000000000000000001',
};

describe('Employee profile bank account', () => {
  beforeEach(() => { state.employee = { ...base }; });
  afterEach(cleanup);

  it('shows the Crédit Agricole account only while it is the enabled one', () => {
    state.employee = { ...base, creditAccountActive: true, nbeAccountActive: false, salaryBank: 'credit_agricole' };
    render(<PortalProfile />);
    expect(screen.getByText('CA-123456')).toBeTruthy();
    expect(screen.queryByText('0000000000000000001')).toBeNull();
  });

  it('shows the NBE account only while it is the enabled one', () => {
    state.employee = { ...base, creditAccountActive: false, nbeAccountActive: true, salaryBank: 'nbe' };
    render(<PortalProfile />);
    expect(screen.getByText('0000000000000000001')).toBeTruthy();
    expect(screen.queryByText('CA-123456')).toBeNull();
    expect(screen.getByText('National Bank of Egypt')).toBeTruthy();
  });

  it('shows no account number when no bank account is enabled', () => {
    state.employee = { ...base, creditAccountActive: false, nbeAccountActive: false, salaryBank: 'cash' };
    render(<PortalProfile />);
    expect(screen.queryByText('CA-123456')).toBeNull();
    expect(screen.queryByText('0000000000000000001')).toBeNull();
    expect(screen.getByText('Cash')).toBeTruthy();
  });
});
