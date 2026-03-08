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
        // Basic Info
        'employee id': 'employee_code', 'كود الموظف': 'employee_code',
        'name (ar)': 'name_ar', 'الاسم (عربي)': 'name_ar',
        'name (en)': 'name_en', 'الاسم (انجليزي)': 'name_en',
        'first name': 'first_name', 'الاسم الأول': 'first_name',
        'father name': 'father_name', 'اسم الأب': 'father_name',
        'family name': 'family_name', 'اسم العائلة': 'family_name',
        'station location': 'station_id', 'محطة العمل': 'station_id',
        'birth date': 'birth_date', 'تاريخ الميلاد': 'birth_date',
        'birth place': 'birth_place', 'محل الميلاد': 'birth_place',
        'birth governorate': 'birth_governorate', 'محافظة الميلاد': 'birth_governorate',
        'gender': 'gender', 'الجنس': 'gender',
        'religion': 'religion', 'الديانة': 'religion',
        'nationality': 'nationality', 'الجنسية': 'nationality',
        'marital status': 'marital_status', 'الحالة الاجتماعية': 'marital_status',
        'children': 'children_count', 'عدد الأطفال': 'children_count',
        'education': 'education_ar', 'المؤهل': 'education_ar',
        'graduation year': 'graduation_year', 'سنة التخرج': 'graduation_year',
        // Contact
        'phone': 'phone', 'الهاتف': 'phone',
        'email': 'email', 'البريد الإلكتروني': 'email',
        'home phone': 'home_phone', 'هاتف المنزل': 'home_phone',
        'address': 'address', 'العنوان': 'address',
        'city': 'city', 'المدينة': 'city',
        'governorate': 'governorate', 'المحافظة': 'governorate',
        'emergency contact name 1': 'emergency_contact_name1', 'اسم جهة اتصال الطوارئ 1': 'emergency_contact_name1',
        'emergency contact mobile 1': 'emergency_contact_mobile1', 'موبايل جهة اتصال الطوارئ 1': 'emergency_contact_mobile1',
        'emergency contact name 2': 'emergency_contact_name2', 'اسم جهة اتصال الطوارئ 2': 'emergency_contact_name2',
        'emergency contact mobile 2': 'emergency_contact_mobile2', 'موبايل جهة اتصال الطوارئ 2': 'emergency_contact_mobile2',
        // Identity
        'national id': 'national_id', 'الرقم القومي': 'national_id',
        'id issue date': 'id_issue_date', 'تاريخ إصدار البطاقة': 'id_issue_date',
        'id expiry date': 'id_expiry_date', 'تاريخ انتهاء البطاقة': 'id_expiry_date',
        'issuing authority': 'issuing_authority', 'جهة الإصدار': 'issuing_authority',
        'issuing governorate': 'issuing_governorate', 'محافظة الإصدار': 'issuing_governorate',
        'military status': 'military_status', 'الموقف من التجنيد': 'military_status',
        // Job Info
        'department code': 'dept_code', 'القسم (كود)': 'dept_code',
        'job title (ar)': 'job_title_ar', 'الوظيفة (عربي)': 'job_title_ar',
        'job title (en)': 'job_title_en', 'الوظيفة (انجليزي)': 'job_title_en',
        'job title': 'job_title_ar', 'الوظيفة': 'job_title_ar',
        'job degree': 'job_degree', 'الدرجة الوظيفية': 'job_degree',
        'job level': 'job_level', 'المستوى الوظيفي': 'job_level',
        'hire date': 'hire_date', 'تاريخ التعيين': 'hire_date',
        'recruited by': 'recruited_by', 'جهة التعيين': 'recruited_by',
        'employment status': 'employment_status', 'الحالة الوظيفية': 'employment_status',
        'resigned': 'resigned', 'مستقيل': 'resigned',
        'resignation date': 'resignation_date', 'تاريخ الاستقالة': 'resignation_date',
        'resignation reason': 'resignation_reason', 'سبب الاستقالة': 'resignation_reason',
        // Insurance
        'social insurance no': 'social_insurance_no', 'رقم التأمين الاجتماعي': 'social_insurance_no',
        'social insurance start date': 'social_insurance_start_date', 'تاريخ بداية التأمين': 'social_insurance_start_date',
        'social insurance end date': 'social_insurance_end_date', 'تاريخ نهاية التأمين': 'social_insurance_end_date',
        'health insurance card no': 'health_insurance_card_no', 'رقم بطاقة التأمين الصحي': 'health_insurance_card_no',
        'health insurance card': 'health_insurance_card_no',
        'has health insurance': 'has_health_insurance', 'تأمين صحي': 'has_health_insurance',
        'has gov health insurance': 'has_gov_health_insurance', 'تأمين صحي حكومي': 'has_gov_health_insurance',
        'has social insurance': 'has_social_insurance', 'تأمينات اجتماعية': 'has_social_insurance',
        'contract type': 'contract_type', 'نوع العقد': 'contract_type',
        // Permits
        'cairo airport temp permit': 'has_cairo_airport_temp_permit', 'تصريح مطار القاهرة مؤقت': 'has_cairo_airport_temp_permit',
        'temp permit no': 'temp_permit_no', 'رقم التصريح المؤقت': 'temp_permit_no',
        'cairo airport annual permit': 'has_cairo_airport_annual_permit', 'تصريح مطار القاهرة سنوي': 'has_cairo_airport_annual_permit',
        'annual permit no': 'annual_permit_no', 'رقم التصريح السنوي': 'annual_permit_no',
        'airports temp permit': 'has_airports_temp_permit', 'تصريح المطارات مؤقت': 'has_airports_temp_permit',
        'airports temp permit no': 'airports_temp_permit_no', 'رقم تصريح المطارات المؤقت': 'airports_temp_permit_no',
        'airports annual permit': 'has_airports_annual_permit', 'تصريح المطارات سنوي': 'has_airports_annual_permit',
        'airports annual permit no': 'airports_annual_permit_no', 'رقم تصريح المطارات السنوي': 'airports_annual_permit_no',
        'airports permit type': 'airports_permit_type', 'نوع تصريح المطارات': 'airports_permit_type',
        'permit name (en)': 'permit_name_en', 'اسم التصريح (انجليزي)': 'permit_name_en',
        'permit name (ar)': 'permit_name_ar', 'اسم التصريح (عربي)': 'permit_name_ar',
        // Certificates
        'qualification cert': 'has_qualification_cert', 'شهادة مؤهل': 'has_qualification_cert',
        'military service cert': 'has_military_service_cert', 'شهادة خدمة عسكرية': 'has_military_service_cert',
        'birth cert': 'has_birth_cert', 'شهادة ميلاد': 'has_birth_cert',
        'id copy': 'has_id_copy', 'صورة بطاقة': 'has_id_copy',
        'pledge': 'has_pledge', 'تعهد': 'has_pledge',
        'contract doc': 'has_contract', 'عقد': 'has_contract',
        'receipt': 'has_receipt', 'إيصال': 'has_receipt',
        'attachments': 'attachments', 'مرفقات': 'attachments',
        // Salary & Bank
        'basic salary': 'basic_salary', 'الراتب الأساسي': 'basic_salary',
        'bank name': 'bank_name', 'اسم البنك': 'bank_name',
        'bank account': 'bank_account_number', 'رقم الحساب البنكي': 'bank_account_number',
        'bank id number': 'bank_id_number', 'رقم id البنكي': 'bank_id_number',
        'bank account type': 'bank_account_type', 'نوع الحساب البنكي': 'bank_account_type',
        // Dept Code
        'dept code': 'dept_code', 'كود القسم': 'dept_code',
        // Notes
        'notes': 'notes', 'ملاحظات': 'notes',
      };

      const dbColumns = headers.map(h => headerMap[h] || null);

      let successCount = 0;
      let errorCount = 0;
      const errorDetails: string[] = [];
      const unmappedHeaders = headers.filter(h => !headerMap[h]);

      if (unmappedHeaders.length > 0) {
        console.warn('Unmapped headers:', unmappedHeaders);
      }

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const record: Record<string, any> = {};

        const booleanCols = [
          'has_health_insurance', 'has_gov_health_insurance', 'has_social_insurance',
          'has_cairo_airport_temp_permit', 'has_cairo_airport_annual_permit',
          'has_airports_temp_permit', 'has_airports_annual_permit',
          'has_qualification_cert', 'has_military_service_cert', 'has_birth_cert',
          'has_id_copy', 'has_pledge', 'has_contract', 'has_receipt', 'resigned',
        ];
        const numericCols = ['children_count', 'basic_salary'];

        dbColumns.forEach((col, idx) => {
          if (col && values[idx] && values[idx] !== '-') {
            if (booleanCols.includes(col)) {
              const v = values[idx].toLowerCase().trim();
              record[col] = v === 'true' || v === 'نعم' || v === '1' || v === 'yes';
            } else if (numericCols.includes(col)) {
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
          const missing = [];
          if (!record.employee_code) missing.push(ar ? 'كود الموظف' : 'Employee Code');
          if (!record.name_ar) missing.push(ar ? 'الاسم عربي' : 'Name AR');
          if (!record.name_en) missing.push(ar ? 'الاسم انجليزي' : 'Name EN');
          errorDetails.push(ar
            ? `صف ${i}: حقول مطلوبة ناقصة (${missing.join(', ')})`
            : `Row ${i}: Missing required fields (${missing.join(', ')})`);
          continue;
        }

        const { error } = await (supabase.from('employees') as any).upsert(
          record,
          { onConflict: 'employee_code' }
        );

        if (error) {
          console.error('Import error for row', i, error);
          errorCount++;
          errorDetails.push(ar
            ? `صف ${i} (${record.employee_code}): ${error.message}`
            : `Row ${i} (${record.employee_code}): ${error.message}`);
        } else {
          successCount++;
        }
      }

      // Show result with details
      if (errorCount > 0) {
        const detailText = errorDetails.slice(0, 10).join('\n');
        const moreText = errorDetails.length > 10
          ? (ar ? `\n... و ${errorDetails.length - 10} أخطاء أخرى` : `\n... and ${errorDetails.length - 10} more errors`)
          : '';
        const unmappedText = unmappedHeaders.length > 0
          ? (ar ? `\n\nأعمدة غير معروفة: ${unmappedHeaders.join(', ')}` : `\n\nUnmapped columns: ${unmappedHeaders.join(', ')}`)
          : '';

        toast({
          title: ar
            ? `تم استيراد ${successCount} موظف بنجاح (${errorCount} أخطاء)`
            : `Imported ${successCount} successfully (${errorCount} errors)`,
          description: detailText + moreText + unmappedText,
          variant: errorCount > 0 && successCount === 0 ? 'destructive' : 'default',
          duration: 15000,
        });
      } else {
        toast({
          title: ar
            ? `تم استيراد ${successCount} موظف بنجاح`
            : `Imported ${successCount} employees successfully`,
        });
      }

      await refreshEmployees();
    } catch (err) {
      console.error('Import failed:', err);
      toast({ title: ar ? 'فشل الاستيراد' : 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headersAr = [
      // المعلومات الأساسية
      'كود الموظف', 'الاسم (عربي)', 'الاسم (انجليزي)', 'الاسم الأول', 'اسم الأب', 'اسم العائلة',
      'محطة العمل', 'تاريخ الميلاد', 'محل الميلاد', 'محافظة الميلاد',
      'الجنس', 'الديانة', 'الجنسية', 'الحالة الاجتماعية', 'عدد الأطفال', 'المؤهل', 'سنة التخرج',
      // بيانات الاتصال
      'الهاتف', 'البريد الإلكتروني', 'هاتف المنزل',
      'العنوان', 'المدينة', 'المحافظة',
      'اسم جهة اتصال الطوارئ 1', 'موبايل جهة اتصال الطوارئ 1',
      'اسم جهة اتصال الطوارئ 2', 'موبايل جهة اتصال الطوارئ 2',
      // الهوية
      'الرقم القومي', 'تاريخ إصدار البطاقة', 'تاريخ انتهاء البطاقة',
      'جهة الإصدار', 'محافظة الإصدار', 'الموقف من التجنيد',
      // البيانات الوظيفية
      'القسم (كود)', 'الوظيفة (عربي)', 'الوظيفة (انجليزي)',
      'الدرجة الوظيفية', 'المستوى الوظيفي', 'تاريخ التعيين', 'جهة التعيين',
      'الحالة الوظيفية', 'مستقيل', 'تاريخ الاستقالة', 'سبب الاستقالة',
      // التأمينات
      'رقم التأمين الاجتماعي', 'تاريخ بداية التأمين', 'تاريخ نهاية التأمين',
      'رقم بطاقة التأمين الصحي', 'تأمين صحي', 'تأمين صحي حكومي', 'تأمينات اجتماعية',
      'نوع العقد',
      // التصاريح
      'تصريح مطار القاهرة مؤقت', 'رقم التصريح المؤقت',
      'تصريح مطار القاهرة سنوي', 'رقم التصريح السنوي',
      'تصريح المطارات مؤقت', 'رقم تصريح المطارات المؤقت',
      'تصريح المطارات سنوي', 'رقم تصريح المطارات السنوي',
      'نوع تصريح المطارات', 'اسم التصريح (انجليزي)', 'اسم التصريح (عربي)',
      // الشهادات
      'شهادة مؤهل', 'شهادة خدمة عسكرية', 'شهادة ميلاد', 'صورة بطاقة',
      'تعهد', 'عقد', 'إيصال', 'مرفقات',
      // الراتب والبنك
      'الراتب الأساسي', 'اسم البنك', 'رقم الحساب البنكي', 'رقم ID البنكي', 'نوع الحساب البنكي',
      // كود القسم
      'كود القسم',
      // ملاحظات
      'ملاحظات',
    ];
    const headersEn = [
      // Basic Info
      'Employee ID', 'Name (AR)', 'Name (EN)', 'First Name', 'Father Name', 'Family Name',
      'Station Location', 'Birth Date', 'Birth Place', 'Birth Governorate',
      'Gender', 'Religion', 'Nationality', 'Marital Status', 'Children', 'Education', 'Graduation Year',
      // Contact
      'Phone', 'Email', 'Home Phone',
      'Address', 'City', 'Governorate',
      'Emergency Contact Name 1', 'Emergency Contact Mobile 1',
      'Emergency Contact Name 2', 'Emergency Contact Mobile 2',
      // Identity
      'National ID', 'ID Issue Date', 'ID Expiry Date',
      'Issuing Authority', 'Issuing Governorate', 'Military Status',
      // Job Info
      'Department Code', 'Job Title (AR)', 'Job Title (EN)',
      'Job Degree', 'Job Level', 'Hire Date', 'Recruited By',
      'Employment Status', 'Resigned', 'Resignation Date', 'Resignation Reason',
      // Insurance
      'Social Insurance No', 'Social Insurance Start Date', 'Social Insurance End Date',
      'Health Insurance Card No', 'Has Health Insurance', 'Has Gov Health Insurance', 'Has Social Insurance',
      'Contract Type',
      // Permits
      'Cairo Airport Temp Permit', 'Temp Permit No',
      'Cairo Airport Annual Permit', 'Annual Permit No',
      'Airports Temp Permit', 'Airports Temp Permit No',
      'Airports Annual Permit', 'Airports Annual Permit No',
      'Airports Permit Type', 'Permit Name (EN)', 'Permit Name (AR)',
      // Certificates
      'Qualification Cert', 'Military Service Cert', 'Birth Cert', 'ID Copy',
      'Pledge', 'Contract Doc', 'Receipt', 'Attachments',
      // Salary & Bank
      'Basic Salary', 'Bank Name', 'Bank Account', 'Bank ID Number', 'Bank Account Type',
      // Dept Code
      'Dept Code',
      // Notes
      'Notes',
    ];
    const headers = ar ? headersAr : headersEn;
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Template</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body><table border="1"><tr>${headers.map(h => `<th style="background:#1e3a5f;color:white;padding:8px;min-width:120px;">${h}</th>`).join('')}</tr><tr>${headers.map(() => '<td></td>').join('')}</tr></table></body></html>`;
    const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ar ? 'قالب_استيراد_الموظفين.xls' : 'employee_import_template.xls';
    a.click();
    URL.revokeObjectURL(url);
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
              <Button variant="secondary" size="sm" className="gap-2" onClick={downloadTemplate}><Download className="w-4 h-4" />{ar ? 'قالب الاستيراد' : 'Template'}</Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={handleImportClick} disabled={importing}>
                <Upload className="w-4 h-4" />{importing ? (ar ? 'جاري الاستيراد...' : 'Importing...') : t('employees.importExcel')}
              </Button>
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
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />
    </DashboardLayout>
  );
};

export default Employees;
