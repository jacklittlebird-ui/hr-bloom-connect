import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { Employee } from '@/types/employee';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeDataContextType {
  employees: Employee[];
  loading: boolean;
  getEmployee: (id: string) => Employee | undefined;
  getEmployeeById: (employeeId: string) => Employee | undefined;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  addEmployee: (employee: Employee) => void;
  refreshEmployees: () => Promise<void>;
}

const EmployeeDataContext = createContext<EmployeeDataContextType | undefined>(undefined);

// Map DB row → frontend Employee
function mapRow(row: any): Employee {
  return {
    id: row.id,
    employeeId: row.employee_code,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    department: row.departments?.name_ar || '-',
    jobTitle: row.job_title_ar || '',
    phone: row.phone || '',
    status: row.status as Employee['status'],
    avatar: row.avatar || undefined,
    stationLocation: row.stations?.code || '',
    stationId: row.station_id || undefined,
    stationName: row.stations?.name_ar || undefined,
    firstName: row.first_name || row.name_en?.split(' ')[0] || '',
    fatherName: row.father_name || undefined,
    familyName: row.family_name || undefined,
    birthDate: row.birth_date || undefined,
    birthPlace: row.birth_place || undefined,
    birthGovernorate: row.birth_governorate || undefined,
    gender: row.gender || undefined,
    religion: row.religion || undefined,
    nationality: row.nationality || undefined,
    maritalStatus: row.marital_status || undefined,
    childrenCount: row.children_count ?? undefined,
    educationAr: row.education_ar || undefined,
    graduationYear: row.graduation_year || undefined,
    email: row.email || undefined,
    homePhone: row.home_phone || undefined,
    mobile: row.phone || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    governorate: row.governorate || undefined,
    nationalId: row.national_id || undefined,
    idIssueDate: row.id_issue_date || undefined,
    idExpiryDate: row.id_expiry_date || undefined,
    issuingAuthority: row.issuing_authority || undefined,
    issuingGovernorate: row.issuing_governorate || undefined,
    militaryStatus: row.military_status || undefined,
    departmentId: row.department_id || undefined,
    jobTitleAr: row.job_title_ar || undefined,
    jobTitleEn: row.job_title_en || undefined,
    jobLevel: row.job_level || undefined,
    jobDegree: row.job_degree || undefined,
    hireDate: row.hire_date || undefined,
    recruitedBy: row.recruited_by || undefined,
    employmentStatus: row.employment_status || undefined,
    resigned: row.resigned ?? undefined,
    resignationDate: row.resignation_date || undefined,
    resignationReason: row.resignation_reason || undefined,
    socialInsuranceNo: row.social_insurance_no || undefined,
    socialInsuranceStartDate: row.social_insurance_start_date || undefined,
    socialInsuranceEndDate: row.social_insurance_end_date || undefined,
    healthInsuranceCardNo: row.health_insurance_card_no || undefined,
    hasHealthInsurance: row.has_health_insurance ?? undefined,
    hasGovHealthInsurance: row.has_gov_health_insurance ?? undefined,
    hasSocialInsurance: row.has_social_insurance ?? undefined,
    contractType: row.contract_type || undefined,
    hasCairoAirportTempPermit: row.has_cairo_airport_temp_permit ?? undefined,
    hasCairoAirportAnnualPermit: row.has_cairo_airport_annual_permit ?? undefined,
    hasAirportsTempPermit: row.has_airports_temp_permit ?? undefined,
    hasAirportsAnnualPermit: row.has_airports_annual_permit ?? undefined,
    tempPermitNo: row.temp_permit_no || undefined,
    annualPermitNo: row.annual_permit_no || undefined,
    airportsTempPermitNo: row.airports_temp_permit_no || undefined,
    airportsAnnualPermitNo: row.airports_annual_permit_no || undefined,
    airportsPermitType: row.airports_permit_type || undefined,
    permitNameEn: row.permit_name_en || undefined,
    permitNameAr: row.permit_name_ar || undefined,
    hasQualificationCert: row.has_qualification_cert ?? undefined,
    hasMilitaryServiceCert: row.has_military_service_cert ?? undefined,
    hasBirthCert: row.has_birth_cert ?? undefined,
    hasIdCopy: row.has_id_copy ?? undefined,
    hasPledge: row.has_pledge ?? undefined,
    hasContract: row.has_contract ?? undefined,
    hasReceipt: row.has_receipt ?? undefined,
    attachments: row.attachments || undefined,
    basicSalary: row.basic_salary ?? undefined,
    annualLeaveBalance: row.annual_leave_balance ?? undefined,
    sickLeaveBalance: row.sick_leave_balance ?? undefined,
    bankAccountNumber: row.bank_account_number || undefined,
    bankIdNumber: row.bank_id_number || undefined,
    bankAccountType: row.bank_account_type || undefined,
    bankName: row.bank_name || undefined,
    notes: row.notes || undefined,
    deptCode: row.dept_code || undefined,
    emergencyContactName1: row.emergency_contact_name1 || undefined,
    emergencyContactMobile1: row.emergency_contact_mobile1 || undefined,
    emergencyContactName2: row.emergency_contact_name2 || undefined,
    emergencyContactMobile2: row.emergency_contact_mobile2 || undefined,
  };
}

// Map frontend updates → DB columns
async function mapUpdates(updates: Partial<Employee>): Promise<Record<string, any>> {
  const map: Record<string, string> = {
    nameAr: 'name_ar',
    nameEn: 'name_en',
    employeeId: 'employee_code',
    phone: 'phone',
    status: 'status',
    avatar: 'avatar',
    firstName: 'first_name',
    fatherName: 'father_name',
    familyName: 'family_name',
    birthDate: 'birth_date',
    birthPlace: 'birth_place',
    birthGovernorate: 'birth_governorate',
    gender: 'gender',
    religion: 'religion',
    nationality: 'nationality',
    maritalStatus: 'marital_status',
    childrenCount: 'children_count',
    educationAr: 'education_ar',
    graduationYear: 'graduation_year',
    email: 'email',
    address: 'address',
    city: 'city',
    governorate: 'governorate',
    nationalId: 'national_id',
    idIssueDate: 'id_issue_date',
    idExpiryDate: 'id_expiry_date',
    issuingAuthority: 'issuing_authority',
    issuingGovernorate: 'issuing_governorate',
    militaryStatus: 'military_status',
    departmentId: 'department_id',
    jobTitleAr: 'job_title_ar',
    jobTitleEn: 'job_title_en',
    jobLevel: 'job_level',
    jobDegree: 'job_degree',
    hireDate: 'hire_date',
    recruitedBy: 'recruited_by',
    employmentStatus: 'employment_status',
    resigned: 'resigned',
    resignationDate: 'resignation_date',
    resignationReason: 'resignation_reason',
    socialInsuranceNo: 'social_insurance_no',
    socialInsuranceStartDate: 'social_insurance_start_date',
    socialInsuranceEndDate: 'social_insurance_end_date',
    healthInsuranceCardNo: 'health_insurance_card_no',
    hasHealthInsurance: 'has_health_insurance',
    hasGovHealthInsurance: 'has_gov_health_insurance',
    hasSocialInsurance: 'has_social_insurance',
    contractType: 'contract_type',
    hasCairoAirportTempPermit: 'has_cairo_airport_temp_permit',
    tempPermitNo: 'temp_permit_no',
    hasCairoAirportAnnualPermit: 'has_cairo_airport_annual_permit',
    annualPermitNo: 'annual_permit_no',
    hasAirportsTempPermit: 'has_airports_temp_permit',
    hasAirportsAnnualPermit: 'has_airports_annual_permit',
    airportsTempPermitNo: 'airports_temp_permit_no',
    airportsAnnualPermitNo: 'airports_annual_permit_no',
    airportsPermitType: 'airports_permit_type',
    permitNameEn: 'permit_name_en',
    permitNameAr: 'permit_name_ar',
    hasQualificationCert: 'has_qualification_cert',
    hasMilitaryServiceCert: 'has_military_service_cert',
    hasBirthCert: 'has_birth_cert',
    hasIdCopy: 'has_id_copy',
    hasPledge: 'has_pledge',
    hasContract: 'has_contract',
    hasReceipt: 'has_receipt',
    attachments: 'attachments',
    basicSalary: 'basic_salary',
    annualLeaveBalance: 'annual_leave_balance',
    sickLeaveBalance: 'sick_leave_balance',
    bankAccountNumber: 'bank_account_number',
    bankIdNumber: 'bank_id_number',
    bankAccountType: 'bank_account_type',
    bankName: 'bank_name',
    notes: 'notes',
    deptCode: 'dept_code',
    jobTitle: 'job_title_ar',
    mobile: 'phone',
    homePhone: 'home_phone',
    emergencyContactName1: 'emergency_contact_name1',
    emergencyContactMobile1: 'emergency_contact_mobile1',
    emergencyContactName2: 'emergency_contact_name2',
    emergencyContactMobile2: 'emergency_contact_mobile2',
  };

  const dbUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'stationLocation') continue;
    const dbCol = map[key];
    if (dbCol) {
      dbUpdates[dbCol] = value === '' ? null : value;
    }
  }

  // Handle stationLocation specially - resolve station_id by code (or accept UUID directly)
  if ('stationLocation' in updates) {
    const stationValue = (updates.stationLocation || '').trim();

    if (!stationValue) {
      dbUpdates['station_id'] = null;
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stationValue)) {
      dbUpdates['station_id'] = stationValue;
    } else {
      const { data: stationData } = await supabase
        .from('stations')
        .select('id')
        .eq('code', stationValue)
        .maybeSingle();

      if (stationData?.id) {
        dbUpdates['station_id'] = stationData.id;
      }
    }
  }

  return dbUpdates;
}

export const EmployeeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();
  const { isAuthenticated, user } = useAuth();

  const fetchEmployees = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    // Employee, kiosk, and training_manager roles don't need the full employee list
    if (user.role === 'employee' || user.role === 'kiosk' || user.role === 'training_manager') {
      setEmployees([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const mapWithRelations = async (rows: any[]) => {
      const [deptsRes, stationsRes] = await Promise.all([
        supabase.from('departments').select('id, name_ar, name_en'),
        supabase.from('stations').select('id, code, name_ar, name_en'),
      ]);

      const deptMap = new Map((deptsRes.data || []).map((d) => [d.id, d]));
      const stationMap = new Map((stationsRes.data || []).map((s) => [s.id, s]));

      return rows.map((row: any) => {
        const dept = deptMap.get(row.department_id);
        const station = stationMap.get(row.station_id);
        return mapRow({ ...row, departments: dept || null, stations: station || null });
      });
    };

    if (user.role === 'station_manager') {
      const { data, error } = await supabase
        .from('employee_limited_view' as any)
        .select('*, departments(name_ar, name_en), stations(code, name_ar, name_en)')
        .order('employee_code', { ascending: true });

      if (error) {
        const { data: viewData, error: viewError } = await supabase
          .from('employee_limited_view' as any)
          .select('*')
          .order('employee_code', { ascending: true });

        if (viewError) {
          console.error('Error fetching limited employees:', viewError);
          setEmployees([]);
          setLoading(false);
          return;
        }

        setEmployees(await mapWithRelations(viewData || []));
        setLoading(false);
        return;
      }

      setEmployees((data || []).map(mapRow));
      setLoading(false);
      return;
    }

    // Use simpler query (no joins) to avoid timeout, then enrich with separate lookups
    const { data: baseRows, error: baseError } = await supabase
      .from('employees')
      .select('*')
      .order('employee_code', { ascending: true });

    if (baseError) {
      console.error('Error fetching employees:', baseError);
      setEmployees([]);
      setLoading(false);
      return;
    }

    setEmployees(await mapWithRelations(baseRows || []));
    setLoading(false);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setLoading(false);
    }
  }, [isAuthenticated, user, fetchEmployees]);

  // Removed aggressive focus/visibility refetch to reduce DB load
  // Data is fetched once on login and can be refreshed manually via refreshEmployees()

  const getEmployee = useCallback((id: string) => {
    return employees.find(e => e.id === id);
  }, [employees]);

  const getEmployeeById = useCallback((employeeId: string) => {
    return employees.find(e => e.employeeId === employeeId);
  }, [employees]);

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    const dbUpdates = await mapUpdates(updates);
    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase.from('employees').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }

    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const emp = employees.find(e => e.id === id);
    addNotification({ titleAr: `تم تحديث بيانات الموظف: ${emp?.nameAr || id}`, titleEn: `Employee updated: ${emp?.nameEn || id}`, type: 'success', module: 'employee' });
  }, [employees, addNotification]);

  const addEmployee = useCallback(async (employee: Employee) => {
    const dbRow: any = {
      employee_code: employee.employeeId,
      name_ar: employee.nameAr,
      name_en: employee.nameEn,
      phone: employee.phone || '',
      status: employee.status || 'active',
      job_title_ar: employee.jobTitle || employee.jobTitleAr || '',
      job_title_en: employee.jobTitleEn || '',
      email: employee.email || '',
    };

    const { data, error } = await supabase.from('employees').insert(dbRow).select('*, departments(name_ar, name_en), stations(code, name_ar, name_en)').single();
    if (error) {
      console.error('Error adding employee:', error);
      return;
    }
    if (data) {
      setEmployees(prev => [...prev, mapRow(data)]);
    }
    addNotification({ titleAr: `تم إضافة موظف جديد: ${employee.nameAr}`, titleEn: `New employee added: ${employee.nameEn}`, type: 'success', module: 'employee' });
  }, [addNotification]);

  return (
    <EmployeeDataContext.Provider value={{ employees, loading, getEmployee, getEmployeeById, updateEmployee, addEmployee, refreshEmployees: fetchEmployees }}>
      {children}
    </EmployeeDataContext.Provider>
  );
};

export const useEmployeeData = () => {
  const ctx = useContext(EmployeeDataContext);
  if (!ctx) throw new Error('useEmployeeData must be used within EmployeeDataProvider');
  return ctx;
};
