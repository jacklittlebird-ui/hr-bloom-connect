import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, UserPlus, UserMinus, Building2, Download, FileText, Printer, Save, BookmarkPlus, Trash2, RotateCcw, Languages, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { usePersistedState } from '@/hooks/usePersistedState';
import { toast } from '@/hooks/use-toast';

interface ExportPreset {
  id: string;
  name: string;
  department: string;
  station: string;
  status: string;
  createdAt: string;
}

export const EmployeeReports = () => {
  const { t, isRTL } = useLanguage();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { employees } = useEmployeeData();
  // Persist filters across tab switches/navigation
  const [department, setDepartment] = usePersistedState<string>('hr_emp_report_department', 'all');
  const [station, setStation] = usePersistedState<string>('hr_emp_report_station', 'all');
  const [status, setStatus] = usePersistedState<string>('hr_emp_report_status', 'all');
  const [activePresetId, setActivePresetId] = usePersistedState<string | null>('hr_emp_report_active_preset', null);
  const { reportRef, handlePrint, exportToCSV, exportBilingualCSV, exportBilingualPDF } = useReportExport();

  // Presets
  const [presets, setPresets] = usePersistedState<ExportPreset[]>('hr_report_presets', []);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetToDelete, setPresetToDelete] = useState<ExportPreset | null>(null);
  const [deletingPreset, setDeletingPreset] = useState(false);

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(d => d && d !== '-'));
    return Array.from(depts);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesDept = department === 'all' || emp.department === department;
      const matchesStation = station === 'all' || emp.stationLocation === station;
      const matchesStatus = status === 'all' || emp.status === status;
      return matchesDept && matchesStation && matchesStatus;
    });
  }, [employees, department, station, status]);

  const realStats = useMemo(() => [
    { label: t('reports.totalEmployees'), value: filteredEmployees.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: ar ? 'نشط' : 'Active', value: filteredEmployees.filter(e => e.status === 'active').length, icon: UserPlus, color: 'text-success', bg: 'bg-success/10' },
    { label: ar ? 'غير نشط' : 'Inactive', value: filteredEmployees.filter(e => e.status === 'inactive').length, icon: UserMinus, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: ar ? 'موقوف' : 'Suspended', value: filteredEmployees.filter(e => e.status === 'suspended').length, icon: Building2, color: 'text-warning', bg: 'bg-warning/10' },
  ], [filteredEmployees, t, ar]);

  const realDeptData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEmployees.forEach(e => { map[e.department] = (map[e.department] || 0) + 1; });
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [filteredEmployees]);

  const realStationData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEmployees.forEach(e => {
      const st = e.stationLocation || (ar ? 'غير محدد' : 'Unassigned');
      const label = stationLocations.find(s => s.value === st);
      const key = label ? (ar ? label.labelAr : label.labelEn) : st;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredEmployees, ar]);

  const getStationLabel = (val: string) => {
    if (val === 'all') return ar ? 'جميع المحطات' : 'All Stations';
    const s = stationLocations.find(s => s.value === val);
    return s ? (ar ? s.labelAr : s.labelEn) : val;
  };

  const getStatusLabel = (val: string) => {
    if (val === 'all') return ar ? 'جميع الحالات' : 'All Status';
    if (val === 'active') return ar ? 'نشط' : 'Active';
    if (val === 'inactive') return ar ? 'غير نشط' : 'Inactive';
    return ar ? 'موقوف' : 'Suspended';
  };

  const getEmployeeExportColumns = () => [
    { header: ar ? 'كود الموظف' : 'Employee ID', key: 'employeeId' },
    { header: ar ? 'الاسم' : 'Name', key: 'name' },
    { header: ar ? 'المحطة' : 'Station', key: 'station' },
    { header: ar ? 'القسم' : 'Department', key: 'department' },
    { header: ar ? 'الوظيفة' : 'Job Title', key: 'jobTitle' },
    { header: ar ? 'الهاتف' : 'Phone', key: 'phone' },
    { header: ar ? 'الحالة' : 'Status', key: 'status' },
  ];

  const getEmployeeExportData = () => filteredEmployees.map(e => ({
    employeeId: e.employeeId,
    name: ar ? e.nameAr : e.nameEn,
    station: (() => { const s = stationLocations.find(s => s.value === e.stationLocation); return s ? (ar ? s.labelAr : s.labelEn) : (e.stationLocation || '-'); })(),
    department: e.department,
    jobTitle: e.jobTitle,
    phone: e.phone || '-',
    status: e.status === 'active' ? (ar ? 'نشط' : 'Active') : e.status === 'inactive' ? (ar ? 'غير نشط' : 'Inactive') : (ar ? 'موقوف' : 'Suspended'),
  }));

  const getBilingualColumns = () => [
    { headerAr: 'كود الموظف', headerEn: 'Employee ID', key: 'employeeId' },
    { headerAr: 'الاسم (عربي)', headerEn: 'Name (AR)', key: 'nameAr' },
    { headerAr: 'الاسم (انجليزي)', headerEn: 'Name (EN)', key: 'nameEn' },
    { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
    { headerAr: 'القسم', headerEn: 'Department', key: 'department' },
    { headerAr: 'الوظيفة', headerEn: 'Job Title', key: 'jobTitle' },
    { headerAr: 'الهاتف', headerEn: 'Phone', key: 'phone' },
    { headerAr: 'الحالة', headerEn: 'Status', key: 'status' },
  ];

  const getBilingualExportData = () => filteredEmployees.map(e => {
    const s = stationLocations.find(s => s.value === e.stationLocation);
    return {
      employeeId: e.employeeId,
      nameAr: e.nameAr,
      nameEn: e.nameEn,
      station: s ? `${s.labelAr} / ${s.labelEn}` : (e.stationLocation || '-'),
      department: e.department,
      jobTitle: e.jobTitle,
      phone: e.phone || '-',
      status: e.status === 'active' ? 'نشط / Active' : e.status === 'inactive' ? 'غير نشط / Inactive' : 'موقوف / Suspended',
    };
  });

  const reportTitle = t('reports.tabs.employees');

  // Multi-page PDF export
  const exportMultiPagePDF = useCallback(() => {
    const data = getEmployeeExportData();
    if (!data.length) {
      toast({ title: ar ? 'لا توجد بيانات للتصدير' : 'No data to export', variant: 'destructive' });
      return;
    }
    const columns = getEmployeeExportColumns();
    const filterSummary = [
      department !== 'all' ? `${ar ? 'القسم' : 'Dept'}: ${department}` : null,
      station !== 'all' ? `${ar ? 'المحطة' : 'Station'}: ${getStationLabel(station)}` : null,
      status !== 'all' ? `${ar ? 'الحالة' : 'Status'}: ${getStatusLabel(status)}` : null,
    ].filter(Boolean).join(' | ') || (ar ? 'بدون فلاتر' : 'No filters');

    const statsHtml = realStats.map(s =>
      `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`
    ).join('');

    const deptTableHtml = realDeptData.map(d =>
      `<tr><td>${d.name}</td><td>${d.value}</td><td>${filteredEmployees.length ? ((d.value / filteredEmployees.length) * 100).toFixed(1) : 0}%</td></tr>`
    ).join('');

    const stationTableHtml = realStationData.map(d =>
      `<tr><td>${d.name}</td><td>${d.value}</td><td>${filteredEmployees.length ? ((d.value / filteredEmployees.length) * 100).toFixed(1) : 0}%</td></tr>`
    ).join('');

    const ROWS_PER_PAGE = 25;
    const pages = [];
    for (let i = 0; i < data.length; i += ROWS_PER_PAGE) {
      pages.push(data.slice(i, i + ROWS_PER_PAGE));
    }

    const employeePages = pages.map((page, pageIdx) => `
      <div class="page-break">
        <h2>${ar ? 'بيانات الموظفين' : 'Employee Data'} (${ar ? 'صفحة' : 'Page'} ${pageIdx + 1}/${pages.length})</h2>
        <table>
          <thead><tr>${columns.map(c => `<th>${c.header}</th>`).join('')}</tr></thead>
          <tbody>${page.map(row => `<tr>${columns.map(col => `<td>${String(row[col.key as keyof typeof row] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${reportTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; padding: 30px; direction: ${isRTL ? 'rtl' : 'ltr'}; color: #1f2937; }
          h1 { text-align: center; margin-bottom: 4px; font-size: 24px; color: #1e40af; }
          h2 { font-size: 18px; color: #1e40af; margin: 20px 0 12px; border-bottom: 2px solid #1e40af; padding-bottom: 6px; }
          .subtitle { text-align: center; color: #6b7280; margin-bottom: 6px; font-size: 13px; }
          .filter-bar { background: #f0f4ff; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; text-align: center; font-size: 13px; color: #374151; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; text-align: center; background: #fafbfc; }
          .stat-value { font-size: 28px; font-weight: 700; color: #1e40af; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 12px; }
          th { background-color: #1e40af; color: white; font-weight: 600; }
          tr:nth-child(even) { background-color: #f0f4ff; }
          .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          .page-break { page-break-before: always; }
          .page-break:first-child { page-break-before: auto; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <!-- Page 1: Summary -->
        <h1>${reportTitle}</h1>
        <p class="subtitle">${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div class="filter-bar">${ar ? 'الفلاتر المطبقة' : 'Applied Filters'}: ${filterSummary}</div>
        <div class="stats-grid">${statsHtml}</div>
        
        <div class="summary-grid">
          <div>
            <h2>${ar ? 'التوزيع حسب القسم' : 'By Department'}</h2>
            <table>
              <thead><tr><th>${ar ? 'القسم' : 'Department'}</th><th>${ar ? 'العدد' : 'Count'}</th><th>${ar ? 'النسبة' : '%'}</th></tr></thead>
              <tbody>${deptTableHtml}</tbody>
            </table>
          </div>
          <div>
            <h2>${ar ? 'التوزيع حسب المحطة' : 'By Station'}</h2>
            <table>
              <thead><tr><th>${ar ? 'المحطة' : 'Station'}</th><th>${ar ? 'العدد' : 'Count'}</th><th>${ar ? 'النسبة' : '%'}</th></tr></thead>
              <tbody>${stationTableHtml}</tbody>
            </table>
          </div>
        </div>

        <!-- Page 2+: Employee data -->
        ${employeePages}

        <p class="footer">${ar ? 'تم إنشاء التقرير بواسطة نظام إدارة الموارد البشرية' : 'Generated by HR Management System'} — ${new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: ar ? 'يرجى السماح بالنوافذ المنبثقة' : 'Please allow popups', variant: 'destructive' });
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 600);
    toast({ title: ar ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully' });
  }, [filteredEmployees, realStats, realDeptData, realStationData, department, station, status, ar, isRTL, reportTitle]);

  // Presets management — uniqueness + cap
  const MAX_PRESETS = 10;
  const savePreset = useCallback(() => {
    const name = presetName.trim();
    if (!name) return;
    if (presets.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      toast({
        title: ar ? 'الاسم مستخدم بالفعل' : 'Name already exists',
        description: ar ? 'الرجاء اختيار اسم آخر للإعداد' : 'Please choose a different preset name',
        variant: 'destructive',
      });
      return;
    }
    if (presets.length >= MAX_PRESETS) {
      toast({
        title: ar ? 'تم بلوغ الحد الأقصى' : 'Maximum reached',
        description: ar
          ? `يمكن حفظ ${MAX_PRESETS} إعدادات كحد أقصى. احذف واحداً قبل الإضافة.`
          : `Up to ${MAX_PRESETS} presets allowed. Delete one before adding.`,
        variant: 'destructive',
      });
      return;
    }
    const newPreset: ExportPreset = {
      id: Date.now().toString(),
      name,
      department,
      station,
      status,
      createdAt: new Date().toISOString(),
    };
    setPresets(prev => [...prev, newPreset]);
    setPresetName('');
    setSaveDialogOpen(false);
    toast({ title: ar ? 'تم حفظ الإعداد المسبق' : 'Preset saved' });
  }, [presetName, presets, department, station, status, ar, setPresets]);

  const loadPreset = useCallback((preset: ExportPreset) => {
    setDepartment(preset.department);
    setStation(preset.station);
    setStatus(preset.status);
    setActivePresetId(preset.id);
    toast({ title: ar ? `تم تحميل: ${preset.name}` : `Loaded: ${preset.name}` });
  }, [ar, setDepartment, setStation, setStatus, setActivePresetId]);

  // Open confirmation dialog instead of deleting immediately
  const requestDeletePreset = useCallback((preset: ExportPreset) => {
    setPresetToDelete(preset);
  }, []);

  const confirmDeletePreset = useCallback(async () => {
    if (!presetToDelete || deletingPreset) return;
    setDeletingPreset(true);
    try {
      // Tiny delay to surface loading state for visual feedback
      await new Promise(r => setTimeout(r, 150));
      const id = presetToDelete.id;
      setPresets(prev => prev.filter(p => p.id !== id));
      if (activePresetId === id) setActivePresetId(null);
      toast({
        title: ar ? 'تم حذف الإعداد المسبق' : 'Preset deleted',
        description: ar ? `الاسم: ${presetToDelete.name}` : `Name: ${presetToDelete.name}`,
      });
      setPresetToDelete(null);
    } finally {
      setDeletingPreset(false);
    }
  }, [presetToDelete, deletingPreset, activePresetId, ar, setPresets, setActivePresetId]);

  const resetFilters = useCallback(() => {
    setDepartment('all');
    setStation('all');
    setStatus('all');
    setActivePresetId(null);
    toast({ title: ar ? 'تمت إعادة ضبط الفلاتر' : 'Filters reset' });
  }, [ar, setDepartment, setStation, setStatus, setActivePresetId]);

  const hasActiveFilters = department !== 'all' || station !== 'all' || status !== 'all';

  // Wrap setters so manual changes clear the active preset selection
  const onChangeDepartment = (v: string) => { setDepartment(v); if (activePresetId) setActivePresetId(null); };
  const onChangeStation = (v: string) => { setStation(v); if (activePresetId) setActivePresetId(null); };
  const onChangeStatus = (v: string) => { setStatus(v); if (activePresetId) setActivePresetId(null); };

  return (
    <div className="space-y-6">
      {/* Filters + Actions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className={cn("flex flex-wrap gap-4 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex flex-wrap gap-3", isRTL && "flex-row-reverse")}>
              <Select value={department} onValueChange={onChangeDepartment}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allDepartments')}</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="w-44"><SelectValue placeholder={ar ? 'المحطة/الموقع' : 'Station'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stationLocations.map(s => (
                    <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع الحالات' : 'All Status'}</SelectItem>
                  <SelectItem value="active">{ar ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="inactive">{ar ? 'غير نشط' : 'Inactive'}</SelectItem>
                  <SelectItem value="suspended">{ar ? 'موقوف' : 'Suspended'}</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground">
                  <RotateCcw className="w-4 h-4" />{ar ? 'إعادة ضبط' : 'Reset'}
                </Button>
              )}
            </div>
            <div className={cn("flex gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
              <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)} className="gap-1">
                <BookmarkPlus className="w-4 h-4" />{ar ? 'حفظ إعداد' : 'Save Preset'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handlePrint(reportTitle)} className="gap-1">
                <Printer className="w-4 h-4" />{ar ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportMultiPagePDF} className="gap-1">
                <Download className="w-4 h-4" />PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToCSV({ title: reportTitle, data: getEmployeeExportData(), columns: getEmployeeExportColumns() })} className="gap-1">
                <FileText className="w-4 h-4" />CSV
              </Button>
              <Button variant="default" size="sm" onClick={() => exportBilingualPDF({ titleAr: 'تقرير الموظفين', titleEn: 'Employee Report', data: getBilingualExportData(), columns: getBilingualColumns() })} className="gap-1">
                <Languages className="w-4 h-4" />PDF {ar ? 'ثنائي' : 'Bilingual'}
              </Button>
              <Button variant="default" size="sm" onClick={() => exportBilingualCSV({ titleAr: 'تقرير الموظفين', titleEn: 'Employee_Report', data: getBilingualExportData(), columns: getBilingualColumns() })} className="gap-1">
                <Languages className="w-4 h-4" />CSV {ar ? 'ثنائي' : 'Bilingual'}
              </Button>
            </div>
          </div>

          {/* Saved Presets */}
          {presets.length > 0 && (
            <div className={cn("flex flex-wrap gap-2 items-center pt-2 border-t border-border", isRTL && "flex-row-reverse")}>
              <span className="text-xs text-muted-foreground font-medium">{ar ? 'الإعدادات المحفوظة:' : 'Saved Presets:'}</span>
              {presets.map(p => {
                const isActive = activePresetId === p.id;
                return (
                  <div key={p.id} className="flex items-center gap-1">
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className={cn(
                        'cursor-pointer transition-colors px-3 py-1',
                        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10',
                      )}
                      onClick={() => loadPreset(p)}
                      aria-pressed={isActive}
                    >
                      {p.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => requestDeletePreset(p)}
                      aria-label={ar ? `حذف الإعداد ${p.name}` : `Delete preset ${p.name}`}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active filter summary */}
      {hasActiveFilters && (
        <div className={cn("flex flex-wrap gap-2", isRTL && "flex-row-reverse")}>
          {department !== 'all' && <Badge variant="outline" className="gap-1">{ar ? 'القسم' : 'Dept'}: {department}</Badge>}
          {station !== 'all' && <Badge variant="outline" className="gap-1">{ar ? 'المحطة' : 'Station'}: {getStationLabel(station)}</Badge>}
          {status !== 'all' && <Badge variant="outline" className="gap-1">{ar ? 'الحالة' : 'Status'}: {getStatusLabel(status)}</Badge>}
          <Badge className="bg-primary/10 text-primary">{filteredEmployees.length} {ar ? 'موظف' : 'employees'}</Badge>
        </div>
      )}

      <div ref={reportRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {realStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                  <div className={cn("p-3 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader><CardTitle>{t('reports.departmentDistribution')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={realDeptData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {realDeptData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{ar ? 'التوزيع حسب المحطة' : 'Distribution by Station'}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realStationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" name={ar ? 'الموظفين' : 'Employees'} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{ar ? 'حفظ إعداد مسبق' : 'Save Export Preset'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{ar ? 'اسم الإعداد' : 'Preset Name'}</label>
              <Input
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder={ar ? 'مثال: تقرير القاهرة - النشطين' : 'e.g. Cairo Active Report'}
                onKeyDown={e => e.key === 'Enter' && savePreset()}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{ar ? 'الفلاتر الحالية:' : 'Current filters:'}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{ar ? 'القسم' : 'Dept'}: {department === 'all' ? (ar ? 'الكل' : 'All') : department}</Badge>
                <Badge variant="outline">{ar ? 'المحطة' : 'Station'}: {getStationLabel(station)}</Badge>
                <Badge variant="outline">{ar ? 'الحالة' : 'Status'}: {getStatusLabel(status)}</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={savePreset} disabled={!presetName.trim()} className="gap-1">
              <Save className="w-4 h-4" />{ar ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
