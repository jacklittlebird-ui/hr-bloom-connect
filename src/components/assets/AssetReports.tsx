import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Printer, FileSpreadsheet, Download, Package, Coins, Wrench, TrendingUp, MapPin, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';
import type { Asset } from './AssetRegistry';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export const AssetReports = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();
  const stationPrintRef = useRef<HTMLDivElement>(null);
  const { employees } = useEmployeeData();

  // Real data from DB
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stations, setStations] = useState<{ id: string; name_ar: string; name_en: string; code: string }[]>([]);

  const fetchAssets = useCallback(async () => {
    const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (data) {
      setAssets(data.map(a => ({
        id: a.id, assetCode: a.asset_code, nameAr: a.name_ar, nameEn: a.name_en,
        category: a.category as Asset['category'], brand: a.brand || '', model: a.model || '',
        serialNumber: a.serial_number || '', purchaseDate: a.purchase_date || '',
        purchasePrice: a.purchase_price ?? 0, status: a.status as Asset['status'],
        condition: (a.condition || 'good') as Asset['condition'], location: a.location || '',
        notes: a.notes || '', assignedTo: a.assigned_to || undefined,
      })));
    }
  }, []);

  const fetchStations = useCallback(async () => {
    const { data } = await supabase.from('stations').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar');
    if (data) setStations(data);
  }, []);

  useEffect(() => { fetchAssets(); fetchStations(); }, [fetchAssets, fetchStations]);

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const getEmpName = (empId?: string) => {
    if (!empId) return ar ? 'غير معيّن' : 'Unassigned';
    const emp = employees.find(e => e.id === empId);
    return emp ? (ar ? emp.nameAr : emp.nameEn) : (ar ? 'غير معيّن' : 'Unassigned');
  };

  const getStationName = (stationId?: string) => {
    if (!stationId) return ar ? 'غير محدد' : 'Unknown';
    const st = stations.find(s => s.id === stationId);
    return st ? (ar ? st.name_ar : st.name_en) : stationId;
  };

  // Get location label for an asset - resolve via assigned employee's station
  const getAssetLocation = (asset: Asset) => {
    if (asset.location) return asset.location;
    if (asset.assignedTo) {
      const emp = employees.find(e => e.id === asset.assignedTo);
      if (emp?.stationId) return getStationName(emp.stationId);
    }
    return ar ? 'غير محدد' : 'Unknown';
  };

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (employeeFilter !== 'all') {
        if (employeeFilter === 'unassigned') return !a.assignedTo;
        if (a.assignedTo !== employeeFilter) return false;
      }
      if (locationFilter !== 'all') {
        const loc = getAssetLocation(a);
        if (loc !== locationFilter) return false;
      }
      return true;
    });
  }, [assets, employeeFilter, locationFilter, employees, stations]);

  // Unique assigned employees (by UUID)
  const assignedEmployees = useMemo(() => {
    const ids = new Set(assets.filter(a => a.assignedTo).map(a => a.assignedTo!));
    return Array.from(ids).map(id => ({
      id,
      name: getEmpName(id),
    }));
  }, [assets, ar, employees]);

  // Unique locations from stations
  const locationOptions = useMemo(() => {
    return stations.map(s => ({
      value: ar ? s.name_ar : s.name_en,
      label: ar ? s.name_ar : s.name_en,
    }));
  }, [stations, ar]);

  // KPIs
  const totalValue = useMemo(() => filteredAssets.reduce((s, a) => s + a.purchasePrice, 0), [filteredAssets]);
  const assignedCount = useMemo(() => filteredAssets.filter(a => a.status === 'assigned').length, [filteredAssets]);
  const availableCount = useMemo(() => filteredAssets.filter(a => a.status === 'available').length, [filteredAssets]);
  const maintenanceCount = useMemo(() => filteredAssets.filter(a => a.status === 'maintenance').length, [filteredAssets]);
  const retiredCount = useMemo(() => filteredAssets.filter(a => a.status === 'retired').length, [filteredAssets]);
  const poorCondCount = useMemo(() => filteredAssets.filter(a => a.condition === 'poor').length, [filteredAssets]);
  const utilization = filteredAssets.length > 0 ? Math.round((assignedCount / filteredAssets.length) * 100) : 0;
  const avgValue = filteredAssets.length > 0 ? Math.round(totalValue / filteredAssets.length) : 0;

  // Chart data
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredAssets.forEach(a => { cats[a.category] = (cats[a.category] || 0) + 1; });
    return Object.entries(cats).map(([key, value], i) => ({
      name: t(`assets.category.${key}`), value, color: COLORS[i % COLORS.length],
    }));
  }, [filteredAssets, t]);

  const statusData = useMemo(() => [
    { status: t('assets.status.available'), count: availableCount },
    { status: t('assets.status.assigned'), count: assignedCount },
    { status: t('assets.status.maintenance'), count: maintenanceCount },
    { status: t('assets.status.retired'), count: retiredCount },
  ], [availableCount, assignedCount, maintenanceCount, retiredCount, t]);

  const stationData = useMemo(() => {
    const locMap: Record<string, { count: number; value: number; assigned: number; available: number; maintenance: number; retired: number }> = {};
    filteredAssets.forEach(a => {
      const loc = getAssetLocation(a);
      if (!locMap[loc]) locMap[loc] = { count: 0, value: 0, assigned: 0, available: 0, maintenance: 0, retired: 0 };
      locMap[loc].count += 1;
      locMap[loc].value += a.purchasePrice;
      if (a.status === 'assigned' || a.status === 'available' || a.status === 'maintenance' || a.status === 'retired') {
        locMap[loc][a.status] += 1;
      }
    });
    return Object.entries(locMap).map(([location, data]) => ({ location, ...data })).sort((a, b) => b.count - a.count);
  }, [filteredAssets]);

  const conditionData = useMemo(() => {
    const conds: Record<string, number> = {};
    filteredAssets.forEach(a => { conds[a.condition] = (conds[a.condition] || 0) + 1; });
    return Object.entries(conds).map(([key, value], i) => ({
      name: t(`assets.condition.${key}`), value, color: COLORS[i % COLORS.length],
    }));
  }, [filteredAssets, t]);

  const employeeAssetData = useMemo(() => {
    const empMap: Record<string, { count: number; value: number }> = {};
    filteredAssets.filter(a => a.assignedTo).forEach(a => {
      const id = a.assignedTo!;
      if (!empMap[id]) empMap[id] = { count: 0, value: 0 };
      empMap[id].count += 1;
      empMap[id].value += a.purchasePrice;
    });
    return Object.entries(empMap).map(([empId, data]) => ({
      empId, name: getEmpName(empId), ...data,
    })).sort((a, b) => b.value - a.value);
  }, [filteredAssets, employees, ar]);

  const stats = [
    { label: ar ? 'إجمالي الأصول' : 'Total Assets', value: String(filteredAssets.length), icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    { label: ar ? 'إجمالي القيمة' : 'Total Value', value: filteredAssets.length > 0 ? `${(totalValue / 1000).toFixed(0)}K` : '0', icon: Coins, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: ar ? 'نسبة الاستخدام' : 'Utilization', value: `${utilization}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: ar ? 'قيد الصيانة' : 'Maintenance', value: String(maintenanceCount), icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: ar ? 'متاح' : 'Available', value: String(availableCount), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: ar ? 'مُعيّن' : 'Assigned', value: String(assignedCount), icon: Users, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
    { label: ar ? 'حالة سيئة' : 'Poor Condition', value: String(poorCondCount), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: ar ? 'متوسط القيمة' : 'Avg Value', value: filteredAssets.length > 0 ? `${(avgValue / 1000).toFixed(0)}K` : '0', icon: Coins, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  ];

  const exportColumns = [
    { header: ar ? 'الكود' : 'Code', key: 'assetCode' },
    { header: ar ? 'الاسم' : 'Name', key: 'name' },
    { header: ar ? 'التصنيف' : 'Category', key: 'categoryLabel' },
    { header: ar ? 'الماركة' : 'Brand', key: 'brand' },
    { header: ar ? 'الموقع' : 'Location', key: 'location' },
    { header: ar ? 'الحالة' : 'Status', key: 'statusLabel' },
    { header: ar ? 'معيّن لـ' : 'Assigned To', key: 'assignedName' },
    { header: ar ? 'سعر الشراء' : 'Price', key: 'purchasePrice' },
  ];

  const exportData = filteredAssets.map(a => ({
    assetCode: a.assetCode,
    name: ar ? a.nameAr : a.nameEn,
    categoryLabel: t(`assets.category.${a.category}`),
    brand: a.brand,
    location: getAssetLocation(a),
    statusLabel: t(`assets.status.${a.status}`),
    assignedName: getEmpName(a.assignedTo),
    purchasePrice: a.purchasePrice.toLocaleString(),
  }));

  const handleExportCSV = () => exportToCSV({ title: ar ? 'تقرير الأصول' : 'Assets Report', data: exportData, columns: exportColumns, fileName: 'assets_report' });
  const handleExportPDF = () => exportToPDF({ title: ar ? 'تقرير الأصول' : 'Assets Report', data: exportData, columns: exportColumns, fileName: 'assets_report' });
  const handlePrintReport = () => handlePrint(ar ? 'تقرير الأصول' : 'Assets Report');

  const handlePrintStationReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dir = isRTL ? 'rtl' : 'ltr';
    printWindow.document.write(`<!DOCTYPE html><html dir="${dir}" lang="${language}"><head><meta charset="utf-8"><title>${ar ? 'تقرير الأصول حسب المحطة' : 'Assets by Station Report'}</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Cairo', 'Segoe UI', sans-serif; padding: 20px; direction: ${dir}; }
      h1 { text-align: center; margin-bottom: 8px; font-size: 22px; }
      h2 { margin: 24px 0 12px; font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
      .meta { text-align: center; color: #666; margin-bottom: 24px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
      th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: ${isRTL ? 'right' : 'left'}; }
      th { background: #f3f4f6; font-weight: 600; }
      tr:nth-child(even) { background: #f9fafb; }
      .total-row { background: #e5e7eb !important; font-weight: bold; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; }
      .page-break { page-break-before: always; }
      @media print { body { padding: 10px; } }
    </style></head><body>`);

    printWindow.document.write(`<h1>${ar ? 'تقرير الأصول حسب المحطة/الموقع' : 'Assets Report by Station/Location'}</h1>`);
    printWindow.document.write(`<p class="meta">${ar ? 'تاريخ الطباعة:' : 'Print Date:'} ${new Date().toLocaleDateString(ar ? 'ar-EG' : 'en-US')} | ${ar ? 'إجمالي الأصول:' : 'Total Assets:'} ${filteredAssets.length} | ${ar ? 'إجمالي القيمة:' : 'Total Value:'} ${totalValue.toLocaleString()} ${ar ? 'ج.م' : 'EGP'}</p>`);

    stationData.forEach((station, idx) => {
      const stationAssets = filteredAssets.filter(a => getAssetLocation(a) === station.location);
      if (idx > 0) printWindow.document.write(`<div class="page-break"></div>`);
      printWindow.document.write(`<h2>${station.location} (${stationAssets.length})</h2>`);
      printWindow.document.write(`<table><thead><tr>
        <th>${ar ? 'الكود' : 'Code'}</th><th>${ar ? 'الاسم' : 'Name'}</th>
        <th>${ar ? 'التصنيف' : 'Category'}</th><th>${ar ? 'الماركة' : 'Brand'}</th>
        <th>${ar ? 'معيّن لـ' : 'Assigned To'}</th><th>${ar ? 'الحالة' : 'Status'}</th>
        <th>${ar ? 'السعر' : 'Price'}</th>
      </tr></thead><tbody>`);
      stationAssets.forEach(a => {
        printWindow.document.write(`<tr>
          <td>${a.assetCode}</td><td>${ar ? a.nameAr : a.nameEn}</td>
          <td>${t(`assets.category.${a.category}`)}</td><td>${a.brand}</td>
          <td>${getEmpName(a.assignedTo)}</td>
          <td>${t(`assets.status.${a.status}`)}</td>
          <td>${a.purchasePrice.toLocaleString()} ${ar ? 'ج.م' : 'EGP'}</td>
        </tr>`);
      });
      const stationTotal = stationAssets.reduce((s, a) => s + a.purchasePrice, 0);
      printWindow.document.write(`<tr class="total-row"><td colspan="6">${ar ? 'الإجمالي' : 'Total'}</td>
        <td>${stationTotal.toLocaleString()} ${ar ? 'ج.م' : 'EGP'}</td></tr>`);
      printWindow.document.write(`</tbody></table>`);
    });

    printWindow.document.write(`</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-3 items-center", isRTL && "flex-row-reverse")}>
            {/* Employee Filter */}
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[200px]">
                <Users className="w-4 h-4 shrink-0 opacity-60" />
                <SelectValue placeholder={ar ? 'فلتر الموظف' : 'Filter by Employee'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'جميع الموظفين' : 'All Employees'}</SelectItem>
                <SelectItem value="unassigned">{ar ? 'غير معيّن' : 'Unassigned'}</SelectItem>
                {assignedEmployees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter - Real Stations */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[200px]">
                <MapPin className="w-4 h-4 shrink-0 opacity-60" />
                <SelectValue placeholder={ar ? 'فلتر الموقع' : 'Filter by Location'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'جميع المواقع' : 'All Locations'}</SelectItem>
                {stations.map(s => (
                  <SelectItem key={s.id} value={ar ? s.name_ar : s.name_en}>{ar ? s.name_ar : s.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className={cn("flex gap-2", isRTL ? "mr-auto" : "ml-auto")}>
              <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-1.5">
                <Printer className="w-4 h-4" />{ar ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintStationReport} className="gap-1.5">
                <MapPin className="w-4 h-4" />{ar ? 'طباعة تقرير المحطات' : 'Print Station Report'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
                <Download className="w-4 h-4" />PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                <div className={cn("p-3 rounded-xl", stat.bg)}><stat.icon className={cn("w-5 h-5", stat.color)} /></div>
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{ar ? 'الأصول حسب التصنيف' : 'Assets by Category'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{ar ? 'الأصول حسب الحالة' : 'Assets by Status'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" name={ar ? 'العدد' : 'Count'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{ar ? 'الأصول حسب الحالة الفنية' : 'Assets by Condition'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {conditionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={conditionData} cx="50%" cy="50%" outerRadius={95} paddingAngle={3} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}>
                      {conditionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <MapPin className="w-5 h-5 text-primary" />
            {ar ? 'الأصول حسب المحطة' : 'Assets by Station'}
          </CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {stationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stationData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="location" type="category" fontSize={12} width={100} />
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Bar dataKey="count" name={ar ? 'العدد' : 'Count'} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Custody Summary */}
      {employeeAssetData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Users className="w-5 h-5 text-primary" />
            {ar ? 'ملخص عهدة الموظفين' : 'Employee Custody Summary'}
          </CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{ar ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead>{ar ? 'عدد الأصول' : 'Asset Count'}</TableHead>
                  <TableHead>{ar ? 'إجمالي القيمة' : 'Total Value'}</TableHead>
                  <TableHead>{ar ? 'النسبة من الإجمالي' : '% of Total'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeAssetData.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.count}</TableCell>
                    <TableCell>{e.value.toLocaleString()} {ar ? 'ج.م' : 'EGP'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{totalValue > 0 ? Math.round((e.value / totalValue) * 100) : 0}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Station Details Table */}
      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <MapPin className="w-5 h-5 text-primary" />
          {ar ? 'تفاصيل الأصول حسب المحطة' : 'Asset Details by Station'}
        </CardTitle></CardHeader>
        <CardContent>
          <div ref={stationPrintRef}>
            {stationData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{ar ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead>{ar ? 'العدد' : 'Count'}</TableHead>
                    <TableHead>{ar ? 'مُعيّن' : 'Assigned'}</TableHead>
                    <TableHead>{ar ? 'متاح' : 'Available'}</TableHead>
                    <TableHead>{ar ? 'صيانة' : 'Maint.'}</TableHead>
                    <TableHead>{ar ? 'مُتقاعد' : 'Retired'}</TableHead>
                    <TableHead>{ar ? 'القيمة' : 'Value'}</TableHead>
                    <TableHead>{ar ? 'النسبة' : '%'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationData.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.location}</TableCell>
                      <TableCell>{s.count}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{s.assigned}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">{s.available}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{s.maintenance}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">{s.retired}</Badge></TableCell>
                      <TableCell>{s.value.toLocaleString()} {ar ? 'ج.م' : 'EGP'}</TableCell>
                      <TableCell><Badge>{filteredAssets.length > 0 ? Math.round((s.count / filteredAssets.length) * 100) : 0}%</Badge></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>{ar ? 'الإجمالي' : 'Total'}</TableCell>
                    <TableCell>{filteredAssets.length}</TableCell>
                    <TableCell>{assignedCount}</TableCell>
                    <TableCell>{availableCount}</TableCell>
                    <TableCell>{maintenanceCount}</TableCell>
                    <TableCell>{retiredCount}</TableCell>
                    <TableCell>{totalValue.toLocaleString()} {ar ? 'ج.م' : 'EGP'}</TableCell>
                    <TableCell><Badge>100%</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد بيانات أصول' : 'No asset data available'}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Asset List */}
      <Card>
        <CardHeader><CardTitle>{ar ? 'قائمة الأصول التفصيلية' : 'Detailed Asset List'}</CardTitle></CardHeader>
        <CardContent>
          <div ref={reportRef} className="overflow-x-auto">
            {filteredAssets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{ar ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{ar ? 'التصنيف' : 'Category'}</TableHead>
                    <TableHead>{ar ? 'الماركة' : 'Brand'}</TableHead>
                    <TableHead>{ar ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead>{ar ? 'معيّن لـ' : 'Assigned To'}</TableHead>
                    <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{ar ? 'السعر' : 'Price'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-sm">{a.assetCode}</TableCell>
                      <TableCell className="font-medium">{ar ? a.nameAr : a.nameEn}</TableCell>
                      <TableCell>{t(`assets.category.${a.category}`)}</TableCell>
                      <TableCell>{a.brand}</TableCell>
                      <TableCell>{getAssetLocation(a)}</TableCell>
                      <TableCell>{getEmpName(a.assignedTo)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          a.status === 'assigned' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                          a.status === 'available' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                          a.status === 'maintenance' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                          a.status === 'retired' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                        )}>{t(`assets.status.${a.status}`)}</Badge>
                      </TableCell>
                      <TableCell>{a.purchasePrice.toLocaleString()} {ar ? 'ج.م' : 'EGP'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={7}>{ar ? 'الإجمالي' : 'Total'}</TableCell>
                    <TableCell>{totalValue.toLocaleString()} {ar ? 'ج.م' : 'EGP'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد أصول مسجلة' : 'No assets registered'}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
