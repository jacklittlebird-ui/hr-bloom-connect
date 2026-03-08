import { useMemo, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { EmployeeStatsCards } from '@/components/employees/EmployeeStatsCards';
import { EmployeeFilters } from '@/components/employees/EmployeeFilters';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Download, Upload, Printer, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';

const Employees = () => {
  const { t, isRTL } = useLanguage();
  const { employees, refreshEmployees } = useEmployeeData();
  const { reportRef, handlePrint, exportBilingualCSV, exportToPDF } = useReportExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const ar = isRTL;

  const getStationLabel = (val?: string) => {
    if (!val) return '-';
    const s = stationLocations.find(s => s.value === val);
    return s ? (ar ? s.labelAr : s.labelEn) : val;
  };

  // Tab-grouped export sections
  const exportSections = [
    {
      titleAr: 'المعلومات الأساسية', titleEn: 'Basic Info',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'الاسم (انجليزي)', headerEn: 'Name (EN)', key: 'nameEn' },
        { headerAr: 'الاسم الأول', headerEn: 'First Name', key: 'firstName' },
        { headerAr: 'اسم الأب', headerEn: 'Father Name', key: 'fatherName' },
        { headerAr: 'اسم العائلة', headerEn: 'Family Name', key: 'familyName' },
        { headerAr: 'تاريخ الميلاد', headerEn: 'Birth Date', key: 'birthDate' },
        { headerAr: 'محل الميلاد', headerEn: 'Birth Place', key: 'birthPlace' },
        { headerAr: 'محافظة الميلاد', headerEn: 'Birth Governorate', key: 'birthGovernorate' },
        { headerAr: 'الجنس', headerEn: 'Gender', key: 'gender' },
        { headerAr: 'الديانة', headerEn: 'Religion', key: 'religion' },
        { headerAr: 'الجنسية', headerEn: 'Nationality', key: 'nationality' },
        { headerAr: 'الحالة الاجتماعية', headerEn: 'Marital Status', key: 'maritalStatus' },
        { headerAr: 'عدد الأطفال', headerEn: 'Children', key: 'childrenCount' },
        { headerAr: 'المؤهل', headerEn: 'Education', key: 'educationAr' },
        { headerAr: 'سنة التخرج', headerEn: 'Graduation Year', key: 'graduationYear' },
        { headerAr: 'الموقف من التجنيد', headerEn: 'Military Status', key: 'militaryStatus' },
        { headerAr: 'الحالة', headerEn: 'Status', key: 'status' },
      ]
    },
    {
      titleAr: 'معلومات الاتصال', titleEn: 'Contact Info',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'الهاتف', headerEn: 'Phone', key: 'phone' },
        { headerAr: 'هاتف المنزل', headerEn: 'Home Phone', key: 'homePhone' },
        { headerAr: 'البريد الإلكتروني', headerEn: 'Email', key: 'email' },
        { headerAr: 'العنوان', headerEn: 'Address', key: 'address' },
        { headerAr: 'المدينة', headerEn: 'City', key: 'city' },
        { headerAr: 'المحافظة', headerEn: 'Governorate', key: 'governorate' },
        { headerAr: 'اسم جهة اتصال الطوارئ 1', headerEn: 'Emergency Contact 1', key: 'emergencyContactName1' },
        { headerAr: 'هاتف جهة اتصال الطوارئ 1', headerEn: 'Emergency Mobile 1', key: 'emergencyContactMobile1' },
        { headerAr: 'اسم جهة اتصال الطوارئ 2', headerEn: 'Emergency Contact 2', key: 'emergencyContactName2' },
        { headerAr: 'هاتف جهة اتصال الطوارئ 2', headerEn: 'Emergency Mobile 2', key: 'emergencyContactMobile2' },
      ]
    },
    {
      titleAr: 'الهوية والوثائق', titleEn: 'Identity & Documents',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'الرقم القومي', headerEn: 'National ID', key: 'nationalId' },
        { headerAr: 'تاريخ إصدار البطاقة', headerEn: 'ID Issue Date', key: 'idIssueDate' },
        { headerAr: 'تاريخ انتهاء البطاقة', headerEn: 'ID Expiry Date', key: 'idExpiryDate' },
        { headerAr: 'جهة الإصدار', headerEn: 'Issuing Authority', key: 'issuingAuthority' },
        { headerAr: 'محافظة الإصدار', headerEn: 'Issuing Governorate', key: 'issuingGovernorate' },
      ]
    },
    {
      titleAr: 'معلومات الوظيفة', titleEn: 'Job Info',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
        { headerAr: 'كود القسم', headerEn: 'Dept Code', key: 'deptCode' },
        { headerAr: 'القسم', headerEn: 'Department', key: 'department' },
        { headerAr: 'المسمى الوظيفي (عربي)', headerEn: 'Job Title (AR)', key: 'jobTitleAr' },
        { headerAr: 'المسمى الوظيفي (انجليزي)', headerEn: 'Job Title (EN)', key: 'jobTitleEn' },
        { headerAr: 'المستوى الوظيفي', headerEn: 'Job Level', key: 'jobLevel' },
        { headerAr: 'الدرجة الوظيفية', headerEn: 'Job Degree', key: 'jobDegree' },
        { headerAr: 'نوع العقد', headerEn: 'Contract Type', key: 'contractType' },
        { headerAr: 'حالة التوظيف', headerEn: 'Employment Status', key: 'employmentStatus' },
        { headerAr: 'تاريخ التعيين', headerEn: 'Hire Date', key: 'hireDate' },
        { headerAr: 'تم التوظيف بواسطة', headerEn: 'Recruited By', key: 'recruitedBy' },
        { headerAr: 'مستقيل', headerEn: 'Resigned', key: 'resigned' },
        { headerAr: 'تاريخ الاستقالة', headerEn: 'Resignation Date', key: 'resignationDate' },
        { headerAr: 'سبب الاستقالة', headerEn: 'Resignation Reason', key: 'resignationReason' },
      ]
    },
    {
      titleAr: 'التأمينات', titleEn: 'Insurance',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'تأمين اجتماعي', headerEn: 'Has Social Insurance', key: 'hasSocialInsurance' },
        { headerAr: 'رقم التأمين الاجتماعي', headerEn: 'Social Insurance No', key: 'socialInsuranceNo' },
        { headerAr: 'تاريخ بداية التأمين', headerEn: 'Insurance Start Date', key: 'socialInsuranceStartDate' },
        { headerAr: 'تاريخ نهاية التأمين', headerEn: 'Insurance End Date', key: 'socialInsuranceEndDate' },
        { headerAr: 'تأمين صحي', headerEn: 'Has Health Insurance', key: 'hasHealthInsurance' },
        { headerAr: 'تأمين صحي حكومي', headerEn: 'Has Gov Health Insurance', key: 'hasGovHealthInsurance' },
        { headerAr: 'رقم بطاقة التأمين الصحي', headerEn: 'Health Insurance Card', key: 'healthInsuranceCardNo' },
      ]
    },
    {
      titleAr: 'التصاريح', titleEn: 'Permits',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'تصريح مطار القاهرة المؤقت', headerEn: 'Cairo Airport Temp Permit', key: 'hasCairoAirportTempPermit' },
        { headerAr: 'تصريح مطار القاهرة السنوي', headerEn: 'Cairo Airport Annual Permit', key: 'hasCairoAirportAnnualPermit' },
        { headerAr: 'رقم تصريح مطار القاهرة', headerEn: 'Cairo Airport Permit No', key: 'cairoAirportAnnualPermitNo' },
        { headerAr: 'رقم التصريح المؤقت', headerEn: 'Temp Permit No', key: 'tempPermitNo' },
        { headerAr: 'رقم التصريح السنوي', headerEn: 'Annual Permit No', key: 'annualPermitNo' },
        { headerAr: 'تصريح مطارات مؤقت', headerEn: 'Airports Temp Permit', key: 'hasAirportsTempPermit' },
        { headerAr: 'تصريح مطارات سنوي', headerEn: 'Airports Annual Permit', key: 'hasAirportsAnnualPermit' },
        { headerAr: 'رقم تصريح المطارات المؤقت', headerEn: 'Airports Temp Permit No', key: 'airportsTempPermitNo' },
        { headerAr: 'رقم تصريح المطارات السنوي', headerEn: 'Airports Annual Permit No', key: 'airportsAnnualPermitNo' },
        { headerAr: 'نوع تصريح المطارات', headerEn: 'Airports Permit Type', key: 'airportsPermitType' },
        { headerAr: 'اسم التصريح (عربي)', headerEn: 'Permit Name (AR)', key: 'permitNameAr' },
        { headerAr: 'اسم التصريح (انجليزي)', headerEn: 'Permit Name (EN)', key: 'permitNameEn' },
      ]
    },
    {
      titleAr: 'الشهادات والوثائق', titleEn: 'Certificates & Documents',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'شهادة المؤهل', headerEn: 'Qualification Cert', key: 'hasQualificationCert' },
        { headerAr: 'شهادة التجنيد', headerEn: 'Military Cert', key: 'hasMilitaryServiceCert' },
        { headerAr: 'شهادة الميلاد', headerEn: 'Birth Cert', key: 'hasBirthCert' },
        { headerAr: 'صورة البطاقة', headerEn: 'ID Copy', key: 'hasIdCopy' },
        { headerAr: 'التعهد', headerEn: 'Pledge', key: 'hasPledge' },
        { headerAr: 'العقد', headerEn: 'Contract', key: 'hasContract' },
        { headerAr: 'الإيصال', headerEn: 'Receipt', key: 'hasReceipt' },
      ]
    },
    {
      titleAr: 'الأقسام', titleEn: 'Departments',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'كود القسم', headerEn: 'Dept Code', key: 'deptCode' },
        { headerAr: 'القسم', headerEn: 'Department', key: 'department' },
        { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      ]
    },
    {
      titleAr: 'رصيد الإجازات', titleEn: 'Leave Balance',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'رصيد الإجازات السنوية', headerEn: 'Annual Leave Balance', key: 'annualLeaveBalance' },
        { headerAr: 'رصيد الإجازات المرضية', headerEn: 'Sick Leave Balance', key: 'sickLeaveBalance' },
      ]
    },
    {
      titleAr: 'الراتب والبيانات المالية', titleEn: 'Salary & Financial',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'الراتب الأساسي', headerEn: 'Basic Salary', key: 'basicSalary' },
        { headerAr: 'اسم البنك', headerEn: 'Bank Name', key: 'bankName' },
        { headerAr: 'رقم الحساب البنكي', headerEn: 'Bank Account', key: 'bankAccountNumber' },
        { headerAr: 'الرقم التعريفي للبنك', headerEn: 'Bank ID Number', key: 'bankIdNumber' },
        { headerAr: 'نوع الحساب البنكي', headerEn: 'Bank Account Type', key: 'bankAccountType' },
      ]
    },
    {
      titleAr: 'أخرى', titleEn: 'Other',
      columns: [
        { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeId' },
        { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
        { headerAr: 'ملاحظات', headerEn: 'Notes', key: 'notes' },
        { headerAr: 'المرفقات', headerEn: 'Attachments', key: 'attachments' },
      ]
    },
  ];

  // Flat columns for single-table exports
  const bilingualExportColumns = exportSections.flatMap(s => s.columns).filter((col, idx, arr) => 
    arr.findIndex(c => c.key === col.key) === idx
  );

  // Single-language columns for PDF fallback
  const exportColumns = bilingualExportColumns.map(c => ({ header: ar ? c.headerAr : c.headerEn, key: c.key }));

  const counts = useMemo(() => ({
    all: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
    suspended: employees.filter(e => e.status === 'suspended').length,
  }), [employees]);

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(d => d !== '-'));
    return depts.size;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch =
        emp.nameAr.includes(searchQuery) ||
        emp.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.includes(searchQuery) ||
        emp.jobTitle.includes(searchQuery);
      const matchesFilter = activeFilter === 'all' || emp.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [employees, searchQuery, activeFilter]);

  const boolLabel = (v?: boolean) => v ? (ar ? 'نعم' : 'Yes') : (ar ? 'لا' : 'No');

  const genderLabel = (v?: string) => {
    if (!v) return '-';
    const map: Record<string, string> = { male: ar ? 'ذكر' : 'Male', female: ar ? 'أنثى' : 'Female' };
    return map[v] || v;
  };
  const religionLabel = (v?: string) => {
    if (!v) return '-';
    const map: Record<string, string> = { muslim: ar ? 'مسلم' : 'Muslim', christian: ar ? 'مسيحي' : 'Christian' };
    return map[v] || v;
  };
  const maritalLabel = (v?: string) => {
    if (!v) return '-';
    const map: Record<string, string> = { single: ar ? 'أعزب' : 'Single', married: ar ? 'متزوج' : 'Married', divorced: ar ? 'مطلق' : 'Divorced', widowed: ar ? 'أرمل' : 'Widowed' };
    return map[v] || v;
  };
  const militaryLabel = (v?: string) => {
    if (!v) return '-';
    const map: Record<string, string> = { completed: ar ? 'أدى الخدمة' : 'Completed', exempt: ar ? 'معفى' : 'Exempt', postponed: ar ? 'مؤجل' : 'Postponed', 'not-applicable': ar ? 'لا ينطبق' : 'N/A' };
    return map[v] || v;
  };
  const contractLabel = (v?: string) => {
    if (!v) return '-';
    const map: Record<string, string> = { permanent: ar ? 'دائم' : 'Permanent', temporary: ar ? 'مؤقت' : 'Temporary', contract: ar ? 'عقد' : 'Contract', partTime: ar ? 'دوام جزئي' : 'Part Time', fullTime: ar ? 'دوام كامل' : 'Full Time' };
    return map[v] || v;
  };

  const getExportData = () => filteredEmployees.map(e => ({
    employeeId: e.employeeId,
    nameAr: e.nameAr,
    nameEn: e.nameEn,
    firstName: e.firstName || '-',
    fatherName: e.fatherName || '-',
    familyName: e.familyName || '-',
    station: getStationLabel(e.stationLocation),
    deptCode: e.deptCode || '-',
    department: e.department,
    jobTitleAr: e.jobTitleAr || '-',
    jobTitleEn: e.jobTitleEn || '-',
    jobLevel: e.jobLevel || '-',
    jobDegree: e.jobDegree || '-',
    phone: e.phone || '-',
    email: e.email || '-',
    homePhone: e.homePhone || '-',
    nationalId: e.nationalId || '-',
    idIssueDate: e.idIssueDate || '-',
    idExpiryDate: e.idExpiryDate || '-',
    issuingAuthority: e.issuingAuthority || '-',
    issuingGovernorate: e.issuingGovernorate || '-',
    birthDate: e.birthDate || '-',
    birthPlace: e.birthPlace || '-',
    birthGovernorate: e.birthGovernorate || '-',
    gender: genderLabel(e.gender),
    religion: religionLabel(e.religion),
    nationality: e.nationality || '-',
    maritalStatus: maritalLabel(e.maritalStatus),
    childrenCount: e.childrenCount ?? '-',
    educationAr: e.educationAr || '-',
    graduationYear: e.graduationYear || '-',
    address: e.address || '-',
    city: e.city || '-',
    governorate: e.governorate || '-',
    militaryStatus: militaryLabel(e.militaryStatus),
    contractType: contractLabel(e.contractType),
    employmentStatus: e.employmentStatus || '-',
    hireDate: e.hireDate || '-',
    recruitedBy: e.recruitedBy || '-',
    resigned: boolLabel(e.resigned),
    resignationDate: e.resignationDate || '-',
    resignationReason: e.resignationReason || '-',
    basicSalary: e.basicSalary ?? '-',
    annualLeaveBalance: e.annualLeaveBalance ?? '-',
    sickLeaveBalance: e.sickLeaveBalance ?? '-',
    socialInsuranceNo: e.socialInsuranceNo || '-',
    socialInsuranceStartDate: e.socialInsuranceStartDate || '-',
    socialInsuranceEndDate: e.socialInsuranceEndDate || '-',
    hasSocialInsurance: boolLabel(e.hasSocialInsurance),
    hasHealthInsurance: boolLabel(e.hasHealthInsurance),
    hasGovHealthInsurance: boolLabel(e.hasGovHealthInsurance),
    healthInsuranceCardNo: e.healthInsuranceCardNo || '-',
    bankName: e.bankName || '-',
    bankAccountNumber: e.bankAccountNumber || '-',
    bankIdNumber: e.bankIdNumber || '-',
    bankAccountType: e.bankAccountType || '-',
    hasCairoAirportTempPermit: boolLabel(e.hasCairoAirportTempPermit),
    hasCairoAirportAnnualPermit: boolLabel(e.hasCairoAirportAnnualPermit),
    cairoAirportAnnualPermitNo: e.cairoAirportAnnualPermitNo || '-',
    tempPermitNo: e.tempPermitNo || '-',
    annualPermitNo: e.annualPermitNo || '-',
    hasAirportsTempPermit: boolLabel(e.hasAirportsTempPermit),
    hasAirportsAnnualPermit: boolLabel(e.hasAirportsAnnualPermit),
    airportsTempPermitNo: e.airportsTempPermitNo || '-',
    airportsAnnualPermitNo: e.airportsAnnualPermitNo || '-',
    airportsPermitType: e.airportsPermitType || '-',
    permitNameAr: e.permitNameAr || '-',
    permitNameEn: e.permitNameEn || '-',
    emergencyContactName1: e.emergencyContactName1 || '-',
    emergencyContactMobile1: e.emergencyContactMobile1 || '-',
    emergencyContactName2: e.emergencyContactName2 || '-',
    emergencyContactMobile2: e.emergencyContactMobile2 || '-',
    hasQualificationCert: boolLabel(e.hasQualificationCert),
    hasMilitaryServiceCert: boolLabel(e.hasMilitaryServiceCert),
    hasBirthCert: boolLabel(e.hasBirthCert),
    hasIdCopy: boolLabel(e.hasIdCopy),
    hasPledge: boolLabel(e.hasPledge),
    hasContract: boolLabel(e.hasContract),
    hasReceipt: boolLabel(e.hasReceipt),
    status: e.status === 'active' ? (ar ? 'نشط' : 'Active') : e.status === 'inactive' ? (ar ? 'غير نشط' : 'Inactive') : (ar ? 'موقوف' : 'Suspended'),
    notes: e.notes || '-',
    attachments: e.attachments || '-',
  }));

  const reportTitle = ar ? 'تقرير الموظفين' : 'Employee Report';

  // Grouped Excel export with section headers per tab
  const handleExportAll = () => {
    const data = getExportData();
    if (!data.length) {
      toast({ title: ar ? 'لا توجد بيانات للتصدير' : 'No data to export', variant: 'destructive' });
      return;
    }

    const logoUrl = `${window.location.origin}/images/company-logo.png`;
    const dateStr = `${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

    // Flatten all columns from all sections into one row
    const allColumns = exportSections.flatMap(s => s.columns);
    // Remove duplicate keys
    const seen = new Set<string>();
    const uniqueColumns = allColumns.filter(c => { if (seen.has(c.key)) return false; seen.add(c.key); return true; });
    const totalCols = uniqueColumns.length;

    // Section header row (colored group labels spanning their columns)
    const sectionHeaderRow = exportSections.map(section => {
      const colCount = section.columns.length;
      return `<th colspan="${colCount}" style="background-color:#f59e0b;color:white;font-size:12px;font-weight:700;padding:8px;text-align:center;border:2px solid #d97706;">
        <span style="direction:rtl;">${section.titleAr}</span> — ${section.titleEn}
      </th>`;
    }).join('');

    // Column header row
    const headerRow = uniqueColumns.map(c => 
      `<th style="background-color:#1e40af;color:white;font-weight:600;font-size:11px;padding:6px 8px;border:1px solid #1e3a8a;text-align:center;"><div style="direction:rtl;">${c.headerAr}</div><div style="font-weight:400;font-size:10px;color:#dbeafe;">${c.headerEn}</div></th>`
    ).join('');

    // Data rows
    const dataRows = data.map((row, i) =>
      `<tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f0f4ff'};">${uniqueColumns.map(col => 
        `<td style="border:1px solid #d1d5db;padding:8px 10px;font-size:12px;text-align:center;mso-number-format:'\\@';">${String((row as any)[col.key] ?? '')}</td>`
      ).join('')}</tr>`
    ).join('');

    const tablesHtml = `
      <tr><td colspan="${totalCols}" style="height:20px;"></td></tr>
      <tr>${sectionHeaderRow}</tr>
      <tr>${headerRow}</tr>
      ${dataRows}
    `;

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Employees</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>td, th { font-family: 'Calibri', 'Arial', sans-serif; }</style>
      </head>
      <body>
        <table>
          <tr>
            <td style="text-align:left;padding:8px;vertical-align:middle;" rowspan="3"><img src="${logoUrl}" style="height:60px;width:auto;" /></td>
            <td colspan="${totalCols}" style="text-align:center;font-size:22px;font-weight:700;color:#1e40af;padding:12px;direction:rtl;">تقرير بيانات الموظفين الشامل</td>
          </tr>
          <tr><td colspan="${totalCols}" style="text-align:center;font-size:18px;font-weight:600;color:#374151;padding:8px;">Comprehensive Employee Data Report</td></tr>
          <tr><td colspan="${totalCols}" style="text-align:center;color:#6b7280;font-size:13px;padding:8px;">${dateStr}</td></tr>
          ${tablesHtml}
          <tr><td colspan="${totalCols}" style="height:20px;"></td></tr>
          <tr><td colspan="${totalCols}" style="text-align:center;color:#9ca3af;font-size:11px;padding:12px;">تم إنشاء التقرير بواسطة نظام إدارة الموارد البشرية — Generated by HR Management System</td></tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Employees_Full_Report_${new Date().toISOString().slice(0, 10)}.xls`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1000);
    toast({ title: ar ? 'تم التصدير بنجاح' : 'Export completed successfully' });
  };

  // Import from CSV
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast({ title: ar ? 'الملف فارغ أو غير صالح' : 'File is empty or invalid', variant: 'destructive' });
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());

      // Map CSV header to DB column
      const headerMap: Record<string, string> = {
        'employee id': 'employee_code', 'كود الموظف': 'employee_code',
        'name (ar)': 'name_ar', 'الاسم (عربي)': 'name_ar',
        'name (en)': 'name_en', 'الاسم (انجليزي)': 'name_en',
        'first name': 'first_name', 'الاسم الأول': 'first_name',
        'father name': 'father_name', 'اسم الأب': 'father_name',
        'family name': 'family_name', 'اسم العائلة': 'family_name',
        'phone': 'phone', 'الهاتف': 'phone',
        'email': 'email', 'البريد الإلكتروني': 'email',
        'home phone': 'home_phone', 'هاتف المنزل': 'home_phone',
        'national id': 'national_id', 'الرقم القومي': 'national_id',
        'birth date': 'birth_date', 'تاريخ الميلاد': 'birth_date',
        'birth place': 'birth_place', 'محل الميلاد': 'birth_place',
        'gender': 'gender', 'الجنس': 'gender',
        'religion': 'religion', 'الديانة': 'religion',
        'nationality': 'nationality', 'الجنسية': 'nationality',
        'marital status': 'marital_status', 'الحالة الاجتماعية': 'marital_status',
        'children': 'children_count', 'عدد الأطفال': 'children_count',
        'education': 'education_ar', 'المؤهل': 'education_ar',
        'graduation year': 'graduation_year', 'سنة التخرج': 'graduation_year',
        'address': 'address', 'العنوان': 'address',
        'city': 'city', 'المدينة': 'city',
        'governorate': 'governorate', 'المحافظة': 'governorate',
        'military status': 'military_status', 'الموقف من التجنيد': 'military_status',
        'contract type': 'contract_type', 'نوع العقد': 'contract_type',
        'hire date': 'hire_date', 'تاريخ التعيين': 'hire_date',
        'basic salary': 'basic_salary', 'الراتب الأساسي': 'basic_salary',
        'social insurance no': 'social_insurance_no', 'رقم التأمين الاجتماعي': 'social_insurance_no',
        'health insurance card': 'health_insurance_card_no', 'رقم بطاقة التأمين الصحي': 'health_insurance_card_no',
        'bank name': 'bank_name', 'اسم البنك': 'bank_name',
        'bank account': 'bank_account_number', 'رقم الحساب البنكي': 'bank_account_number',
        'job title': 'job_title_ar', 'الوظيفة': 'job_title_ar',
        'notes': 'notes', 'ملاحظات': 'notes',
      };

      const dbColumns = headers.map(h => headerMap[h] || null);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const record: Record<string, any> = {};

        dbColumns.forEach((col, idx) => {
          if (col && values[idx] && values[idx] !== '-') {
            if (col === 'children_count') {
              const num = parseInt(values[idx]);
              if (!isNaN(num)) record[col] = num;
            } else if (col === 'basic_salary') {
              const num = parseFloat(values[idx]);
              if (!isNaN(num)) record[col] = num;
            } else {
              record[col] = values[idx];
            }
          }
        });

        // Skip rows without required fields
        if (!record.employee_code || !record.name_ar || !record.name_en) {
          errorCount++;
          continue;
        }

        const { error } = await (supabase.from('employees') as any).upsert(
          record,
          { onConflict: 'employee_code' }
        );

        if (error) {
          console.error('Import error for row', i, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      toast({
        title: ar
          ? `تم استيراد ${successCount} موظف بنجاح${errorCount > 0 ? ` (${errorCount} أخطاء)` : ''}`
          : `Imported ${successCount} employees successfully${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
      });

      await refreshEmployees();
    } catch (err) {
      console.error('Import failed:', err);
      toast({ title: ar ? 'فشل الاستيراد' : 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-primary rounded-xl p-6">
          <div className={cn("flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center", isRTL && "sm:flex-row-reverse")}>
            <h1 className="text-2xl font-bold text-primary-foreground">{t('employees.title')}</h1>
            <div className={cn("flex flex-wrap gap-2", isRTL && "flex-row-reverse")}>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => refreshEmployees()}><RefreshCw className="w-4 h-4" />{t('employees.refresh')}</Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => handlePrint(reportTitle)}><Printer className="w-4 h-4" />{ar ? 'طباعة' : 'Print'}</Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => exportToPDF({ title: reportTitle, data: getExportData(), columns: exportColumns })}><Download className="w-4 h-4" />PDF</Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={handleExportAll}><FileText className="w-4 h-4" />Excel</Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={handleImportClick} disabled={importing}>
                <Upload className="w-4 h-4" />{importing ? (ar ? 'جاري الاستيراد...' : 'Importing...') : t('employees.importExcel')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button size="sm" className="gap-2 bg-success hover:bg-success/90 text-success-foreground" onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4" />{t('employees.addEmployee')}</Button>
            </div>
          </div>
        </div>
        <EmployeeStatsCards total={counts.all} active={counts.active} departments={departments} newThisMonth={1} />
        <EmployeeFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />
        <div ref={reportRef}>
          <EmployeeTable employees={filteredEmployees} />
        </div>
      </div>
      <AddEmployeeDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </DashboardLayout>
  );
};

export default Employees;
