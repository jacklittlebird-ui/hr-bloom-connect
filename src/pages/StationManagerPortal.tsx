import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { usePerformanceData, defaultCriteria, calculateScore, CriteriaItem } from '@/contexts/PerformanceDataContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { stationLocations } from '@/data/stationLocations';
import { PortalWelcomeBanner } from '@/components/portal/PortalWelcomeBanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Users, Star, AlertTriangle, LogOut, Globe, MapPin, Target, TrendingUp, Lightbulb, MessageSquare, Save, Send, Plus, Trash2, Search, Filter, Pencil, Clock, UserCheck, UserX, FileText, ShieldCheck, Building2, BarChart3, CheckCircle, XCircle, Circle, ChevronLeft, ChevronRight, ChevronsUpDown, Check, RefreshCw, CalendarDays, LogIn, LogOut as LogOutIcon, ClipboardCheck, Calendar as CalendarIcon, Shirt, Car, Loader2, IdCard, Download, FileSpreadsheet } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const violationTypeLabels: Record<string, { ar: string; en: string }> = {
  absence: { ar: 'غياب بدون إذن', en: 'Unauthorized Absence' },
  late: { ar: 'تأخر متكرر', en: 'Repeated Tardiness' },
  conduct: { ar: 'سلوك غير لائق', en: 'Misconduct' },
  safety: { ar: 'مخالفة سلامة', en: 'Safety Violation' },
  other: { ar: 'أخرى', en: 'Other' },
};

const monthLabelHelper = (m: string, ar: boolean) => {
  const ar_m = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const en_m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const idx = parseInt(m) - 1;
  return ar ? ar_m[idx] : en_m[idx];
};
import { LeaveCalendar } from '@/components/leaves/LeaveCalendar';
import type { LeaveRequest } from '@/types/leaves';
import { ManagerApprovals } from '@/components/portal/sections/ManagerApprovals';
import { StationWorkHours } from '@/components/portal/sections/StationWorkHours';
import { StationUniformsTab } from '@/components/portal/sections/StationUniformsTab';
import { Tabs as VTabs, TabsContent as VTabsContent, TabsList as VTabsList, TabsTrigger as VTabsTrigger } from '@/components/ui/tabs';
import { DailyAttendanceReport } from '@/components/reports/DailyAttendanceReport';

import { FleetByStation } from '@/components/vehicles/FleetByStation';
import { LicenseAlerts } from '@/components/vehicles/LicenseAlerts';
import { VehicleRegistry } from '@/components/vehicles/VehicleRegistry';
import { VehicleLicenseTracking } from '@/components/vehicles/VehicleLicenseTracking';
import { VehicleMaintenance } from '@/components/vehicles/VehicleMaintenance';
import { EmployeeIdCards } from '@/components/training/EmployeeIdCards';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

// Shared violation interface (matches ViolationsTab)
interface Violation {
  id: string;
  employeeId: string;
  date: string;
  type: string;
  description: string;
  penalty: string;
  status: 'active' | 'resolved' | 'pending';
}

const violationTypes = [
  { value: 'absence', ar: 'غياب بدون إذن', en: 'Unauthorized Absence' },
  { value: 'late', ar: 'تأخر متكرر', en: 'Repeated Tardiness' },
  { value: 'conduct', ar: 'سلوك غير لائق', en: 'Misconduct' },
  { value: 'safety', ar: 'مخالفة سلامة', en: 'Safety Violation' },
  { value: 'negligence', ar: 'إهمال', en: 'Negligence' },
  { value: 'uniform', ar: 'مخالفة زي', en: 'Uniform Violation' },
  { value: 'other', ar: 'أخرى', en: 'Other' },
];

interface CriteriaScore {
  id: string;
  name: string;
  nameAr: string;
  score: number;
  weight: number;
}

const initialCriteria: CriteriaScore[] = [
  { id: 'attendance', name: 'Attendance & Punctuality', nameAr: 'الحضور والالتزام', score: 3, weight: 20 },
  { id: 'quality', name: 'Work Quality', nameAr: 'جودة العمل', score: 3, weight: 25 },
  { id: 'productivity', name: 'Productivity', nameAr: 'الإنتاجية', score: 3, weight: 20 },
  { id: 'teamwork', name: 'Teamwork', nameAr: 'العمل الجماعي', score: 3, weight: 15 },
  { id: 'communication', name: 'Communication', nameAr: 'التواصل', score: 3, weight: 10 },
  { id: 'initiative', name: 'Initiative', nameAr: 'المبادرة', score: 3, weight: 10 },
];

const years = Array.from({ length: 11 }, (_, i) => String(2025 + i));
const quarters = ['Q1', 'Q2', 'Q3', 'Q4', 'M3'];

// Lazy-loaded leave calendar for station employees
const StationLeaveCalendar = ({ stationEmployees, language }: { stationEmployees: any[]; language: string }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaves = async () => {
      if (stationEmployees.length === 0) { setLeaveRequests([]); setLoading(false); return; }
      const empIds = stationEmployees.map(e => e.id);
      const { data } = await supabase.from('leave_requests').select('*').in('employee_id', empIds).order('created_at', { ascending: false });
      const mapped: LeaveRequest[] = (data || []).map(l => {
        const emp = stationEmployees.find(e => e.id === l.employee_id);
        return {
          id: l.id, employeeId: l.employee_id,
          employeeName: emp?.nameEn || '', employeeNameAr: emp?.nameAr || '',
          department: emp?.department || '', station: emp?.stationLocation || '',
          leaveType: l.leave_type as LeaveRequest['leaveType'],
          startDate: l.start_date, endDate: l.end_date, days: l.days,
          reason: l.reason || '', status: l.status as LeaveRequest['status'],
          submittedDate: l.created_at.split('T')[0],
          rejectionReason: l.rejection_reason || undefined,
        };
      });
      setLeaveRequests(mapped);
      setLoading(false);
    };
    fetchLeaves();
  }, [stationEmployees, language]);

  if (loading) return <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  return <LeaveCalendar requests={leaveRequests} />;
};

const StationManagerPortal = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, isRTL } = useLanguage();
  const { employees, refreshEmployees } = useEmployeeData();
  const { reviews, addReview, updateReview, ensureLoaded: ensurePerformanceLoaded } = usePerformanceData();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mainRef = useRef<HTMLElement>(null);
  usePreventPullToRefresh(mainRef, isMobile);
  useScrollRestoration(mainRef);
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const ar = language === 'ar';
  // Hide bonus percentage UI for specific accounts/stations
  const hideBonusUI = useMemo(() => {
    const HIDDEN_STATIONS = new Set(['aswan', 'rmf', 'atz', 'lxr', 'hmb']);
    const HIDDEN_EMAILS = new Set(['sechrg@hr.com', 'hanhrg@hr.com']);
    const email = (user?.email || '').toLowerCase();
    if (HIDDEN_EMAILS.has(email)) return true;
    const stationCode = (user?.station || '').toLowerCase();
    if (HIDDEN_STATIONS.has(stationCode)) return true;
    const stationsArr = (user?.stations || []).map(s => (s || '').toLowerCase());
    if (stationsArr.some(s => HIDDEN_STATIONS.has(s))) return true;
    return false;
  }, [user?.station, user?.email, user?.stations]);
  // Role-based tab access — each manager role only sees its allowed tabs
  const allowedTabs = useMemo<string[]>(() => {
    switch (user?.role) {
      case 'station_manager':
      case 'area_manager':
        return ['dashboard', 'employees', 'attendance', 'leaveCalendar', 'workHours', 'approvals', 'evaluations', 'uniforms', 'violations', 'vehicles', 'companyCard', 'reports'];
      case 'station_hr':
        return ['dashboard', 'employees', 'attendance', 'leaveCalendar', 'workHours', 'uniforms', 'violations', 'vehicles', 'companyCard', 'reports'];
      case 'department_manager':
        return ['dashboard', 'employees', 'attendance', 'leaveCalendar', 'approvals', 'evaluations', 'violations'];
      default:
        return ['dashboard', 'employees'];
    }
  }, [user?.role]);
  const canSee = useCallback((tab: string) => allowedTabs.includes(tab), [allowedTabs]);

  const [activeTab, setActiveTab] = useState(allowedTabs[0] || 'employees');
  const [sideCollapsed, setSideCollapsed] = useState(false);
  // Guard: if user role changes or active tab not allowed, snap to first allowed
  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] || 'employees');
    }
  }, [allowedTabs, activeTab]);

  // Violations from Supabase (lazy-loaded)
  const [violations, setViolations] = useState<Violation[]>([]);
  const violationsFetched = useRef(false);

  const fetchViolations = useCallback(async () => {
    const { data } = await supabase.from('violations').select('*').order('created_at', { ascending: false });
    if (data) {
      setViolations(data.map(v => ({
        id: v.id,
        employeeId: v.employee_id,
        date: v.date,
        type: v.type,
        description: v.description || '',
        penalty: v.penalty || '',
        status: v.status === 'approved' ? 'active' as const : v.status === 'resolved' ? 'resolved' as const : 'pending' as const,
      })));
    }
  }, []);


  // Evaluation dialog state
  const [evalDialog, setEvalDialog] = useState(false);
  const [evalEmployeeId, setEvalEmployeeId] = useState('');
  const [evalYear, setEvalYear] = useState('');
  const [evalQuarter, setEvalQuarter] = useState('');
  const [evalCriteria, setEvalCriteria] = useState<CriteriaScore[]>(initialCriteria.map(c => ({ ...c })));
  const [evalStrengths, setEvalStrengths] = useState('');
  const [evalImprovements, setEvalImprovements] = useState('');
  const [evalGoals, setEvalGoals] = useState('');
  const [evalComments, setEvalComments] = useState('');
  const [evalBonusPercentage, setEvalBonusPercentage] = useState<string>('');
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusSearch, setBonusSearch] = useState('');

  // Violation dialog state
  const [violDialog, setViolDialog] = useState(false);
  const [violForm, setViolForm] = useState({ employeeId: '', type: 'absence', description: '', penalty: '', date: new Date().toISOString().split('T')[0] });
  const [violEmpPickerOpen, setViolEmpPickerOpen] = useState(false);

  // Edit evaluation dialog state
  const [editEvalDialog, setEditEvalDialog] = useState(false);
  const [editEvalId, setEditEvalId] = useState('');
  const [editEvalCriteria, setEditEvalCriteria] = useState<CriteriaScore[]>(initialCriteria.map(c => ({ ...c })));
  const [editEvalStrengths, setEditEvalStrengths] = useState('');
  const [editEvalImprovements, setEditEvalImprovements] = useState('');
  const [editEvalGoals, setEditEvalGoals] = useState('');
  const [editEvalComments, setEditEvalComments] = useState('');
  const [editEvalBonusPercentage, setEditEvalBonusPercentage] = useState<string>('');
  const [editBonusOpen, setEditBonusOpen] = useState(false);
  const [editBonusSearch, setEditBonusSearch] = useState('');

  // Edit violation dialog state
  const [editViolDialog, setEditViolDialog] = useState(false);
  const [editViolId, setEditViolId] = useState('');
  const [editViolForm, setEditViolForm] = useState({ type: 'absence', description: '', penalty: '', date: '' });

  const isAreaManager = user?.role === 'area_manager';
  const isDepartmentManager = user?.role === 'department_manager';
  const isStationHR = user?.role === 'station_hr';
  // Treat station_hr with multiple stations like area_manager (multi-station selector)
  const isMultiStation = isAreaManager || (isStationHR && (user?.stations?.length || 0) > 1);
  const [selectedStation, setSelectedStation] = useState<string>(user?.station || user?.stations?.[0] || '');

  // For area_manager / multi-station station_hr: list of managed station labels
  const managedStations = useMemo(() => {
    if (!isMultiStation || !user?.stations) return [];
    return user.stations.map(code => {
      const loc = stationLocations.find(s => s.value === code);
      return { code, labelAr: loc?.labelAr || code, labelEn: loc?.labelEn || code };
    });
  }, [isMultiStation, user?.stations, language]);

  const activeStation = isMultiStation ? selectedStation : user?.station;

  const stationName = useMemo(() => {
    const loc = stationLocations.find(s => s.value === activeStation);
    const baseLabel = language === 'ar' ? loc?.labelAr : loc?.labelEn;
    if (isDepartmentManager) {
      const deptList = (language === 'ar' ? user?.departmentNamesAr : user?.departmentNames) || [];
      const deptLabel = deptList.length > 0
        ? deptList.join(' / ')
        : (language === 'ar' ? user?.departmentNameAr : user?.departmentName);
      if (baseLabel && deptLabel) return `${baseLabel} — ${deptLabel}`;
      return deptLabel || baseLabel;
    }
    return baseLabel;
  }, [activeStation, language, isDepartmentManager, user?.departmentName, user?.departmentNameAr, user?.departmentNames, user?.departmentNamesAr]);

  const stationEmployees = useMemo(() => {
    // Exclude inactive employees from all Station Manager portal tabs
    const visible = employees.filter(e => e.status !== 'inactive');
    if (isMultiStation && selectedStation === 'all') {
      return visible.filter(e => user?.stations?.includes(e.stationLocation || ''));
    }
    let scoped = visible.filter(e => e.stationLocation === activeStation);
    if (isDepartmentManager) {
      const deptNamesAr = (user?.departmentNamesAr && user.departmentNamesAr.length > 0)
        ? user.departmentNamesAr
        : (user?.departmentNameAr ? [user.departmentNameAr] : []);
      const deptNamesEn = (user?.departmentNames && user.departmentNames.length > 0)
        ? user.departmentNames
        : (user?.departmentName ? [user.departmentName] : []);
      const allowedNames = new Set<string>([...deptNamesAr, ...deptNamesEn].filter(Boolean) as string[]);
      if (allowedNames.size > 0) {
        scoped = scoped.filter(e => e.department && allowedNames.has(e.department));
      }
    }
    return scoped;
  }, [employees, activeStation, isAreaManager, selectedStation, user?.stations, isDepartmentManager, user?.departmentId, user?.departmentName, user?.departmentNameAr, user?.departmentIds, user?.departmentNames, user?.departmentNamesAr]);

  // === Today's attendance for stat cards ===
  const [todayAttRecords, setTodayAttRecords] = useState<any[]>([]);

  const fetchTodayAttendance = useCallback(async () => {
    if (stationEmployees.length === 0) { setTodayAttRecords([]); return; }
    const today = new Date().toISOString().split('T')[0];
    const empIds = stationEmployees.map(e => e.id);
    const { data } = await supabase
      .from('attendance_records')
      .select('employee_id, status')
      .in('employee_id', empIds)
      .eq('date', today);
    setTodayAttRecords(data || []);
  }, [stationEmployees]);

  useEffect(() => { fetchTodayAttendance(); }, [fetchTodayAttendance]);

  const todayPresentCount = useMemo(() => {
    return todayAttRecords.filter(r => ['present', 'late', 'mission'].includes(r.status)).length;
  }, [todayAttRecords]);

  const todayAbsentCount = useMemo(() => {
    const activeEmps = stationEmployees.filter(e => e.status === 'active').length;
    return Math.max(0, activeEmps - todayPresentCount);
  }, [stationEmployees, todayPresentCount]);

  // === Attendance tab state ===
  // Default range: start of current year → today, so selecting any employee
  // shows all their records throughout the year (not just current month).
  const nowAtt = new Date();
  const attStartOfYear = `${nowAtt.getFullYear()}-01-01`;
  const attTodayStr = nowAtt.toISOString().split('T')[0];
  const [attDateFrom, setAttDateFrom] = useState(attStartOfYear);
  const [attDateTo, setAttDateTo] = useState(attTodayStr);
  const [attSearch, setAttSearch] = useState('');
  const [attDeptFilter, setAttDeptFilter] = useState('all');
  const [attRecords, setAttRecords] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);

  const attReqIdRef = useRef(0);
  const fetchAttendance = useCallback(async () => {
    const reqId = ++attReqIdRef.current;
    // Clear stale results immediately so partial/old data never displays
    setAttRecords([]);
    if (stationEmployees.length === 0) { setAttLoading(false); return; }
    setAttLoading(true);
    const empIds = stationEmployees.map(e => e.id);
    const PAGE_SIZE = 1000;
    const all: any[] = [];
    // Iterate employees in chunks of 200 to avoid huge IN clauses, and paginate within each chunk
    const EMP_CHUNK = 200;
    for (let ci = 0; ci < empIds.length; ci += EMP_CHUNK) {
      const chunk = empIds.slice(ci, ci + EMP_CHUNK);
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .in('employee_id', chunk)
          .gte('date', attDateFrom)
          .lte('date', attDateTo)
          .order('date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (reqId !== attReqIdRef.current) return; // superseded by newer request
        if (error) { console.error('Attendance fetch error:', error); break; }
        const page = data || [];
        all.push(...page);
        hasMore = page.length === PAGE_SIZE;
        from += PAGE_SIZE;
      }
    }
    if (reqId !== attReqIdRef.current) return;
    setAttRecords(all);
    setAttLoading(false);
  }, [stationEmployees, attDateFrom, attDateTo]);

  // Lazy: only fetch attendance when tab is active; refetch on date range change
  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab, fetchAttendance]);

  const filteredAttRecords = useMemo(() => {
    let list = attRecords;
    if (attDeptFilter !== 'all') {
      const deptEmpIds = new Set(stationEmployees.filter(e => e.department === attDeptFilter).map(e => e.id));
      list = list.filter(r => deptEmpIds.has(r.employee_id));
    }
    if (attSearch.trim()) {
      const normalizeSearchText = (s: string) => (s || '')
        .toLowerCase()
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[إأآاٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ء/g, '')
        .replace(/ة/g, 'ه')
        .replace(/[گک]/g, 'ك')
        .replace(/پ/g, 'ب')
        .replace(/چ/g, 'ج')
        .replace(/\s+/g, ' ')
        .trim();

      const query = normalizeSearchText(attSearch);
      const tokens = query.split(/\s+/).filter(Boolean);

      list = list.filter(r => {
        const emp = stationEmployees.find(e => e.id === r.employee_id);
        if (!emp) return false;

        const code = normalizeSearchText(emp.employeeId || '');
        if (code === query || code.startsWith(query)) return true;

        const nameAr = normalizeSearchText(emp.nameAr || '');
        const nameEn = normalizeSearchText(emp.nameEn || '');

        return (
          nameAr.includes(query) ||
          nameEn.includes(query) ||
          tokens.every(t => nameAr.includes(t)) ||
          tokens.every(t => nameEn.includes(t))
        );
      });
    }
    return list;
  }, [attRecords, attSearch, attDeptFilter, stationEmployees]);

  const attPagination = usePagination(filteredAttRecords, 30);

  const attStats = useMemo(() => {
    const present = attRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const late = attRecords.filter(r => r.is_late).length;
    const absent = attRecords.filter(r => r.status === 'absent').length;
    const totalMinutes = attRecords.reduce((s, r) => s + (r.work_minutes || 0), 0);
    return { present, late, absent, totalHours: Math.floor(totalMinutes / 60), totalMinutes: totalMinutes % 60 };
  }, [attRecords]);


  const stationReviews = useMemo(() => {
    const empIds = new Set(stationEmployees.map(e => e.id));
    return reviews.filter(r => empIds.has(r.employeeId) || r.station === user?.station);
  }, [reviews, stationEmployees, user?.station]);

  // Filter violations for this station's employees (violations now use UUID)
  const stationViolations = useMemo(() => {
    const empIds = stationEmployees.map(e => e.id);
    return violations.filter(v => empIds.includes(v.employeeId));
  }, [violations, stationEmployees]);

  // Eval helpers
  const evalOverallScore = useMemo(() => {
    const totalWeight = evalCriteria.reduce((s, c) => s + c.weight, 0);
    const weightedSum = evalCriteria.reduce((s, c) => s + (c.score * c.weight), 0);
    return parseFloat((weightedSum / totalWeight).toFixed(2));
  }, [evalCriteria]);

  const BONUS_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
  const evalSuggestedBonus = useMemo(() => {
    const clamped = Math.min(5, Math.max(1, evalOverallScore || 1));
    return Math.round((clamped - 1) * 12.5 * 10) / 10;
  }, [evalOverallScore]);

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return { label: ar ? 'ممتاز' : 'Excellent', color: 'text-[hsl(var(--stat-green))]' };
    if (score >= 3.5) return { label: ar ? 'جيد جداً' : 'Very Good', color: 'text-[hsl(var(--stat-blue))]' };
    if (score >= 2.5) return { label: ar ? 'جيد' : 'Good', color: 'text-[hsl(var(--stat-yellow))]' };
    if (score >= 1.5) return { label: ar ? 'مقبول' : 'Acceptable', color: 'text-[hsl(var(--stat-coral))]' };
    return { label: ar ? 'ضعيف' : 'Poor', color: 'text-destructive' };
  };

  const resetEvalForm = () => {
    setEvalEmployeeId('');
    setEvalYear('');
    setEvalQuarter('');
    setEvalCriteria(initialCriteria.map(c => ({ ...c })));
    setEvalStrengths('');
    setEvalImprovements('');
    setEvalGoals('');
    setEvalComments('');
    setEvalBonusPercentage('');
  };

  // Validate bonus percentage (0-100, numeric, optional empty)
  const validateBonusPercentage = (raw: string): { valid: boolean; value?: number; message?: string } => {
    if (raw === '' || raw == null) return { valid: true, value: undefined };
    const trimmed = String(raw).trim().replace('%', '');
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { valid: false, message: t('نسبة المكافأة يجب أن تكون رقمًا صحيحًا', 'Bonus percentage must be a valid number') };
    }
    const n = Number(trimmed);
    if (isNaN(n)) {
      return { valid: false, message: t('نسبة المكافأة غير صالحة', 'Invalid bonus percentage') };
    }
    if (n < 0) return { valid: false, message: t('لا يمكن أن تكون نسبة المكافأة أقل من 0%', 'Bonus percentage cannot be less than 0%') };
    if (n > 100) return { valid: false, message: t('لا يمكن أن تتجاوز نسبة المكافأة 100%', 'Bonus percentage cannot exceed 100%') };
    return { valid: true, value: n };
  };

  const handleAddEvaluation = (status: 'draft' | 'submitted') => {
    if (!evalEmployeeId || !evalYear || !evalQuarter) {
      toast({ title: t('أكمل البيانات المطلوبة', 'Complete required fields'), variant: 'destructive' });
      return;
    }
    const bonusCheck = validateBonusPercentage(evalBonusPercentage);
    if (!bonusCheck.valid) {
      toast({ title: t('نسبة مكافأة غير صحيحة', 'Invalid bonus percentage'), description: bonusCheck.message, variant: 'destructive' });
      return;
    }
    const emp = stationEmployees.find(e => e.id === evalEmployeeId);
    if (!emp) return;
    addReview({
      employeeId: emp.employeeId,
      employeeName: ar ? emp.nameAr : emp.nameEn,
      department: emp.department,
      station: user?.station || '',
      quarter: evalQuarter,
      year: evalYear,
      score: evalOverallScore,
      status,
      reviewer: ar ? (user?.nameAr || '') : (user?.name || ''),
      reviewDate: new Date().toISOString().split('T')[0],
      strengths: evalStrengths,
      improvements: evalImprovements,
      goals: evalGoals,
      managerComments: evalComments,
      criteria: evalCriteria.map(c => ({ name: c.nameAr, nameEn: c.name, score: c.score, weight: c.weight })),
      bonusPercentage: evalBonusPercentage === '' ? undefined : Number(evalBonusPercentage),
    });
    toast({ title: t('تم إضافة التقييم بنجاح', 'Evaluation added successfully') });
    setEvalDialog(false);
    resetEvalForm();
  };

  const handleAddViolation = async () => {
    if (!violForm.employeeId || !violForm.type) {
      toast({ title: t('أكمل البيانات المطلوبة', 'Complete required fields'), variant: 'destructive' });
      return;
    }
    const emp = stationEmployees.find(e => e.id === violForm.employeeId);
    if (!emp) return;
    const { error } = await supabase.from('violations').insert({
      employee_id: emp.id,
      date: violForm.date,
      type: violForm.type,
      description: violForm.description,
      penalty: violForm.penalty,
      status: 'pending',
      created_by: user?.id || null,
    });
    if (!error) {
      addNotification({ titleAr: `مخالفة جديدة بانتظار الموافقة للموظف: ${emp.nameAr}`, titleEn: `New violation pending approval for: ${emp.nameEn}`, type: 'warning', module: 'employee' });
      toast({ title: t('تم إضافة المخالفة بنجاح', 'Violation added successfully') });
      await fetchViolations();
    }
    setViolDialog(false);
    setViolForm({ employeeId: '', type: 'absence', description: '', penalty: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDeleteViolation = async (id: string) => {
    await supabase.from('violations').delete().eq('id', id);
    await fetchViolations();
    toast({ title: t('تم الحذف', 'Deleted') });
  };

  // Roles allowed to approve/reject violations: admin, hr, station_manager, area_manager
  const canApproveViolations = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'station_manager' || user?.role === 'area_manager';

  const handleApproveViolation = async (id: string) => {
    const { error } = await supabase.from('violations').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast({ title: t('تعذر اعتماد المخالفة', 'Could not approve'), variant: 'destructive' }); return; }
    toast({ title: t('تمت الموافقة على المخالفة', 'Violation approved') });
    await fetchViolations();
  };

  const handleRejectViolation = async (id: string) => {
    const { error } = await supabase.from('violations').update({ status: 'rejected' }).eq('id', id);
    if (error) { toast({ title: t('تعذر رفض المخالفة', 'Could not reject'), variant: 'destructive' }); return; }
    toast({ title: t('تم رفض المخالفة', 'Violation rejected') });
    await fetchViolations();
  };

  // Open edit evaluation dialog
  const openEditEval = (review: any) => {
    setEditEvalId(review.id);
    setEditEvalCriteria(review.criteria ? review.criteria.map((c: any, i: number) => ({
      id: initialCriteria[i]?.id || `c_${i}`,
      name: c.nameEn || c.name,
      nameAr: c.name || c.nameAr,
      score: c.score,
      weight: c.weight,
    })) : initialCriteria.map(c => ({ ...c })));
    setEditEvalStrengths(review.strengths || '');
    setEditEvalImprovements(review.improvements || '');
    setEditEvalGoals(review.goals || '');
    setEditEvalComments(review.managerComments || '');
    setEditEvalBonusPercentage(review.bonusPercentage != null ? String(review.bonusPercentage) : '');
    setEditEvalDialog(true);
  };

  const editEvalOverallScore = useMemo(() => {
    const totalWeight = editEvalCriteria.reduce((s, c) => s + c.weight, 0);
    const weightedSum = editEvalCriteria.reduce((s, c) => s + (c.score * c.weight), 0);
    return parseFloat((weightedSum / totalWeight).toFixed(2));
  }, [editEvalCriteria]);

  const editEvalSuggestedBonus = useMemo(() => {
    const clamped = Math.min(5, Math.max(1, editEvalOverallScore || 1));
    return Math.round((clamped - 1) * 12.5 * 10) / 10;
  }, [editEvalOverallScore]);

  const handleSaveEditEval = (status: 'draft' | 'submitted') => {
    const bonusCheck = validateBonusPercentage(editEvalBonusPercentage);
    if (!bonusCheck.valid) {
      toast({ title: t('نسبة مكافأة غير صحيحة', 'Invalid bonus percentage'), description: bonusCheck.message, variant: 'destructive' });
      return;
    }
    updateReview(editEvalId, {
      score: editEvalOverallScore,
      status,
      strengths: editEvalStrengths,
      improvements: editEvalImprovements,
      goals: editEvalGoals,
      managerComments: editEvalComments,
      criteria: editEvalCriteria.map(c => ({ name: c.nameAr, nameEn: c.name, score: c.score, weight: c.weight })),
      bonusPercentage: editEvalBonusPercentage === '' ? undefined : Number(editEvalBonusPercentage),
    });
    toast({ title: t('تم تحديث التقييم', 'Evaluation updated') });
    setEditEvalDialog(false);
  };

  // Open edit violation dialog
  const openEditViol = (v: Violation) => {
    setEditViolId(v.id);
    setEditViolForm({ type: v.type, description: v.description, penalty: v.penalty, date: v.date });
    setEditViolDialog(true);
  };

  const handleSaveEditViol = async () => {
    await supabase.from('violations').update({
      type: editViolForm.type,
      description: editViolForm.description,
      penalty: editViolForm.penalty,
      date: editViolForm.date,
    }).eq('id', editViolId);
    await fetchViolations();
    toast({ title: t('تم تحديث المخالفة', 'Violation updated') });
    setEditViolDialog(false);
  };

  // === Employees Tab Filters ===
  const [deptFilter, setDeptFilter] = useState('all');
  const [empSearch, setEmpSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const stationDepartments = useMemo(() => {
    const depts = [...new Set(stationEmployees.map(e => e.department).filter(Boolean))];
    return depts.sort();
  }, [stationEmployees]);
  const filteredStationEmployees = useMemo(() => {
    let list = stationEmployees;
    if (deptFilter !== 'all') list = list.filter(e => e.department === deptFilter);
    if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter);
    if (empSearch.trim()) {
      const q = empSearch.trim().toLowerCase();
      list = list.filter(e => e.nameAr.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q));
    }
    return list;
  }, [stationEmployees, deptFilter, statusFilter, empSearch]);

  // === Evaluations Inner Tab ===
  const [evalInnerTab, setEvalInnerTab] = useState('dashboard');

  // === Evaluations Tab Filters ===
  const [evalSearch, setEvalSearch] = useState('');
  const [evalFilterEmployee, setEvalFilterEmployee] = useState('all');
  const [evalFilterDept, setEvalFilterDept] = useState('all');
  const [evalFilterQuarter, setEvalFilterQuarter] = useState('all');
  const [evalFilterYear, setEvalFilterYear] = useState('all');
  const [evalFilterStatus, setEvalFilterStatus] = useState('all');
  const filteredReviews = useMemo(() => {
    let list = stationReviews;
    if (evalFilterEmployee !== 'all') list = list.filter(r => r.employeeId === evalFilterEmployee);
    if (evalFilterDept !== 'all') list = list.filter(r => r.department === evalFilterDept);
    if (evalFilterQuarter !== 'all') list = list.filter(r => r.quarter === evalFilterQuarter);
    if (evalFilterYear !== 'all') list = list.filter(r => r.year === evalFilterYear);
    if (evalFilterStatus !== 'all') list = list.filter(r => r.status === evalFilterStatus);
    if (evalSearch.trim()) {
      const q = evalSearch.trim().toLowerCase();
      list = list.filter(r => r.employeeName.toLowerCase().includes(q) || r.employeeId.toLowerCase().includes(q) || r.reviewer.toLowerCase().includes(q));
    }
    return list;
  }, [stationReviews, evalFilterEmployee, evalFilterDept, evalFilterQuarter, evalFilterYear, evalFilterStatus, evalSearch]);

  // === New Eval Form State (inline, not dialog) ===
  const [newEvalYear, setNewEvalYear] = useState(String(new Date().getFullYear()));
  const [newEvalQuarter, setNewEvalQuarter] = useState('');
  const [newEvalDeptFilter, setNewEvalDeptFilter] = useState('all');
  const [newEvalSelectedEmp, setNewEvalSelectedEmp] = useState('');
  const [newEvalPage, setNewEvalPage] = useState(0);
  const [newEvalSearch, setNewEvalSearch] = useState('');
  const NEW_EVAL_PAGE_SIZE = 5;

  const newEvalFilteredEmps = useMemo(() => {
    let list = stationEmployees.filter(e => e.status === 'active');
    if (newEvalDeptFilter !== 'all') list = list.filter(e => e.department === newEvalDeptFilter);
    const q = newEvalSearch.trim().toLowerCase();
    if (q) {
      const norm = (s: string) => (s || '').toLowerCase()
        .replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
      const nq = norm(q);
      list = list.filter(e =>
        norm(e.nameAr).includes(nq) ||
        norm(e.nameEn).includes(nq) ||
        (e.employeeId || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [stationEmployees, newEvalDeptFilter, newEvalSearch]);


  const newEvalTotalPages = Math.max(1, Math.ceil(newEvalFilteredEmps.length / NEW_EVAL_PAGE_SIZE));
  const newEvalPaginatedEmps = newEvalFilteredEmps.slice(newEvalPage * NEW_EVAL_PAGE_SIZE, (newEvalPage + 1) * NEW_EVAL_PAGE_SIZE);

  // Evaluated IDs for the selected quarter/year
  const newEvalEvaluatedIds = useMemo(() => {
    if (!newEvalQuarter || !newEvalYear) return new Set<string>();
    return new Set(stationReviews.filter(r => r.quarter === newEvalQuarter && r.year === newEvalYear).map(r => r.employeeId));
  }, [stationReviews, newEvalQuarter, newEvalYear]);

  // Existing review for selected emp+quarter+year
  const newEvalExisting = useMemo(() => {
    if (!newEvalSelectedEmp || !newEvalQuarter || !newEvalYear) return null;
    return stationReviews.find(r => r.employeeId === newEvalSelectedEmp && r.quarter === newEvalQuarter && r.year === newEvalYear) || null;
  }, [stationReviews, newEvalSelectedEmp, newEvalQuarter, newEvalYear]);

  // Load existing into eval form
  useEffect(() => {
    if (newEvalExisting) {
      if (newEvalExisting.criteria && newEvalExisting.criteria.length > 0) {
        setEvalCriteria(newEvalExisting.criteria.map((c, i) => ({
          id: initialCriteria[i]?.id || `c${i}`,
          name: c.nameEn,
          nameAr: c.name,
          score: c.score,
          weight: c.weight,
        })));
      }
      setEvalStrengths(newEvalExisting.strengths || '');
      setEvalImprovements(newEvalExisting.improvements || '');
      setEvalGoals(newEvalExisting.goals || '');
      setEvalComments(newEvalExisting.managerComments || '');
      setEvalBonusPercentage(newEvalExisting.bonusPercentage != null ? String(newEvalExisting.bonusPercentage) : '');
    } else {
      setEvalCriteria(initialCriteria.map(c => ({ ...c })));
      setEvalStrengths('');
      setEvalImprovements('');
      setEvalGoals('');
      setEvalComments('');
      setEvalBonusPercentage('');
    }
  }, [newEvalExisting]);

  useEffect(() => { setNewEvalPage(0); }, [newEvalDeptFilter, newEvalSearch]);

  // Quarter context: monthly work hours + violations (penalties) for selected employee
  interface QuarterViolation { id: string; date: string; type: string; description: string; penalty: string; status: string; }
  const [quarterMonthly, setQuarterMonthly] = useState<{ month: string; hours: number; recordCount: number; avgDailyHours: number; violations: QuarterViolation[] }[]>([]);
  const [quarterLoading, setQuarterLoading] = useState(false);

  const newEvalSelectedEmpObj = useMemo(
    () => stationEmployees.find(e => e.id === newEvalSelectedEmp),
    [stationEmployees, newEvalSelectedEmp]
  );

  const newEvalQuarterMonths = useMemo(() => {
    if (!newEvalQuarter) return [] as string[];
    if (newEvalQuarter === 'M3') {
      const hire = (newEvalSelectedEmpObj as any)?.hireDate;
      if (!hire) return [];
      const d = new Date(hire);
      if (isNaN(d.getTime())) return [];
      return [0, 1, 2].map(i => {
        const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
        return String(m.getMonth() + 1).padStart(2, '0');
      });
    }
    const map: Record<string, string[]> = { Q1: ['01','02','03'], Q2: ['04','05','06'], Q3: ['07','08','09'], Q4: ['10','11','12'] };
    return map[newEvalQuarter] || [];
  }, [newEvalQuarter, newEvalSelectedEmpObj]);

  // For M3 the year/month spans the hire date window, not selectedYear
  const newEvalPeriodRange = useMemo(() => {
    if (!newEvalQuarter || newEvalQuarterMonths.length === 0) return null;
    if (newEvalQuarter === 'M3') {
      const hire = (newEvalSelectedEmpObj as any)?.hireDate;
      if (!hire) return null;
      const d = new Date(hire);
      if (isNaN(d.getTime())) return null;
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 3, 0);
      const toIso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
      return { start: toIso(start), end: toIso(end) };
    }
    const startDate = `${newEvalYear}-${newEvalQuarterMonths[0]}-01`;
    const lastMonth = newEvalQuarterMonths[newEvalQuarterMonths.length - 1];
    const lastDay = new Date(parseInt(newEvalYear), parseInt(lastMonth), 0).getDate();
    const endDate = `${newEvalYear}-${lastMonth}-${String(lastDay).padStart(2,'0')}`;
    return { start: startDate, end: endDate };
  }, [newEvalQuarter, newEvalQuarterMonths, newEvalYear, newEvalSelectedEmpObj]);

  useEffect(() => {
    if (!newEvalSelectedEmp || !newEvalPeriodRange || newEvalQuarterMonths.length === 0) {
      setQuarterMonthly([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setQuarterLoading(true);
      try {
        const startDate = newEvalPeriodRange.start;
        const endDate = newEvalPeriodRange.end;
        const [violRes, attRes] = await Promise.all([
          supabase.from('violations').select('id, date, type, description, penalty, status')
            .eq('employee_id', newEvalSelectedEmp).gte('date', startDate).lte('date', endDate)
            .order('date', { ascending: false }),
          supabase.from('attendance_records').select('date, work_hours')
            .eq('employee_id', newEvalSelectedEmp).gte('date', startDate).lte('date', endDate),
        ]);
        if (cancelled) return;
        const hoursByMonth: Record<string, { hours: number; count: number }> = {};
        (attRes.data || []).forEach((r: any) => {
          const m = (r.date as string).slice(5, 7);
          if (!hoursByMonth[m]) hoursByMonth[m] = { hours: 0, count: 0 };
          hoursByMonth[m].hours += Number(r.work_hours || 0);
          hoursByMonth[m].count += 1;
        });
        const violByMonth: Record<string, QuarterViolation[]> = {};
        (violRes.data || []).forEach((v: any) => {
          const m = (v.date as string).slice(5, 7);
          if (!violByMonth[m]) violByMonth[m] = [];
          violByMonth[m].push({ id: v.id, date: v.date, type: v.type || 'other', description: v.description || '', penalty: v.penalty || '', status: v.status || '' });
        });
        setQuarterMonthly(newEvalQuarterMonths.map(m => {
          const h = hoursByMonth[m];
          const totalHours = h ? h.hours : 0;
          const count = h ? h.count : 0;
          const avgDailyHours = count > 0 ? Math.round((totalHours / count) * 10) / 10 : 0;
          return {
            month: m,
            hours: Math.round(totalHours * 10) / 10,
            recordCount: count,
            avgDailyHours,
            violations: violByMonth[m] || [],
          };
        }));
      } finally {
        if (!cancelled) setQuarterLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [newEvalSelectedEmp, newEvalPeriodRange, newEvalQuarterMonths]);

  const handleNewEvalSave = async (status: 'draft' | 'submitted') => {
    if (!newEvalSelectedEmp || !newEvalYear || !newEvalQuarter) {
      toast({ title: t('أكمل البيانات المطلوبة', 'Complete required fields'), variant: 'destructive' });
      return;
    }
    const bonusCheck = validateBonusPercentage(evalBonusPercentage);
    if (!bonusCheck.valid) {
      toast({ title: t('نسبة مكافأة غير صحيحة', 'Invalid bonus percentage'), description: bonusCheck.message, variant: 'destructive' });
      return;
    }
    const emp = stationEmployees.find(e => e.id === newEvalSelectedEmp);
    if (!emp) return;
    const reviewData = {
      employeeId: emp.id,
      employeeName: ar ? emp.nameAr : emp.nameEn,
      department: emp.department,
      station: user?.station || '',
      quarter: newEvalQuarter,
      year: newEvalYear,
      score: evalOverallScore,
      status,
      reviewer: '',
      reviewDate: new Date().toISOString().split('T')[0],
      strengths: evalStrengths,
      improvements: evalImprovements,
      goals: evalGoals,
      managerComments: evalComments,
      criteria: evalCriteria.map(c => ({ name: c.nameAr, nameEn: c.name, score: c.score, weight: c.weight })),
      bonusPercentage: evalBonusPercentage === '' ? undefined : Number(evalBonusPercentage),
    };
    try {
      if (newEvalExisting) {
        await updateReview(newEvalExisting.id, reviewData);
      } else {
        await addReview(reviewData);
      }
      toast({ title: status === 'draft' ? t('تم الحفظ كمسودة', 'Saved as draft') : t('تم إرسال التقييم', 'Evaluation submitted') });
    } catch {
      toast({ title: t('حدث خطأ', 'Error occurred'), variant: 'destructive' });
    }
  };

  // Dashboard stats for station
  const dashboardYear = newEvalYear;
  const dashboardQuarter = newEvalQuarter;
  const dashboardReviews = useMemo(() => {
    let list = stationReviews;
    if (dashboardYear) list = list.filter(r => r.year === dashboardYear);
    if (dashboardQuarter) list = list.filter(r => r.quarter === dashboardQuarter);
    return list;
  }, [stationReviews, dashboardYear, dashboardQuarter]);

  const dashboardEvaluatedIds = useMemo(() => new Set(dashboardReviews.map(r => r.employeeId)), [dashboardReviews]);
  const activeStationEmps = stationEmployees.filter(e => e.status === 'active');
  const dashboardEvaluated = activeStationEmps.filter(e => dashboardEvaluatedIds.has(e.id)).length;
  const dashboardNotEvaluated = activeStationEmps.length - dashboardEvaluated;
  const dashboardDraft = dashboardReviews.filter(r => r.status === 'draft').length;
  const dashboardSubmitted = dashboardReviews.filter(r => r.status === 'submitted').length;
  const dashboardApproved = dashboardReviews.filter(r => r.status === 'approved').length;

  // Dept breakdown for dashboard
  const dashboardDeptBreakdown = useMemo(() => {
    const deptMap: Record<string, { total: number; evaluated: number }> = {};
    activeStationEmps.forEach(emp => {
      const key = emp.department || (ar ? 'غير محدد' : 'Unassigned');
      if (!deptMap[key]) deptMap[key] = { total: 0, evaluated: 0 };
      deptMap[key].total++;
      if (dashboardEvaluatedIds.has(emp.id)) deptMap[key].evaluated++;
    });
    return Object.entries(deptMap)
      .map(([dept, v]) => ({ dept, ...v, notEvaluated: v.total - v.evaluated }))
      .sort((a, b) => b.total - a.total);
  }, [activeStationEmps, dashboardEvaluatedIds, ar]);

  // === Violations Tab Filters ===
  const [violSearch, setViolSearch] = useState('');
  const [violFilterEmployee, setViolFilterEmployee] = useState('all');
  const [violFilterType, setViolFilterType] = useState('all');
  const [violFilterStatus, setViolFilterStatus] = useState('all');
  const [violFilterDept, setViolFilterDept] = useState('all');
  const filteredViolations = useMemo(() => {
    let list = stationViolations;
    if (violFilterDept !== 'all') {
      const deptEmpIds = new Set(stationEmployees.filter(e => e.department === violFilterDept).map(e => e.id));
      list = list.filter(v => deptEmpIds.has(v.employeeId));
    }
    if (violFilterEmployee !== 'all') list = list.filter(v => v.employeeId === violFilterEmployee);
    if (violFilterType !== 'all') list = list.filter(v => v.type === violFilterType);
    if (violFilterStatus !== 'all') list = list.filter(v => v.status === violFilterStatus);
    if (violSearch.trim()) {
      const q = violSearch.trim().toLowerCase();
      list = list.filter(v => {
        const emp = stationEmployees.find(e => e.id === v.employeeId);
        return v.employeeId.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || (emp && (emp.nameAr.toLowerCase().includes(q) || emp.nameEn.toLowerCase().includes(q)));
      });
    }
    return list;
  }, [stationViolations, violFilterEmployee, violFilterType, violFilterStatus, violFilterDept, violSearch, stationEmployees]);

  // Lazy: fetch violations only when tab is active
  useEffect(() => {
    if (activeTab === 'violations' && !violationsFetched.current) {
      violationsFetched.current = true;
      fetchViolations();
    }
  }, [activeTab, fetchViolations]);

  // Lazy: load evaluations only when tab is active
  useEffect(() => {
    if (activeTab === 'evaluations') {
      ensurePerformanceLoaded();
    }
  }, [activeTab, ensurePerformanceLoaded]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const severityFromScore = (score: number) => {
    if (score >= 4) return 'bg-[hsl(var(--stat-green-bg))] text-[hsl(var(--stat-green))]';
    if (score >= 3) return 'bg-[hsl(var(--stat-blue-bg))] text-[hsl(var(--stat-blue))]';
    if (score >= 2) return 'bg-[hsl(var(--stat-yellow-bg))] text-[hsl(var(--stat-yellow))]';
    return 'bg-destructive/10 text-destructive';
  };

  const scoreInfo = getScoreLabel(evalOverallScore);

  const getQuarterLabel = (q: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      'Q1': { ar: 'Q1 (يناير - مارس)', en: 'Q1 (Jan - Mar)' },
      'Q2': { ar: 'Q2 (أبريل - يونيو)', en: 'Q2 (Apr - Jun)' },
      'Q3': { ar: 'Q3 (يوليو - سبتمبر)', en: 'Q3 (Jul - Sep)' },
      'Q4': { ar: 'Q4 (أكتوبر - ديسمبر)', en: 'Q4 (Oct - Dec)' },
      'M3': { ar: 'M3 — تقييم بعد 3 أشهر من التعيين', en: 'M3 — Post-Hire 3-Month' },
    };
    return language === 'ar' ? labels[q]?.ar : labels[q]?.en;
  };

  return (
    <div className={cn('h-dvh min-h-screen bg-background flex flex-col overflow-hidden', isRTL ? 'font-arabic' : 'font-sans')} dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="shrink-0 sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-foreground text-sm md:text-base truncate">{isAreaManager ? t('بوابة مدير المنطقة', 'Area Manager Portal') : t('بوابة مدير المحطة', 'Station Manager Portal')}</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{isAreaManager ? t('البحر الأحمر والصعيد', 'Red Sea & Upper Egypt') : stationName} - {language === 'ar' ? user?.nameAr : user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => { refreshEmployees(); toast({ title: language === 'ar' ? 'تم التحديث' : 'Refreshed' }); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
              <Globe className="h-4 w-4" />
            </Button>
            <NotificationDropdown variant="portal" portalFilter="station_manager" />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 md:gap-1.5 text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('خروج', 'Logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ overscrollBehavior: 'none', overscrollBehaviorY: 'none', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' as any }}>
        <div className="p-4 md:p-6 xl:p-8 w-full max-w-none space-y-4 md:space-y-6 xl:space-y-8 lg:text-[15px]">
          <PortalWelcomeBanner />

        {/* Multi-Station Selector (Area Manager / Station HR with multiple stations) */}
        {isMultiStation && managedStations.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 md:p-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t('اختر المحطة:', 'Select Station:')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedStation === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedStation('all')}
                  className="h-8 text-xs"
                >
                  {t('جميع المحطات', 'All Stations')}
                </Button>
                {managedStations.map(s => (
                  <Button
                    key={s.code}
                    size="sm"
                    variant={selectedStation === s.code ? 'default' : 'outline'}
                    onClick={() => setSelectedStation(s.code)}
                    className="h-8 text-xs"
                  >
                    {language === 'ar' ? s.labelAr : s.labelEn}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}



        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { if (canSee(v)) setActiveTab(v); }} className={cn("space-y-4 lg:space-y-0 lg:grid lg:gap-6 xl:gap-8", sideCollapsed ? "lg:grid-cols-[68px_minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]")} dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Sidebar nav (lg+) / scroll bar (mobile) */}
          <aside className={cn("lg:sticky lg:top-20 lg:self-start lg:h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:bg-card lg:rounded-2xl lg:border lg:border-border lg:shadow-sm lg:p-2 transition-all", sideCollapsed && "lg:p-2")}>
            <div className="hidden lg:flex items-center justify-between px-2 pt-1 pb-2">
              {!sideCollapsed && <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('الأقسام', 'Sections')}</span>}
              <Button variant="ghost" size="icon" className="h-7 w-7 ms-auto" onClick={() => setSideCollapsed(s => !s)} aria-label={t('طي', 'Collapse')}>
                {sideCollapsed ? (isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : (isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />)}
              </Button>
            </div>
            <div className="lg:hidden -mx-4 md:-mx-6 px-4 md:px-6 py-2 bg-background/95 backdrop-blur border-b border-border/50 overflow-x-auto sticky top-16 z-30">
              <TabsList className="inline-flex flex-nowrap gap-1 w-max" dir="rtl">
                {canSee('dashboard') && (<TabsTrigger value="dashboard" className="gap-1.5 text-xs"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">{t('لوحة التحكم', 'Dashboard')}</span></TabsTrigger>)}
                {canSee('employees') && (<TabsTrigger value="employees" className="gap-1.5 text-xs"><Users className="h-4 w-4" /><span className="hidden sm:inline">{t('الموظفين', 'Employees')}</span></TabsTrigger>)}
                {canSee('attendance') && (<TabsTrigger value="attendance" className="gap-1.5 text-xs"><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">{t('الحضور', 'Attendance')}</span></TabsTrigger>)}
                {canSee('leaveCalendar') && (<TabsTrigger value="leaveCalendar" className="gap-1.5 text-xs"><CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">{t('تقويم الإجازات', 'Leave Calendar')}</span></TabsTrigger>)}
                {canSee('workHours') && (<TabsTrigger value="workHours" className="gap-1.5 text-xs"><Clock className="h-4 w-4" /><span className="hidden sm:inline">{t('ساعات العمل', 'Work Hours')}</span></TabsTrigger>)}
                {canSee('approvals') && (<TabsTrigger value="approvals" className="gap-1.5 text-xs"><ClipboardCheck className="h-4 w-4" /><span className="hidden sm:inline">{t('الموافقات', 'Approvals')}</span></TabsTrigger>)}
                {canSee('evaluations') && (<TabsTrigger value="evaluations" className="gap-1.5 text-xs"><Star className="h-4 w-4" /><span className="hidden sm:inline">{t('التقييمات', 'Evaluations')}</span></TabsTrigger>)}
                {canSee('uniforms') && (<TabsTrigger value="uniforms" className="gap-1.5 text-xs"><Shirt className="h-4 w-4" /><span className="hidden sm:inline">{t('اليونيفورم', 'Uniforms')}</span></TabsTrigger>)}
                {canSee('violations') && (<TabsTrigger value="violations" className="gap-1.5 text-xs"><AlertTriangle className="h-4 w-4" /><span className="hidden sm:inline">{t('المخالفات', 'Violations')}</span></TabsTrigger>)}
                {canSee('vehicles') && (<TabsTrigger value="vehicles" className="gap-1.5 text-xs"><Car className="h-4 w-4" /><span className="hidden sm:inline">{t('السيارات', 'Vehicles')}</span></TabsTrigger>)}
                {canSee('companyCard') && (<TabsTrigger value="companyCard" className="gap-1.5 text-xs"><IdCard className="h-4 w-4" /><span className="hidden sm:inline">{t('كارت الشركة', 'Company Card')}</span></TabsTrigger>)}
                {canSee('reports') && (<TabsTrigger value="reports" className="gap-1.5 text-xs"><FileText className="h-4 w-4" /><span className="hidden sm:inline">{t('التقارير', 'Reports')}</span></TabsTrigger>)}
              </TabsList>
            </div>
            <TabsList className={cn("hidden lg:flex flex-col items-stretch gap-1 bg-transparent h-auto p-0 w-full", sideCollapsed && "[&_button>*:not(svg)]:hidden [&_button]:justify-center [&_button]:px-2")}>
              {canSee('dashboard') && (<TabsTrigger value="dashboard" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><BarChart3 className="h-5 w-5 shrink-0" />{t('لوحة التحكم', 'Dashboard')}</TabsTrigger>)}
              {canSee('employees') && (<TabsTrigger value="employees" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Users className="h-5 w-5 shrink-0" />{t('الموظفين', 'Employees')}</TabsTrigger>)}
              {canSee('attendance') && (<TabsTrigger value="attendance" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><CalendarDays className="h-5 w-5 shrink-0" />{t('الحضور', 'Attendance')}</TabsTrigger>)}
              {canSee('leaveCalendar') && (<TabsTrigger value="leaveCalendar" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><CalendarIcon className="h-5 w-5 shrink-0" />{t('تقويم الإجازات', 'Leave Calendar')}</TabsTrigger>)}
              {canSee('workHours') && (<TabsTrigger value="workHours" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Clock className="h-5 w-5 shrink-0" />{t('ساعات العمل', 'Work Hours')}</TabsTrigger>)}
              {canSee('approvals') && (<TabsTrigger value="approvals" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><ClipboardCheck className="h-5 w-5 shrink-0" />{t('الموافقات', 'Approvals')}</TabsTrigger>)}
              {canSee('evaluations') && (<TabsTrigger value="evaluations" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Star className="h-5 w-5 shrink-0" />{t('التقييمات', 'Evaluations')}</TabsTrigger>)}
              {canSee('uniforms') && (<TabsTrigger value="uniforms" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Shirt className="h-5 w-5 shrink-0" />{t('اليونيفورم', 'Uniforms')}</TabsTrigger>)}
              {canSee('violations') && (<TabsTrigger value="violations" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><AlertTriangle className="h-5 w-5 shrink-0" />{t('المخالفات', 'Violations')}</TabsTrigger>)}
              {canSee('vehicles') && (<TabsTrigger value="vehicles" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Car className="h-5 w-5 shrink-0" />{t('السيارات', 'Vehicles')}</TabsTrigger>)}
              {canSee('companyCard') && (<TabsTrigger value="companyCard" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><IdCard className="h-5 w-5 shrink-0" />{t('كارت الشركة', 'Company Card')}</TabsTrigger>)}
              {canSee('reports') && (<TabsTrigger value="reports" className="justify-start gap-3 text-sm h-11 px-3 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><FileText className="h-5 w-5 shrink-0" />{t('التقارير', 'Reports')}</TabsTrigger>)}
            </TabsList>
          </aside>

          <div className="min-w-0 space-y-4">
        {activeTab === 'dashboard' && (<>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--stat-blue))] to-[hsl(var(--stat-blue)/0.8)] text-white shadow-lg">
            <div className="absolute top-0 end-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm"><Users className="h-5 w-5" /></div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{t('إجمالي', 'Total')}</span>
              </div>
              <p className="text-3xl font-bold">{stationEmployees.length}</p>
              <p className="text-sm text-white/80 mt-1">{t('الموظفين', 'Employees')}</p>
              {/* Mini bar */}
              <div className="mt-3 flex items-end gap-0.5 h-6">
                {[65, 80, 55, 90, 70, 85, 75].map((h, i) => (
                  <div key={i} className="flex-1 bg-white/30 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--stat-green))] to-[hsl(var(--stat-green)/0.8)] text-white shadow-lg">
            <div className="absolute top-0 end-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm"><UserCheck className="h-5 w-5" /></div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{stationEmployees.length > 0 ? `${Math.round((stationEmployees.filter(e => e.status === 'active').length / stationEmployees.length) * 100)}%` : '0%'}</span>
              </div>
              <p className="text-3xl font-bold">{stationEmployees.filter(e => e.status === 'active').length}</p>
              <p className="text-sm text-white/80 mt-1">{t('نشط', 'Active')}</p>
              {/* Mini progress ring */}
              <div className="mt-3 flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <svg viewBox="0 0 36 36" className="w-6 h-6 transform -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="white" strokeWidth="4" strokeDasharray={`${stationEmployees.length > 0 ? (stationEmployees.filter(e => e.status === 'active').length / stationEmployees.length) * 94 : 0} 94`} strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-xs text-white/70">{t('من إجمالي الموظفين', 'of total employees')}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--stat-purple))] to-[hsl(var(--stat-purple)/0.8)] text-white shadow-lg">
            <div className="absolute top-0 end-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm"><Star className="h-5 w-5" /></div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {stationReviews.length > 0 ? `${(stationReviews.reduce((s, r) => s + (r.score || 0), 0) / stationReviews.length).toFixed(1)} ⭐` : '-'}
                </span>
              </div>
              <p className="text-3xl font-bold">{stationReviews.length}</p>
              <p className="text-sm text-white/80 mt-1">{t('التقييمات', 'Evaluations')}</p>
              {/* Mini dots */}
              <div className="mt-3 flex items-center gap-1.5">
                {stationReviews.slice(0, 8).map((r, i) => (
                  <div key={i} className={cn("w-2.5 h-2.5 rounded-full", (r.score || 0) >= 3.5 ? "bg-white" : "bg-white/40")} />
                ))}
                {stationReviews.length === 0 && <span className="text-xs text-white/50">{t('لا توجد تقييمات', 'No evaluations')}</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--stat-coral))] to-[hsl(var(--stat-coral)/0.8)] text-white shadow-lg">
            <div className="absolute top-0 end-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm"><AlertTriangle className="h-5 w-5" /></div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {stationViolations.filter(v => v.status === 'pending').length > 0 ? `${stationViolations.filter(v => v.status === 'pending').length} ${t('معلق', 'pending')}` : t('لا يوجد', 'None')}
                </span>
              </div>
              <p className="text-3xl font-bold">{stationViolations.length}</p>
              <p className="text-sm text-white/80 mt-1">{t('المخالفات', 'Violations')}</p>
              {/* Mini status breakdown */}
              <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden bg-white/20">
                {stationViolations.filter(v => v.status === 'active').length > 0 && (
                  <div className="bg-white h-full rounded-full" style={{ width: `${(stationViolations.filter(v => v.status === 'active').length / Math.max(stationViolations.length, 1)) * 100}%` }} />
                )}
                {stationViolations.filter(v => v.status === 'pending').length > 0 && (
                  <div className="bg-white/60 h-full rounded-full" style={{ width: `${(stationViolations.filter(v => v.status === 'pending').length / Math.max(stationViolations.length, 1)) * 100}%` }} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today Present Card */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
            <div className="absolute top-0 end-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm"><LogIn className="h-5 w-5" /></div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{t('اليوم', 'Today')}</span>
              </div>
              <p className="text-3xl font-bold">{todayPresentCount}</p>
              <p className="text-sm text-white/80 mt-1">{t('الحضور', 'Present')}</p>
              <div className="mt-3 h-2 rounded-full overflow-hidden bg-white/20">
                <div className="bg-white h-full rounded-full transition-all" style={{ width: `${stationEmployees.filter(e => e.status === 'active').length > 0 ? (todayPresentCount / stationEmployees.filter(e => e.status === 'active').length) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* Today Absent Card */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg">
            <div className="absolute top-0 end-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-4 md:p-5 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm"><UserX className="h-5 w-5" /></div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{t('اليوم', 'Today')}</span>
              </div>
              <p className="text-3xl font-bold">{todayAbsentCount}</p>
              <p className="text-sm text-white/80 mt-1">{t('الغياب', 'Absent')}</p>
              <div className="mt-3 h-2 rounded-full overflow-hidden bg-white/20">
                <div className="bg-white h-full rounded-full transition-all" style={{ width: `${stationEmployees.filter(e => e.status === 'active').length > 0 ? (todayAbsentCount / stationEmployees.filter(e => e.status === 'active').length) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Department Distribution */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('توزيع الأقسام', 'Department Distribution')}</h3>
              <div className="space-y-2">
                {(() => {
                  const deptCounts: Record<string, number> = {};
                  stationEmployees.forEach(e => { deptCounts[e.department || (ar ? 'غير محدد' : 'N/A')] = (deptCounts[e.department || (ar ? 'غير محدد' : 'N/A')] || 0) + 1; });
                  const sorted = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                  const max = sorted[0]?.[1] || 1;
                  return sorted.map(([dept, count], i) => {
                    const colors = ['bg-[hsl(var(--stat-blue))]', 'bg-[hsl(var(--stat-green))]', 'bg-[hsl(var(--stat-purple))]', 'bg-[hsl(var(--stat-coral))]', 'bg-primary'];
                    return (
                      <div key={dept} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 truncate">{dept}</span>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", colors[i % colors.length])} style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold w-6 text-end">{count}</span>
                      </div>
                    );
                  });
                })()}
                {stationEmployees.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{t('لا توجد بيانات', 'No data')}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Employee Status */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('حالة الموظفين', 'Employee Status')}</h3>
              <div className="flex items-center justify-center gap-6">
                {[
                  { key: 'active', label: t('نشط', 'Active'), count: stationEmployees.filter(e => e.status === 'active').length, color: 'hsl(var(--stat-green))' },
                  { key: 'inactive', label: t('غير نشط', 'Inactive'), count: stationEmployees.filter(e => e.status === 'inactive').length, color: 'hsl(var(--stat-coral))' },
                  { key: 'suspended', label: t('موقوف', 'Suspended'), count: stationEmployees.filter(e => e.status === 'suspended').length, color: 'hsl(var(--stat-purple))' },
                ].map(item => (
                  <div key={item.key} className="text-center">
                    <div className="relative w-14 h-14 mx-auto mb-2">
                      <svg viewBox="0 0 36 36" className="w-14 h-14 transform -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke={item.color} strokeWidth="3" strokeDasharray={`${stationEmployees.length > 0 ? (item.count / stationEmployees.length) * 94 : 0} 94`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{item.count}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Violations Summary */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('ملخص المخالفات', 'Violations Summary')}</h3>
              <div className="space-y-2">
                {(() => {
                  const typeCounts: Record<string, number> = {};
                  stationViolations.forEach(v => { typeCounts[v.type] = (typeCounts[v.type] || 0) + 1; });
                  const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
                  if (sorted.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">{t('لا توجد مخالفات', 'No violations')}</p>;
                  const total = stationViolations.length;
                  return sorted.map(([type, count]) => {
                    const vt = violationTypes.find(vv => vv.value === type);
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-xs">{ar ? vt?.ar : vt?.en || type}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-[hsl(var(--stat-coral))] rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold">{count}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />{t('توزيع الأقسام', 'Department Distribution')}</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {(() => {
                const deptCounts: Record<string, number> = {};
                stationEmployees.forEach(e => { const k = e.department || (ar ? 'غير محدد' : 'N/A'); deptCounts[k] = (deptCounts[k] || 0) + 1; });
                const data = Object.entries(deptCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 8);
                if (data.length === 0) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} orientation={ar ? 'right' : 'left'} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{t('حالة الموظفين', 'Employee Status')}</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {(() => {
                const data = [
                  { name: t('نشط', 'Active'), value: stationEmployees.filter(e => e.status === 'active').length, color: 'hsl(var(--stat-green))' },
                  { name: t('غير نشط', 'Inactive'), value: stationEmployees.filter(e => e.status === 'inactive').length, color: 'hsl(var(--stat-coral))' },
                  { name: t('موقوف', 'Suspended'), value: stationEmployees.filter(e => e.status === 'suspended').length, color: 'hsl(var(--stat-purple))' },
                ].filter(d => d.value > 0);
                if (data.length === 0) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t('لا توجد بيانات', 'No data')}</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label>
                        {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-primary" />{t('توزيع التقييمات', 'Evaluation Scores')}</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {(() => {
                const buckets = [
                  { name: t('ممتاز', 'Excellent') + ' (4-5)', count: stationReviews.filter(r => (r.score || 0) >= 4).length },
                  { name: t('جيد', 'Good') + ' (3-4)', count: stationReviews.filter(r => (r.score || 0) >= 3 && (r.score || 0) < 4).length },
                  { name: t('متوسط', 'Average') + ' (2-3)', count: stationReviews.filter(r => (r.score || 0) >= 2 && (r.score || 0) < 3).length },
                  { name: t('ضعيف', 'Poor') + ' (<2)', count: stationReviews.filter(r => (r.score || 0) < 2).length },
                ];
                if (stationReviews.length === 0) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t('لا توجد تقييمات', 'No evaluations')}</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buckets} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} orientation={ar ? 'right' : 'left'} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="hsl(var(--stat-purple))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" />{t('أنواع المخالفات', 'Violation Types')}</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {(() => {
                const typeCounts: Record<string, number> = {};
                stationViolations.forEach(v => { typeCounts[v.type] = (typeCounts[v.type] || 0) + 1; });
                const data = Object.entries(typeCounts).map(([k, v]) => {
                  const vt = violationTypes.find(vv => vv.value === k);
                  return { name: ar ? (vt?.ar || k) : (vt?.en || k), value: v };
                });
                if (data.length === 0) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t('لا توجد مخالفات', 'No violations')}</div>;
                const palette = ['hsl(var(--stat-coral))','hsl(var(--stat-purple))','hsl(var(--stat-blue))','hsl(var(--stat-green))','hsl(var(--primary))','hsl(var(--destructive))','hsl(var(--muted-foreground))'];
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </div>
        {/* Bonus Percentage linked to Quarterly Evaluations */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            {t('تقرير المكافآت', 'Bonus Report')}
            <Badge variant="outline" className="font-normal">{dashboardQuarter || t('كل الأرباع', 'All quarters')} · {dashboardYear || ''}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                const rows = stationReviews.filter(r =>
                  (!dashboardYear || String(r.year) === String(dashboardYear)) &&
                  (!dashboardQuarter || r.quarter === dashboardQuarter) &&
                  r.bonusPercentage != null
                );
                if (rows.length === 0) {
                  toast({ title: t('لا توجد بيانات للتصدير', 'No data to export'), variant: 'destructive' });
                  return;
                }
                const headers = ['Employee','Department','Station','Quarter','Year','Score','Bonus %','Status','Review Date'];
                const csvRows = [headers.join(',')];
                rows.forEach(r => {
                  const emp = stationEmployees.find(e => e.id === r.employeeId);
                  const name = (emp?.nameAr || emp?.nameEn || r.employeeName || '').replace(/"/g, '""');
                  const dept = (r.department || '').replace(/"/g, '""');
                  const station = (r.station || user?.station || '').replace(/"/g, '""');
                  csvRows.push([
                    `"${name}"`, `"${dept}"`, `"${station}"`,
                    r.quarter, r.year, (r.score || 0).toFixed(2),
                    r.bonusPercentage, r.status || '', r.reviewDate || ''
                  ].join(','));
                });
                const csv = '\uFEFF' + csvRows.join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bonus_report_${dashboardQuarter || 'all'}_${dashboardYear || 'all'}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: t('تم تصدير CSV', 'CSV exported') });
              }}
            >
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={async () => {
                const rows = stationReviews.filter(r =>
                  (!dashboardYear || String(r.year) === String(dashboardYear)) &&
                  (!dashboardQuarter || r.quarter === dashboardQuarter) &&
                  r.bonusPercentage != null
                );
                if (rows.length === 0) {
                  toast({ title: t('لا توجد بيانات للتصدير', 'No data to export'), variant: 'destructive' });
                  return;
                }
                const { default: jsPDF } = await import('jspdf');
                const { default: autoTable } = await import('jspdf-autotable');
                const doc = new jsPDF({ orientation: 'landscape' });
                doc.setFontSize(14);
                doc.text(`Bonus Report - ${dashboardQuarter || 'All'} ${dashboardYear || ''}`, 14, 14);
                doc.setFontSize(10);
                doc.text(`Station/Area: ${user?.station || '-'}    Generated: ${new Date().toLocaleString()}`, 14, 20);
                const body = rows.map(r => {
                  const emp = stationEmployees.find(e => e.id === r.employeeId);
                  const name = emp?.nameEn || emp?.nameAr || r.employeeName || '-';
                  return [name, r.department || '-', r.station || user?.station || '-', r.quarter, String(r.year), (r.score || 0).toFixed(2), `${r.bonusPercentage}%`, r.status || '-'];
                });
                const avg = Math.round((rows.reduce((s, r) => s + (r.bonusPercentage || 0), 0) / rows.length) * 10) / 10;
                autoTable(doc, {
                  startY: 26,
                  head: [['Employee','Department','Station','Quarter','Year','Score','Bonus %','Status']],
                  body,
                  styles: { fontSize: 9 },
                  headStyles: { fillColor: [37, 99, 235] },
                  foot: [['', '', '', '', '', 'Average', `${avg}%`, '']],
                  footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
                });
                doc.save(`bonus_report_${dashboardQuarter || 'all'}_${dashboardYear || 'all'}.pdf`);
                toast({ title: t('تم تصدير PDF', 'PDF exported') });
              }}
            >
              <Download className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />{t('متوسط نسبة المكافأة لكل ربع', 'Avg Bonus % per Quarter')}</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {(() => {
                const qs = ['Q1','Q2','Q3','Q4'];
                const yr = String(new Date().getFullYear());
                const data = qs.map(q => {
                  const rs = stationReviews.filter(r => r.quarter === q && String(r.year) === yr && r.bonusPercentage != null);
                  const avg = rs.length ? rs.reduce((s, r) => s + (r.bonusPercentage || 0), 0) / rs.length : 0;
                  return { name: q, avg: Math.round(avg * 10) / 10, count: rs.length };
                });
                if (data.every(d => d.count === 0)) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t('لا توجد بيانات مكافآت', 'No bonus data')}</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} orientation={ar ? 'right' : 'left'} unit="%" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: any) => `${v}%`} />
                      <Bar dataKey="avg" fill="hsl(var(--stat-green))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-primary" />{t('نسب المكافآت حسب التقييم', 'Bonus % by Evaluation')}</CardTitle></CardHeader>
            <CardContent className="p-0 max-h-[300px] overflow-y-auto">
              {(() => {
                const rows = stationReviews
                  .filter(r => r.bonusPercentage != null)
                  .sort((a, b) => `${b.year}-${b.quarter}`.localeCompare(`${a.year}-${a.quarter}`))
                  .slice(0, 20);
                if (rows.length === 0) return <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">{t('لا توجد بيانات مكافآت', 'No bonus data')}</div>;
                return (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-start p-2 font-semibold">{t('الموظف', 'Employee')}</th>
                        <th className="text-center p-2 font-semibold">{t('الربع', 'Quarter')}</th>
                        <th className="text-center p-2 font-semibold">{t('السنة', 'Year')}</th>
                        <th className="text-center p-2 font-semibold">{t('الدرجة', 'Score')}</th>
                        <th className="text-center p-2 font-semibold">{t('المكافأة', 'Bonus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => {
                        const emp = stationEmployees.find(e => e.id === r.employeeId);
                        const name = emp?.nameAr || emp?.nameEn || r.employeeName || '-';
                        return (
                          <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30">
                            <td className="p-2 truncate max-w-[180px]">{name}</td>
                            <td className="p-2 text-center">{r.quarter}</td>
                            <td className="p-2 text-center">{r.year}</td>
                            <td className="p-2 text-center font-semibold">{(r.score || 0).toFixed(1)}</td>
                            <td className="p-2 text-center"><span className="inline-block px-2 py-0.5 rounded-full bg-[hsl(var(--stat-green))]/15 text-[hsl(var(--stat-green))] font-bold">{r.bonusPercentage}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </CardContent>
          </Card>
        </div>
        </>)}


          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle>{t('موظفي المحطة', 'Station Employees')}</CardTitle>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t('بحث بالاسم أو الرقم...', 'Search by name or ID...')} value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="ps-9" />
                  </div>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('جميع الأقسام', 'All Departments')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('جميع الأقسام', 'All Departments')}</SelectItem>
                      {stationDepartments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={t('جميع الحالات', 'All Statuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('جميع الحالات', 'All Statuses')}</SelectItem>
                      <SelectItem value="active">{t('نشط', 'Active')}</SelectItem>
                      <SelectItem value="inactive">{t('غير نشط', 'Inactive')}</SelectItem>
                      <SelectItem value="suspended">{t('معلق', 'Suspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader><TableRow>
                    <TableHead>{t('الرقم', 'ID')}</TableHead>
                    <TableHead>{t('الاسم', 'Name')}</TableHead>
                    <TableHead>{t('الوظيفة', 'Job Title')}</TableHead>
                    <TableHead>{t('القسم', 'Department')}</TableHead>
                    <TableHead>{t('تاريخ التعيين', 'Hire Date')}</TableHead>
                    <TableHead>{t('الحالة', 'Status')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredStationEmployees.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('لا يوجد موظفين', 'No employees found')}</TableCell></TableRow>
                    ) : filteredStationEmployees.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                        <TableCell className="font-medium">{language === 'ar' ? emp.nameAr : emp.nameEn}</TableCell>
                        <TableCell>{emp.jobTitle}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>{emp.hireDate ? formatDate(emp.hireDate) : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                            {emp.status === 'active' ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {t('سجلات الحضور والانصراف', 'Attendance Records')}
                </CardTitle>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t('بحث بالاسم أو الرقم...', 'Search by name or ID...')} value={attSearch} onChange={e => setAttSearch(e.target.value)} className="ps-9" />
                  </div>
                  <Select value={attDeptFilter} onValueChange={setAttDeptFilter}>
                    <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder={t('القسم', 'Department')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('جميع الأقسام', 'All Departments')}</SelectItem>
                      {stationDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">{t('من', 'From')}</label>
                    <Input type="date" value={attDateFrom} onChange={e => setAttDateFrom(e.target.value)} className="w-[150px] h-9 text-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">{t('إلى', 'To')}</label>
                    <Input type="date" value={attDateTo} onChange={e => setAttDateTo(e.target.value)} className="w-[150px] h-9 text-sm" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: t('حضور', 'Present'), value: attStats.present, icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-950/40', color: 'text-emerald-600' },
                    { label: t('تأخير', 'Late'), value: attStats.late, icon: Clock, bg: 'bg-amber-50 dark:bg-amber-950/40', color: 'text-amber-600' },
                    { label: t('غياب', 'Absent'), value: attStats.absent, icon: UserX, bg: 'bg-red-50 dark:bg-red-950/40', color: 'text-red-600' },
                    { label: t('إجمالي الساعات', 'Total Hours'), value: `${String(attStats.totalHours).padStart(2,'0')}:${String(attStats.totalMinutes).padStart(2,'0')}`, icon: Clock, bg: 'bg-violet-50 dark:bg-violet-950/40', color: 'text-violet-600' },
                  ].map((s, i) => (
                    <div key={i} className={cn("rounded-xl p-3 text-center", s.bg)}>
                      <s.icon className={cn("w-5 h-5 mx-auto mb-1", s.color)} />
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[500px]">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('الموظف', 'Employee')}</TableHead>
                        <TableHead>{t('التاريخ', 'Date')}</TableHead>
                        <TableHead>{t('اليوم', 'Day')}</TableHead>
                        <TableHead>{t('الحضور', 'In')}</TableHead>
                        <TableHead>{t('الانصراف', 'Out')}</TableHead>
                        <TableHead>{t('الساعات', 'Hours')}</TableHead>
                        <TableHead>{t('الحالة', 'Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attLoading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('جاري التحميل...', 'Loading...')}</TableCell></TableRow>
                      ) : filteredAttRecords.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('لا توجد سجلات', 'No records')}</TableCell></TableRow>
                      ) : (
                        attPagination.paginatedItems.map(r => {
                          const emp = stationEmployees.find(e => e.id === r.employee_id);
                          const checkInTime = r.check_in ? format(new Date(r.check_in), 'HH:mm') : '--:--';
                          const checkOutTime = r.check_out ? format(new Date(r.check_out), 'HH:mm') : '--:--';
                          const workH = r.work_hours > 0 || r.work_minutes > 0 ? `${String(Math.floor(r.work_minutes / 60)).padStart(2,'0')}:${String(r.work_minutes % 60).padStart(2,'0')}` : '-';
                          const statusMap: Record<string, { cls: string; ar: string; en: string }> = {
                            present: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-300', ar: 'حاضر', en: 'Present' },
                            absent: { cls: 'bg-red-100 text-red-700 border-red-300', ar: 'غائب', en: 'Absent' },
                            late: { cls: 'bg-amber-100 text-amber-700 border-amber-300', ar: 'متأخر', en: 'Late' },
                            'on-leave': { cls: 'bg-blue-100 text-blue-700 border-blue-300', ar: 'إجازة', en: 'On Leave' },
                            mission: { cls: 'bg-purple-100 text-purple-700 border-purple-300', ar: 'مأمورية', en: 'Mission' },
                          };
                          const st = statusMap[r.status] || statusMap.absent;
                          const displayStatus = r.is_late && r.status === 'present' ? statusMap.late : st;
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="min-w-[220px]">
                                <div>
                                  <p className="font-medium text-sm whitespace-normal break-words" title={ar ? emp?.nameAr : emp?.nameEn}>{ar ? emp?.nameAr : emp?.nameEn}</p>
                                  <p className="text-xs text-muted-foreground">{emp?.employeeId}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{r.date}</TableCell>
                              <TableCell className="text-sm">{format(new Date(r.date), 'EEEE', { locale: ar ? arLocale : enUS })}</TableCell>
                              <TableCell className="font-mono text-sm">{checkInTime}</TableCell>
                              <TableCell className="font-mono text-sm">{checkOutTime}</TableCell>
                              <TableCell className="text-sm">{workH}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={displayStatus.cls}>
                                  {ar ? displayStatus.ar : displayStatus.en}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={attPagination.currentPage}
                  totalPages={attPagination.totalPages}
                  totalItems={attPagination.totalItems}
                  startIndex={attPagination.startIndex}
                  endIndex={attPagination.endIndex}
                  onPageChange={attPagination.setCurrentPage}
                />

              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Hours Tab */}
          <TabsContent value="workHours">
            <StationWorkHours stationEmployees={stationEmployees.map(e => ({ id: e.id, department: e.department }))} />
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <ManagerApprovals stationEmployees={stationEmployees} />
          </TabsContent>

          <TabsContent value="evaluations">
            <Tabs value={evalInnerTab} onValueChange={setEvalInnerTab} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
              <TabsList className="inline-grid grid-cols-3" dir="rtl">
                <TabsTrigger value="reviews" className="text-xs md:text-sm gap-1"><FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('السجل', 'Records')}</span></TabsTrigger>
                <TabsTrigger value="newReview" className="text-xs md:text-sm gap-1"><Star className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('تقييم جديد', 'New Review')}</span></TabsTrigger>
                <TabsTrigger value="dashboard" className="text-xs md:text-sm gap-1"><BarChart3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('لوحة التحكم', 'Dashboard')}</span></TabsTrigger>
              </TabsList>

              {/* Dashboard */}
              <TabsContent value="dashboard">
                <div className="space-y-4">
                  {/* Year/Quarter filter */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-end gap-4 flex-wrap" dir="rtl">
                        <div className="space-y-1">
                          <Label className="text-xs">{t('السنة', 'Year')}</Label>
                          <Select value={newEvalYear} onValueChange={setNewEvalYear}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t('الربع السنوي', 'Quarter')}</Label>
                          <Select value={newEvalQuarter} onValueChange={setNewEvalQuarter}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('اختر الربع', 'Select quarter')} /></SelectTrigger>
                            <SelectContent>
                              {quarters.map(q => <SelectItem key={q} value={q}>{getQuarterLabel(q)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Card className="border-[hsl(var(--stat-green))]/30">
                      <CardContent className="p-3 text-center space-y-1">
                        <UserCheck className="w-5 h-5 mx-auto text-[hsl(var(--stat-green))]" />
                        <p className="text-xl font-bold text-[hsl(var(--stat-green))]">{dashboardEvaluated}</p>
                        <p className="text-[10px] text-muted-foreground">{t('تم تقييمهم', 'Evaluated')}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-destructive/30">
                      <CardContent className="p-3 text-center space-y-1">
                        <UserX className="w-5 h-5 mx-auto text-destructive" />
                        <p className="text-xl font-bold text-destructive">{dashboardNotEvaluated}</p>
                        <p className="text-[10px] text-muted-foreground">{t('لم يتم تقييمهم', 'Not Evaluated')}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center space-y-1">
                        <Users className="w-5 h-5 mx-auto text-primary" />
                        <p className="text-xl font-bold">{activeStationEmps.length}</p>
                        <p className="text-[10px] text-muted-foreground">{t('الإجمالي', 'Total')}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-muted-foreground/20">
                      <CardContent className="p-3 text-center space-y-1">
                        <FileText className="w-5 h-5 mx-auto text-muted-foreground" />
                        <p className="text-xl font-bold text-muted-foreground">{dashboardDraft}</p>
                        <p className="text-[10px] text-muted-foreground">{t('مسودة', 'Draft')}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-[hsl(var(--stat-yellow))]/30">
                      <CardContent className="p-3 text-center space-y-1">
                        <Send className="w-5 h-5 mx-auto text-[hsl(var(--stat-yellow))]" />
                        <p className="text-xl font-bold text-[hsl(var(--stat-yellow))]">{dashboardSubmitted}</p>
                        <p className="text-[10px] text-muted-foreground">{t('مرسلة', 'Submitted')}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-[hsl(var(--stat-green))]/30">
                      <CardContent className="p-3 text-center space-y-1">
                        <ShieldCheck className="w-5 h-5 mx-auto text-[hsl(var(--stat-green))]" />
                        <p className="text-xl font-bold text-[hsl(var(--stat-green))]">{dashboardApproved}</p>
                        <p className="text-[10px] text-muted-foreground">{t('معتمدة', 'Approved')}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Department Breakdown */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="w-5 h-5 text-primary" />
                        {t('حالة التقييم حسب القسم', 'Evaluation Status by Department')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dashboardDeptBreakdown.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t('لا توجد بيانات', 'No data')}</p>
                      ) : dashboardDeptBreakdown.map(d => {
                        const pct = d.total > 0 ? Math.round((d.evaluated / d.total) * 100) : 0;
                        return (
                          <div key={d.dept} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{d.dept}</span>
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className="bg-[hsl(var(--stat-green))]/10 text-[hsl(var(--stat-green))] border-[hsl(var(--stat-green))]/30 gap-1">
                                  <UserCheck className="w-3 h-3" /> {d.evaluated}
                                </Badge>
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                                  <UserX className="w-3 h-3" /> {d.notEvaluated}
                                </Badge>
                                <span className="text-muted-foreground">/ {d.total}</span>
                              </div>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* New Review */}
              <TabsContent value="newReview">
                <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
                  {/* Sidebar: Employee selection */}
                  <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="w-5 h-5 text-primary" />
                        {t('اختيار الموظف', 'Select Employee')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t('القسم', 'Department')}</Label>
                          <Select value={newEvalDeptFilter} onValueChange={setNewEvalDeptFilter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('جميع الأقسام', 'All Departments')}</SelectItem>
                              {stationDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t('السنة', 'Year')}</Label>
                          <Select value={newEvalYear} onValueChange={setNewEvalYear}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t('الربع', 'Quarter')}</Label>
                          <Select value={newEvalQuarter} onValueChange={setNewEvalQuarter}>
                            <SelectTrigger><SelectValue placeholder={t('اختر الربع', 'Select quarter')} /></SelectTrigger>
                            <SelectContent>{quarters.map(q => <SelectItem key={q} value={q}>{getQuarterLabel(q)}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Employee list with pagination */}
                      <div className="border rounded-lg">
                        <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                          <span className="text-sm font-medium">{t('الموظفون', 'Employees')} ({newEvalFilteredEmps.length})</span>
                          {newEvalQuarter && newEvalYear && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--stat-green))] inline-block" /> {t('تم التقييم', 'Evaluated')}</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 inline-block" /> {t('لم يتم التقييم', 'Not evaluated')}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={newEvalSearch}
                              onChange={e => setNewEvalSearch(e.target.value)}
                              placeholder={t('ابحث بالاسم أو الرقم الوظيفي...', 'Search by name or employee code...')}
                              className="ps-8 text-sm h-9"
                            />
                          </div>
                        </div>
                        {newEvalFilteredEmps.length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground text-sm">{t('لا يوجد موظفون', 'No employees')}</div>
                        ) : (
                          <>
                            <div className="divide-y">
                              {newEvalPaginatedEmps.map(emp => {
                                const isEvaluated = newEvalEvaluatedIds.has(emp.id);
                                const isSelected = newEvalSelectedEmp === emp.id;
                                return (
                                  <button key={emp.id} type="button" onClick={() => setNewEvalSelectedEmp(emp.id)}
                                    className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50", isSelected && "bg-primary/10")}>
                                    {newEvalQuarter && newEvalYear ? (
                                      <span className={cn("w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1", isEvaluated ? "bg-[hsl(var(--stat-green))] ring-[hsl(var(--stat-green))]/30" : "bg-muted-foreground/30 ring-muted-foreground/10")} />
                                    ) : (
                                      <Circle className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                                    )}
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                      {(ar ? emp.nameAr : emp.nameEn).split(' ').map(w => w[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{ar ? emp.nameAr : emp.nameEn}</p>
                                      <p className="text-xs text-muted-foreground truncate">{emp.employeeId} • {emp.department}</p>
                                    </div>
                                    {isSelected && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                            {newEvalTotalPages > 1 && (
                              <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
                                <Button variant="ghost" size="sm" disabled={newEvalPage === 0} onClick={() => setNewEvalPage(p => p - 1)} className="gap-1">
                                  <ChevronRight className={cn("w-4 h-4", !isRTL && "hidden")} />
                                  <ChevronLeft className={cn("w-4 h-4", isRTL && "hidden")} />
                                  {t('السابق', 'Previous')}
                                </Button>
                                <span className="text-xs text-muted-foreground">{t(`صفحة ${newEvalPage + 1} من ${newEvalTotalPages}`, `Page ${newEvalPage + 1} of ${newEvalTotalPages}`)}</span>
                                <Button variant="ghost" size="sm" disabled={newEvalPage >= newEvalTotalPages - 1} onClick={() => setNewEvalPage(p => p + 1)} className="gap-1">
                                  {t('التالي', 'Next')}
                                  <ChevronLeft className={cn("w-4 h-4", !isRTL && "hidden")} />
                                  <ChevronRight className={cn("w-4 h-4", isRTL && "hidden")} />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {newEvalSelectedEmp && (() => {
                        const selEmp = stationEmployees.find(e => e.id === newEvalSelectedEmp);
                        return selEmp ? (
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                            <span className="font-medium">{t('الموظف المحدد:', 'Selected:')}</span>{' '}
                            <span className="text-primary font-semibold">{ar ? selEmp.nameAr : selEmp.nameEn}</span> - {selEmp.department}
                            {newEvalExisting && (
                              <Badge variant="outline" className="ms-2 bg-[hsl(var(--stat-yellow))]/10 text-[hsl(var(--stat-yellow))] border-[hsl(var(--stat-yellow))]">
                                {t(`تقييم موجود (${newEvalExisting.status === 'draft' ? 'مسودة' : newEvalExisting.status === 'submitted' ? 'مرسل' : 'معتمد'})`, `Existing (${newEvalExisting.status})`)}
                              </Badge>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </CardContent>
                  </Card>
                  </aside>

                  {/* Right column: Evaluation content */}
                  <div className="space-y-4 min-w-0">

                  {/* Quarter context: hours per month + violations */}
                  {newEvalSelectedEmp && newEvalYear && newEvalQuarter && (
                    <Card>
                      <CardHeader>
                        <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
                          <Clock className="w-5 h-5 text-primary" />
                          {ar ? `بيانات الربع ${newEvalQuarter} - ${newEvalYear}` : `Quarter ${newEvalQuarter} - ${newEvalYear} Data`}
                        </CardTitle>
                        <CardDescription>
                          {ar ? 'ساعات العمل والجزاءات التي حصل عليها الموظف في كل شهر من أشهر الربع' : 'Actual work hours and penalties received by the employee per month of the quarter'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {quarterLoading ? (
                          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {ar ? 'جاري التحميل...' : 'Loading...'}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {quarterMonthly.map(m => (
                              <div key={m.month} className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
                                <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                                  <span className="font-semibold">{monthLabelHelper(m.month, ar)}</span>
                                  <Badge variant="outline" className="bg-primary/5 border-primary/30 text-primary">{m.month}/{newEvalYear}</Badge>
                                </div>
                                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                                  <Clock className="w-4 h-4 text-stat-blue" />
                                  <span className="text-muted-foreground">{ar ? 'ساعات العمل:' : 'Work hours:'}</span>
                                  <span className="font-bold text-stat-blue ms-auto">{m.hours.toFixed(1)} {ar ? 'ساعة' : 'h'}</span>
                                </div>
                                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                                  <Clock className="w-4 h-4 text-amber-500" />
                                  <span className="text-muted-foreground">{ar ? 'متوسط الساعات اليومية:' : 'Avg daily hours:'}</span>
                                  <span className="font-bold text-amber-600 ms-auto">{m.avgDailyHours.toFixed(1)} {ar ? 'ساعة' : 'h'}</span>
                                </div>
                                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                                  <AlertTriangle className="w-4 h-4 text-destructive" />
                                  <span className="text-muted-foreground">{ar ? 'عدد الجزاءات:' : 'Penalties:'}</span>
                                  <span className="font-bold text-destructive ms-auto">{m.violations.length}</span>
                                </div>
                                <div className="space-y-2 pt-2 border-t border-border/40">
                                  {m.violations.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-1">{ar ? 'لا توجد جزاءات' : 'No penalties'}</p>
                                  ) : (
                                    m.violations.map(v => {
                                      const tl = violationTypeLabels[v.type] || violationTypeLabels.other;
                                      return (
                                        <div key={v.id} className="rounded-md bg-destructive/5 border border-destructive/20 p-2 text-xs space-y-1">
                                          <div className={cn("flex items-center justify-between gap-2", isRTL && "flex-row-reverse")}>
                                            <span className="font-semibold text-destructive">{ar ? tl.ar : tl.en}</span>
                                            <span className="text-muted-foreground">{formatDate(v.date)}</span>
                                          </div>
                                          {v.description && (
                                            <div className={cn("text-muted-foreground", isRTL && "text-right")}>
                                              <span className="font-medium">{ar ? 'السبب: ' : 'Reason: '}</span>
                                              <span className="whitespace-pre-wrap break-words">{v.description}</span>
                                            </div>
                                          )}
                                          {v.penalty && (
                                            <div className={cn("text-foreground", isRTL && "text-right")}>
                                              <span className="font-medium">{ar ? 'العقوبة: ' : 'Penalty: '}</span>
                                              <span className="whitespace-pre-wrap break-words">{v.penalty}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            ))}
                            {quarterMonthly.length === 0 && (
                              <div className="col-span-full text-center text-sm text-muted-foreground py-6">
                                {ar ? 'لا توجد بيانات' : 'No data available'}
                              </div>
                            )}
                          </div>
                        )}
                        {quarterMonthly.length > 0 && !quarterLoading && (
                          <div className={cn("mt-4 flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm", isRTL && "flex-row-reverse")}>
                            <span className="font-semibold">{ar ? 'إجمالي الربع' : 'Quarter Total'}</span>
                            <div className={cn("flex items-center gap-6", isRTL && "flex-row-reverse")}>
                              <span><span className="text-muted-foreground me-1">{ar ? 'ساعات:' : 'Hours:'}</span><span className="font-bold text-stat-blue">{quarterMonthly.reduce((s, m) => s + m.hours, 0).toFixed(1)}</span></span>
                              <span><span className="text-muted-foreground me-1">{ar ? 'جزاءات:' : 'Penalties:'}</span><span className="font-bold text-destructive">{quarterMonthly.reduce((s, m) => s + m.violations.length, 0)}</span></span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Criteria + Bonus side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Criteria */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Target className="w-4 h-4 text-primary" />
                          {t('معايير التقييم', 'Evaluation Criteria')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {evalCriteria.map((criterion) => (
                          <div key={criterion.id} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">{ar ? criterion.nameAr : criterion.name}</Label>
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{criterion.weight}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className={cn("w-5 h-5 cursor-pointer transition-colors hover:scale-110", star <= criterion.score ? "text-[hsl(var(--stat-yellow))] fill-[hsl(var(--stat-yellow))]" : "text-muted-foreground hover:text-[hsl(var(--stat-yellow))]/50")}
                                    onClick={() => setEvalCriteria(prev => prev.map(c => c.id === criterion.id ? { ...c, score: star } : c))} />
                                ))}
                                <span className="font-bold text-sm w-6 text-center">{criterion.score}</span>
                              </div>
                            </div>
                            <Progress value={criterion.score * 20} className="h-1.5" />
                          </div>
                        ))}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <span className="font-semibold">{t('الدرجة الإجمالية', 'Overall Score')}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold text-xl", scoreInfo.color)}>{evalOverallScore}</span>
                            <Badge variant="outline" className={cn(scoreInfo.color, "border-current")}>{scoreInfo.label}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bonus Percentage */}
                    {!hideBonusUI && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base"><Star className="w-5 h-5 text-[hsl(var(--stat-yellow))]" />{t('نسبة المكافأة', 'Bonus Percentage')}</CardTitle>
                        <CardDescription className="text-xs">{t('يمكنك كتابة النسبة يدوياً أو اختيارها من القائمة المنسدلة (من 0% حتى 100%).', 'Type the percentage manually or select from the dropdown (0% to 100%).')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--stat-green))]/5 border border-[hsl(var(--stat-green))]/20">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-[hsl(var(--stat-green))]" />
                            <span className="font-semibold text-sm">{t('نسبة المكافأة المقترحة', 'Suggested Bonus')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xl text-[hsl(var(--stat-green))]">{evalSuggestedBonus}%</span>
                            <Button variant="outline" size="sm" onClick={() => setEvalBonusPercentage(String(evalSuggestedBonus))} className="text-xs h-7">{t('استخدام', 'Use')}</Button>
                          </div>
                        </div>
                        <Popover open={bonusOpen} onOpenChange={setBonusOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                              <span>{evalBonusPercentage === '' ? t('اختر النسبة...', 'Select percentage...') : `${evalBonusPercentage}%`}</span>
                              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput placeholder={t('اكتب أو اختر...', 'Type or select...')} value={bonusSearch} onValueChange={setBonusSearch} />
                              <CommandList className="max-h-72">
                                <CommandEmpty>{t('لا توجد نتائج', 'No results')}</CommandEmpty>
                                <CommandGroup>
                                  {(() => {
                                    const n = Number(bonusSearch);
                                    const isValid = bonusSearch !== '' && !Number.isNaN(n) && n >= 0 && n <= 100;
                                    const isInList = BONUS_OPTIONS.includes(n);
                                    if (isValid && !isInList) {
                                      return (<CommandItem value={`custom-${n}`} onSelect={() => { setEvalBonusPercentage(String(n)); setBonusSearch(''); setBonusOpen(false); }}>{t(`استخدام ${n}%`, `Use ${n}%`)}</CommandItem>);
                                    }
                                    return null;
                                  })()}
                                  {BONUS_OPTIONS.map(p => (
                                    <CommandItem key={p} value={String(p)} onSelect={() => { setEvalBonusPercentage(String(p)); setBonusSearch(''); setBonusOpen(false); }}>
                                      <Check className={cn("me-2 h-4 w-4", evalBonusPercentage === String(p) ? "opacity-100" : "opacity-0")} />
                                      {p}%
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(var(--stat-yellow))]/5 border border-[hsl(var(--stat-yellow))]/30 text-sm">
                          <AlertTriangle className="w-4 h-4 text-[hsl(var(--stat-yellow))] shrink-0 mt-0.5" />
                          <span>{t('ملاحظة: يجب أن تكون نسبة المكافأة متماشية مع درجات التقييم وساعات العمل والجزاءات الموقعة على الموظف.', 'Note: The bonus percentage must align with evaluation scores, work hours, and penalties imposed on the employee.')}</span>
                        </div>
                      </CardContent>
                    </Card>
                    )}
                  </div>

                  {/* Per-employee Quarterly Bonus Summary */}
                  {newEvalSelectedEmp && (() => {
                    const empReviews = stationReviews
                      .filter(r => r.employeeId === newEvalSelectedEmp && r.bonusPercentage != null)
                      .sort((a, b) => `${a.year}-${a.quarter}`.localeCompare(`${b.year}-${b.quarter}`));
                    const qs = ['Q1','Q2','Q3','Q4'];
                    const yr = newEvalYear || String(new Date().getFullYear());
                    const perQuarter = qs.map(q => {
                      const rs = empReviews.filter(r => r.quarter === q && String(r.year) === String(yr));
                      const avg = rs.length ? rs.reduce((s, r) => s + (r.bonusPercentage || 0), 0) / rs.length : 0;
                      return { q, avg: Math.round(avg * 10) / 10, count: rs.length };
                    });
                    const overallAvg = empReviews.length
                      ? Math.round((empReviews.reduce((s, r) => s + (r.bonusPercentage || 0), 0) / empReviews.length) * 10) / 10
                      : 0;
                    return (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            {t('ملخص نسبة المكافأة للموظف', "Employee Bonus % Summary")}
                            <Badge variant="secondary" className="ms-2">{t('متوسط عام', 'Overall Avg')}: {overallAvg}%</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {perQuarter.map(p => (
                              <div key={p.q} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                                <div className="text-xs text-muted-foreground mb-1">{p.q} {yr}</div>
                                <div className="text-xl font-bold text-primary">{p.count ? `${p.avg}%` : '-'}</div>
                                <div className="text-[10px] text-muted-foreground mt-1">{p.count} {t('تقييم', 'review(s)')}</div>
                              </div>
                            ))}
                          </div>
                          {empReviews.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/40">
                                  <tr>
                                    <th className="text-start p-2">{t('الربع', 'Quarter')}</th>
                                    <th className="text-center p-2">{t('السنة', 'Year')}</th>
                                    <th className="text-center p-2">{t('الدرجة', 'Score')}</th>
                                    <th className="text-center p-2">{t('المكافأة', 'Bonus')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {empReviews.slice(-8).map(r => (
                                    <tr key={r.id} className="border-t border-border/40">
                                      <td className="p-2">{r.quarter}</td>
                                      <td className="p-2 text-center">{r.year}</td>
                                      <td className="p-2 text-center font-semibold">{(r.score || 0).toFixed(1)}</td>
                                      <td className="p-2 text-center"><span className="inline-block px-2 py-0.5 rounded-full bg-[hsl(var(--stat-green))]/15 text-[hsl(var(--stat-green))] font-bold">{r.bonusPercentage}%</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-muted-foreground py-2">{t('لا توجد بيانات مكافآت سابقة لهذا الموظف', 'No prior bonus data for this employee')}</div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Comments */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-[hsl(var(--stat-green))]" />{t('نقاط القوة', 'Strengths')}</Label>
                          <Textarea value={evalStrengths} onChange={e => setEvalStrengths(e.target.value)} className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-[hsl(var(--stat-coral))]" />{t('مجالات التحسين', 'Improvements')}</Label>
                          <Textarea value={evalImprovements} onChange={e => setEvalImprovements(e.target.value)} className="min-h-[80px]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><Target className="w-4 h-4 text-primary" />{t('أهداف الربع القادم', 'Next Quarter Goals')}</Label>
                          <Textarea value={evalGoals} onChange={e => setEvalGoals(e.target.value)} className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-primary" />{t('ملاحظات المدير', 'Manager Comments')}</Label>
                          <Textarea value={evalComments} onChange={e => setEvalComments(e.target.value)} className="min-h-[80px]" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={() => handleNewEvalSave('draft')} className="gap-1.5"><Save className="w-4 h-4" />{t('حفظ كمسودة', 'Save Draft')}</Button>
                        <Button onClick={() => handleNewEvalSave('submitted')} className="gap-1.5"><Send className="w-4 h-4" />{t('إرسال التقييم', 'Submit')}</Button>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Reviews List */}
              <TabsContent value="reviews">
                <Card>
                  <CardHeader className="space-y-3">
                    <CardTitle>{t('سجل التقييمات', 'Evaluation Records')}</CardTitle>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={t('بحث...', 'Search...')} value={evalSearch} onChange={e => setEvalSearch(e.target.value)} className="ps-9" />
                      </div>
                      <Select value={evalFilterDept} onValueChange={setEvalFilterDept}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('الأقسام', 'Departments')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('جميع الأقسام', 'All')}</SelectItem>
                          {stationDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={evalFilterQuarter} onValueChange={setEvalFilterQuarter}>
                        <SelectTrigger className="w-[120px]"><SelectValue placeholder={t('الربع', 'Quarter')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                          {quarters.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={evalFilterYear} onValueChange={setEvalFilterYear}>
                        <SelectTrigger className="w-[100px]"><SelectValue placeholder={t('السنة', 'Year')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                          {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={evalFilterStatus} onValueChange={setEvalFilterStatus}>
                        <SelectTrigger className="w-[130px]"><SelectValue placeholder={t('الحالة', 'Status')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                          <SelectItem value="draft">{t('مسودة', 'Draft')}</SelectItem>
                          <SelectItem value="submitted">{t('مقدّم', 'Submitted')}</SelectItem>
                          <SelectItem value="approved">{t('معتمد', 'Approved')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>{t('الموظف', 'Employee')}</TableHead>
                        <TableHead>{t('الوظيفة', 'Job Title')}</TableHead>
                        <TableHead>{t('القسم', 'Department')}</TableHead>
                        <TableHead>{t('تاريخ التعيين', 'Hire Date')}</TableHead>
                        <TableHead>{t('الربع', 'Quarter')}</TableHead>
                        <TableHead>{t('السنة', 'Year')}</TableHead>
                        <TableHead>{t('الدرجة', 'Score')}</TableHead>
                        <TableHead>{t('نسبة المكافأة', 'Bonus %')}</TableHead>
                        <TableHead>{t('الحالة', 'Status')}</TableHead>
                        <TableHead>{t('التاريخ', 'Date')}</TableHead>
                        <TableHead>{t('إجراءات', 'Actions')}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {filteredReviews.length === 0 ? (
                          <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">{t('لا توجد تقييمات', 'No evaluations')}</TableCell></TableRow>
                        ) : filteredReviews.map(r => {
                          const emp = stationEmployees.find(e => e.id === r.employeeId || e.employeeId === r.employeeId);
                          const jobTitle = emp ? (ar ? (emp.jobTitleAr || emp.jobTitle) : (emp.jobTitleEn || emp.jobTitle)) : '-';
                          const hireDate = emp?.hireDate ? formatDate(emp.hireDate) : '-';
                          return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.employeeName}</TableCell>
                            <TableCell className="text-xs">{jobTitle || '-'}</TableCell>
                            <TableCell className="text-xs">{r.department || emp?.department || '-'}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{hireDate}</TableCell>
                            <TableCell>{r.quarter}</TableCell>
                            <TableCell>{r.year}</TableCell>
                            <TableCell>
                              <Badge className={severityFromScore(r.score)}>{r.score}/5 - {getScoreLabel(r.score).label}</Badge>
                            </TableCell>
                            <TableCell>
                              {r.bonusPercentage != null ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-[hsl(var(--stat-green))]/15 text-[hsl(var(--stat-green))] font-bold text-xs">{r.bonusPercentage}%</span>
                              ) : <span className="text-muted-foreground text-xs">-</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                r.status === 'approved' ? 'bg-[hsl(var(--stat-green-bg))] text-[hsl(var(--stat-green))] border-[hsl(var(--stat-green))]' :
                                r.status === 'submitted' ? 'bg-[hsl(var(--stat-yellow-bg))] text-[hsl(var(--stat-yellow))] border-[hsl(var(--stat-yellow))]' :
                                'bg-muted text-muted-foreground'
                              }>
                                {r.status === 'approved' ? t('معتمد', 'Approved') : r.status === 'submitted' ? t('مقدّم', 'Submitted') : t('مسودة', 'Draft')}
                              </Badge>
                            </TableCell>
                            <TableCell>{r.reviewDate}</TableCell>
                            <TableCell>
                              {r.status !== 'approved' && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditEval(r)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Violations Tab */}
          {/* Uniforms Tab */}
          <TabsContent value="uniforms">
            <StationUniformsTab stationEmployees={stationEmployees as any} />
          </TabsContent>

          <TabsContent value="violations">
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>{t('مخالفات الموظفين', 'Employee Violations')}</CardTitle>
                  <Button onClick={() => setViolDialog(true)} size="sm" variant="destructive"><AlertTriangle className="h-4 w-4 me-1.5" />{t('إضافة مخالفة', 'Add Violation')}</Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t('بحث بالاسم أو الوصف...', 'Search by name or description...')} value={violSearch} onChange={e => setViolSearch(e.target.value)} className="ps-9" />
                  </div>
                  <Select value={violFilterDept} onValueChange={setViolFilterDept}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('جميع الأقسام', 'All Departments')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('جميع الأقسام', 'All Departments')}</SelectItem>
                      {stationDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={violFilterEmployee} onValueChange={setViolFilterEmployee}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('جميع الموظفين', 'All Employees')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('جميع الموظفين', 'All Employees')}</SelectItem>
                      {stationEmployees.map(emp => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId}>{ar ? emp.nameAr : emp.nameEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={violFilterType} onValueChange={setViolFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('جميع الأنواع', 'All Types')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('جميع الأنواع', 'All Types')}</SelectItem>
                      {violationTypes.map(vt => (
                        <SelectItem key={vt.value} value={vt.value}>{ar ? vt.ar : vt.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={violFilterStatus} onValueChange={setViolFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t('جميع الحالات', 'All Statuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('جميع الحالات', 'All Statuses')}</SelectItem>
                      <SelectItem value="pending">{t('بانتظار الموافقة', 'Pending')}</SelectItem>
                      <SelectItem value="active">{t('نشطة', 'Active')}</SelectItem>
                      <SelectItem value="resolved">{t('محلولة', 'Resolved')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('الموظف', 'Employee')}</TableHead>
                      <TableHead>{t('التاريخ', 'Date')}</TableHead>
                      <TableHead>{t('النوع', 'Type')}</TableHead>
                      <TableHead>{t('الوصف', 'Description')}</TableHead>
                      <TableHead>{t('العقوبة', 'Penalty')}</TableHead>
                      <TableHead>{t('الحالة', 'Status')}</TableHead>
                      <TableHead>{t('إجراءات', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViolations.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('لا توجد مخالفات', 'No violations found')}</TableCell></TableRow>
                    ) : filteredViolations.map(v => {
                      const emp = stationEmployees.find(e => e.id === v.employeeId);
                      const typeLabel = violationTypes.find(vt => vt.value === v.type);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{ar ? emp?.nameAr : emp?.nameEn || v.employeeId}</TableCell>
                          <TableCell>{v.date}</TableCell>
                          <TableCell>{ar ? typeLabel?.ar : typeLabel?.en || v.type}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{v.description}</TableCell>
                          <TableCell>{v.penalty || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              v.status === 'pending' ? 'bg-[hsl(var(--stat-yellow-bg))] text-[hsl(var(--stat-yellow))] border-[hsl(var(--stat-yellow))]' :
                              v.status === 'active' ? 'bg-[hsl(var(--stat-coral-bg))] text-[hsl(var(--stat-coral))] border-[hsl(var(--stat-coral))]' :
                              'bg-[hsl(var(--stat-green-bg))] text-[hsl(var(--stat-green))] border-[hsl(var(--stat-green))]'
                            }>
                              {v.status === 'pending' ? t('بانتظار الموافقة', 'Pending') : v.status === 'active' ? t('نشطة', 'Active') : t('محلولة', 'Resolved')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {v.status === 'pending' && canApproveViolations && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success" onClick={() => handleApproveViolation(v.id)} title={t('موافقة', 'Approve')}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleRejectViolation(v.id)} title={t('رفض', 'Reject')}>
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditViol(v)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteViolation(v.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Calendar Tab */}
          {activeTab === 'leaveCalendar' && (
            <TabsContent value="leaveCalendar">
              <StationLeaveCalendar stationEmployees={stationEmployees} language={language} />
            </TabsContent>
          )}

          {/* Vehicles Tab */}
          {activeTab === 'vehicles' && canSee('vehicles') && (() => {
            const allowedIds = (user?.stationIds && user.stationIds.length)
              ? user.stationIds
              : (user?.stationId ? [user.stationId] : []);
            return (
              <TabsContent value="vehicles">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5 text-primary" />{t('إدارة السيارات', 'Fleet Management')}</CardTitle>
                    <CardDescription>{t('سيارات محطتك فقط', 'Your station vehicles only')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VTabs defaultValue="by-station" className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                      <VTabsList className="w-full justify-start mb-4 flex-wrap h-auto gap-1 bg-muted/50 p-1">
                        <VTabsTrigger value="by-station" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm">{t('سيارات لكل محطة', 'Vehicles per Station')}</VTabsTrigger>
                        <VTabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm">{t('تنبيهات التراخيص', 'License Alerts')}</VTabsTrigger>
                        <VTabsTrigger value="registry" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm">{t('سجل السيارات', 'Vehicle Registry')}</VTabsTrigger>
                        <VTabsTrigger value="licenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm">{t('متابعة التراخيص', 'License Tracking')}</VTabsTrigger>
                        <VTabsTrigger value="maintenance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm">{t('الصيانة', 'Maintenance')}</VTabsTrigger>
                      </VTabsList>
                      <VTabsContent value="by-station"><FleetByStation allowedStationIds={allowedIds} /></VTabsContent>
                      <VTabsContent value="alerts"><LicenseAlerts allowedStationIds={allowedIds} /></VTabsContent>
                      <VTabsContent value="registry"><VehicleRegistry allowedStationIds={allowedIds} readOnly /></VTabsContent>
                      <VTabsContent value="licenses"><VehicleLicenseTracking allowedStationIds={allowedIds} /></VTabsContent>
                      <VTabsContent value="maintenance"><VehicleMaintenance allowedStationIds={allowedIds} /></VTabsContent>
                    </VTabs>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })()}

          {canSee('companyCard') && (
            <TabsContent value="companyCard">
              {(() => {
                // Derive allowed station UUIDs from the currently-scoped employees,
                // so the selected station (area manager) is respected and we don't
                // leak employees from sibling stations.
                const idsFromEmps = Array.from(new Set(
                  stationEmployees.map(e => (e as any).stationId).filter(Boolean)
                )) as string[];
                const fallbackIds = (user?.stationIds && user.stationIds.length)
                  ? user.stationIds
                  : (user?.stations || []).filter(Boolean) as string[];
                const allowedIds = idsFromEmps.length ? idsFromEmps : fallbackIds;
                return <EmployeeIdCards key={allowedIds.join(',')} allowedStationIds={allowedIds} />;
              })()}
            </TabsContent>
          )}

          {canSee('reports') && (
            <TabsContent value="reports">
              {(() => {
                const allowedIds = (user?.stationIds && user.stationIds.length)
                  ? user.stationIds
                  : (user?.stations || []).map(s => s).filter(Boolean) as string[];
                return <DailyAttendanceReport allowedStationIds={allowedIds} />;
              })()}
            </TabsContent>
          )}
          </div>
        </Tabs>
        </div>
      </main>

      {/* Full Evaluation Dialog - matches PerformanceReviewForm */}
      <Dialog open={evalDialog} onOpenChange={v => { if (!v) resetEvalForm(); setEvalDialog(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              {t('إضافة تقييم جديد', 'Add New Evaluation')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Employee & Period */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('الموظف', 'Employee')}</Label>
                <Select value={evalEmployeeId} onValueChange={setEvalEmployeeId}>
                  <SelectTrigger><SelectValue placeholder={t('اختر موظفاً', 'Select employee')} /></SelectTrigger>
                  <SelectContent>{stationEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{ar ? emp.nameAr : emp.nameEn} - {emp.department}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('السنة', 'Year')}</Label>
                <Select value={evalYear} onValueChange={setEvalYear}>
                  <SelectTrigger><SelectValue placeholder={t('اختر السنة', 'Select year')} /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('الربع', 'Quarter')}</Label>
                <Select value={evalQuarter} onValueChange={setEvalQuarter}>
                  <SelectTrigger><SelectValue placeholder={t('اختر الربع', 'Select quarter')} /></SelectTrigger>
                  <SelectContent>{quarters.map(q => <SelectItem key={q} value={q}>{getQuarterLabel(q)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Criteria */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-4 h-4 text-primary" />
                  {t('معايير التقييم', 'Evaluation Criteria')}
                </CardTitle>
                <CardDescription>{t('اضغط على النجوم لتحديد الدرجة (1-5)', 'Click stars to set score (1-5)')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evalCriteria.map((criterion) => (
                  <div key={criterion.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">{ar ? criterion.nameAr : criterion.name}</Label>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{criterion.weight}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={cn("w-5 h-5 cursor-pointer transition-colors hover:scale-110", star <= criterion.score ? "text-[hsl(var(--stat-yellow))] fill-[hsl(var(--stat-yellow))]" : "text-muted-foreground hover:text-[hsl(var(--stat-yellow))]/50")}
                            onClick={() => setEvalCriteria(prev => prev.map(c => c.id === criterion.id ? { ...c, score: star } : c))} />
                        ))}
                        <span className="font-bold text-sm w-6 text-center">{criterion.score}</span>
                      </div>
                    </div>
                    <Progress value={criterion.score * 20} className="h-1.5" />
                  </div>
                ))}

                {/* Overall Score */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-[hsl(var(--stat-yellow))] fill-[hsl(var(--stat-yellow))]" />
                    <span className="font-semibold">{t('الدرجة الإجمالية', 'Overall Score')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold text-xl", scoreInfo.color)}>{evalOverallScore}</span>
                    <Badge variant="outline" className={cn(scoreInfo.color, "border-current")}>{scoreInfo.label}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bonus Percentage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Star className="w-5 h-5 text-[hsl(var(--stat-yellow))]" />{t('نسبة المكافأة', 'Bonus Percentage')}</CardTitle>
                <CardDescription className="text-xs">{t('يمكنك كتابة النسبة يدوياً أو اختيارها من القائمة المنسدلة (من 0% حتى 100%).', 'Type the percentage manually or select from the dropdown (0% to 100%).')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--stat-green))]/5 border border-[hsl(var(--stat-green))]/20">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[hsl(var(--stat-green))]" />
                    <span className="font-semibold text-sm">{t('نسبة المكافأة المقترحة', 'Suggested Bonus')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl text-[hsl(var(--stat-green))]">{evalSuggestedBonus}%</span>
                    <Button variant="outline" size="sm" onClick={() => setEvalBonusPercentage(String(evalSuggestedBonus))} className="text-xs h-7">{t('استخدام', 'Use')}</Button>
                  </div>
                </div>
                <Popover open={bonusOpen} onOpenChange={setBonusOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full md:w-80 justify-between font-normal h-10">
                      <span>{evalBonusPercentage === '' ? t('اختر النسبة...', 'Select percentage...') : `${evalBonusPercentage}%`}</span>
                      <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full md:w-80 p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder={t('اكتب أو اختر...', 'Type or select...')} value={bonusSearch} onValueChange={setBonusSearch} />
                      <CommandList className="max-h-72">
                        <CommandEmpty>{t('لا توجد نتائج', 'No results')}</CommandEmpty>
                        <CommandGroup>
                          {(() => {
                            const n = Number(bonusSearch);
                            const isValid = bonusSearch !== '' && !Number.isNaN(n) && n >= 0 && n <= 100;
                            const isInList = BONUS_OPTIONS.includes(n);
                            if (isValid && !isInList) {
                              return (<CommandItem value={`custom-${n}`} onSelect={() => { setEvalBonusPercentage(String(n)); setBonusSearch(''); setBonusOpen(false); }}>{t(`استخدام ${n}%`, `Use ${n}%`)}</CommandItem>);
                            }
                            return null;
                          })()}
                          {BONUS_OPTIONS.map(p => (
                            <CommandItem key={p} value={String(p)} onSelect={() => { setEvalBonusPercentage(String(p)); setBonusSearch(''); setBonusOpen(false); }}>
                              <Check className={cn("me-2 h-4 w-4", evalBonusPercentage === String(p) ? "opacity-100" : "opacity-0")} />
                              {p}%
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(var(--stat-yellow))]/5 border border-[hsl(var(--stat-yellow))]/30 text-sm">
                  <AlertTriangle className="w-4 h-4 text-[hsl(var(--stat-yellow))] shrink-0 mt-0.5" />
                  <span>{t('ملاحظة: يجب أن تكون نسبة المكافأة متماشية مع درجات التقييم وساعات العمل والجزاءات الموقعة على الموظف.', 'Note: The bonus percentage must align with evaluation scores, work hours, and penalties imposed on the employee.')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[hsl(var(--stat-green))]" />
                  {t('نقاط القوة', 'Strengths')}
                </Label>
                <Textarea value={evalStrengths} onChange={e => setEvalStrengths(e.target.value)} className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-[hsl(var(--stat-coral))]" />
                  {t('مجالات التحسين', 'Improvements')}
                </Label>
                <Textarea value={evalImprovements} onChange={e => setEvalImprovements(e.target.value)} className="min-h-[80px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" />
                {t('أهداف الربع القادم', 'Next Quarter Goals')}
              </Label>
              <Textarea value={evalGoals} onChange={e => setEvalGoals(e.target.value)} className="min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" />
                {t('ملاحظات المدير', 'Manager Comments')}
              </Label>
              <Textarea value={evalComments} onChange={e => setEvalComments(e.target.value)} className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEvalDialog(false); resetEvalForm(); }}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="outline" onClick={() => handleAddEvaluation('draft')} className="gap-1.5"><Save className="w-4 h-4" />{t('حفظ كمسودة', 'Save Draft')}</Button>
            <Button onClick={() => handleAddEvaluation('submitted')} className="gap-1.5"><Send className="w-4 h-4" />{t('تقديم', 'Submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Violation Dialog - matches ViolationsTab */}
      <Dialog open={violDialog} onOpenChange={setViolDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('إضافة مخالفة جديدة', 'Add New Violation')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('الموظف', 'Employee')}</Label>
              <Popover open={violEmpPickerOpen} onOpenChange={setViolEmpPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={violEmpPickerOpen} className="w-full h-10 justify-between font-normal">
                    <span className="truncate">
                      {(() => {
                        const sel = stationEmployees.find(e => e.id === violForm.employeeId);
                        return sel ? (ar ? sel.nameAr : sel.nameEn) : t('اختر موظفاً', 'Select employee');
                      })()}
                    </span>
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('بحث بالاسم أو الكود...', 'Search by name or code...')} />
                    <CommandList>
                      <CommandEmpty>{t('لا توجد نتائج', 'No results')}</CommandEmpty>
                      <CommandGroup>
                        {stationEmployees.map(emp => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.nameAr} ${emp.nameEn} ${emp.employeeId || ''}`}
                            onSelect={() => { setViolForm(p => ({ ...p, employeeId: emp.id })); setViolEmpPickerOpen(false); }}
                          >
                            <Check className={cn('me-2 h-4 w-4', violForm.employeeId === emp.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate">{ar ? emp.nameAr : emp.nameEn}</span>
                            {emp.employeeId && <span className="ms-auto text-xs text-muted-foreground font-mono">{emp.employeeId}</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t('التاريخ', 'Date')}</Label>
              <Input type="date" value={violForm.date} onChange={e => setViolForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('نوع المخالفة', 'Violation Type')}</Label>
              <Select value={violForm.type} onValueChange={v => setViolForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{violationTypes.map(vt => <SelectItem key={vt.value} value={vt.value}>{ar ? vt.ar : vt.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('الوصف', 'Description')}</Label>
              <Textarea value={violForm.description} onChange={e => setViolForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('العقوبة', 'Penalty')}</Label>
              <Input value={violForm.penalty} onChange={e => setViolForm(p => ({ ...p, penalty: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViolDialog(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="destructive" onClick={handleAddViolation}>{t('حفظ', 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Evaluation Dialog */}
      <Dialog open={editEvalDialog} onOpenChange={setEditEvalDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {t('تعديل التقييم', 'Edit Evaluation')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-4 h-4 text-primary" />
                  {t('معايير التقييم', 'Evaluation Criteria')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editEvalCriteria.map((criterion) => (
                  <div key={criterion.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">{ar ? criterion.nameAr : criterion.name}</Label>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{criterion.weight}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={cn("w-5 h-5 cursor-pointer transition-colors hover:scale-110", star <= criterion.score ? "text-[hsl(var(--stat-yellow))] fill-[hsl(var(--stat-yellow))]" : "text-muted-foreground hover:text-[hsl(var(--stat-yellow))]/50")}
                            onClick={() => setEditEvalCriteria(prev => prev.map(c => c.id === criterion.id ? { ...c, score: star } : c))} />
                        ))}
                        <span className="font-bold text-sm w-6 text-center">{criterion.score}</span>
                      </div>
                    </div>
                    <Progress value={criterion.score * 20} className="h-1.5" />
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="font-semibold">{t('الدرجة الإجمالية', 'Overall Score')}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold text-xl", getScoreLabel(editEvalOverallScore).color)}>{editEvalOverallScore}</span>
                    <Badge variant="outline" className={cn(getScoreLabel(editEvalOverallScore).color, "border-current")}>{getScoreLabel(editEvalOverallScore).label}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('نقاط القوة', 'Strengths')}</Label>
                <Textarea value={editEvalStrengths} onChange={e => setEditEvalStrengths(e.target.value)} className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label>{t('مجالات التحسين', 'Improvements')}</Label>
                <Textarea value={editEvalImprovements} onChange={e => setEditEvalImprovements(e.target.value)} className="min-h-[80px]" />
              </div>
            </div>
            {/* Bonus Percentage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Star className="w-5 h-5 text-[hsl(var(--stat-yellow))]" />{t('نسبة المكافأة', 'Bonus Percentage')}</CardTitle>
                <CardDescription className="text-xs">{t('يمكنك كتابة النسبة يدوياً أو اختيارها من القائمة المنسدلة (من 0% حتى 100%).', 'Type the percentage manually or select from the dropdown (0% to 100%).')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--stat-green))]/5 border border-[hsl(var(--stat-green))]/20">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[hsl(var(--stat-green))]" />
                    <span className="font-semibold text-sm">{t('نسبة المكافأة المقترحة', 'Suggested Bonus')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl text-[hsl(var(--stat-green))]">{editEvalSuggestedBonus}%</span>
                    <Button variant="outline" size="sm" onClick={() => setEditEvalBonusPercentage(String(editEvalSuggestedBonus))} className="text-xs h-7">{t('استخدام', 'Use')}</Button>
                  </div>
                </div>
                <Popover open={editBonusOpen} onOpenChange={setEditBonusOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full md:w-80 justify-between font-normal h-10">
                      <span>{editEvalBonusPercentage === '' ? t('اختر النسبة...', 'Select percentage...') : `${editEvalBonusPercentage}%`}</span>
                      <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full md:w-80 p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder={t('اكتب أو اختر...', 'Type or select...')} value={editBonusSearch} onValueChange={setEditBonusSearch} />
                      <CommandList className="max-h-72">
                        <CommandEmpty>{t('لا توجد نتائج', 'No results')}</CommandEmpty>
                        <CommandGroup>
                          {(() => {
                            const n = Number(editBonusSearch);
                            const isValid = editBonusSearch !== '' && !Number.isNaN(n) && n >= 0 && n <= 100;
                            const isInList = BONUS_OPTIONS.includes(n);
                            if (isValid && !isInList) {
                              return (<CommandItem value={`custom-${n}`} onSelect={() => { setEditEvalBonusPercentage(String(n)); setEditBonusSearch(''); setEditBonusOpen(false); }}>{t(`استخدام ${n}%`, `Use ${n}%`)}</CommandItem>);
                            }
                            return null;
                          })()}
                          {BONUS_OPTIONS.map(p => (
                            <CommandItem key={p} value={String(p)} onSelect={() => { setEditEvalBonusPercentage(String(p)); setEditBonusSearch(''); setEditBonusOpen(false); }}>
                              <Check className={cn("me-2 h-4 w-4", editEvalBonusPercentage === String(p) ? "opacity-100" : "opacity-0")} />
                              {p}%
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(var(--stat-yellow))]/5 border border-[hsl(var(--stat-yellow))]/30 text-sm">
                  <AlertTriangle className="w-4 h-4 text-[hsl(var(--stat-yellow))] shrink-0 mt-0.5" />
                  <span>{t('ملاحظة: يجب أن تكون نسبة المكافأة متماشية مع درجات التقييم وساعات العمل والجزاءات الموقعة على الموظف.', 'Note: The bonus percentage must align with evaluation scores, work hours, and penalties imposed on the employee.')}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>{t('أهداف الربع القادم', 'Next Quarter Goals')}</Label>
              <Textarea value={editEvalGoals} onChange={e => setEditEvalGoals(e.target.value)} className="min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <Label>{t('ملاحظات المدير', 'Manager Comments')}</Label>
              <Textarea value={editEvalComments} onChange={e => setEditEvalComments(e.target.value)} className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditEvalDialog(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="outline" onClick={() => handleSaveEditEval('draft')} className="gap-1.5"><Save className="w-4 h-4" />{t('حفظ كمسودة', 'Save Draft')}</Button>
            <Button onClick={() => handleSaveEditEval('submitted')} className="gap-1.5"><Send className="w-4 h-4" />{t('تقديم', 'Submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Violation Dialog */}
      <Dialog open={editViolDialog} onOpenChange={setEditViolDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('تعديل المخالفة', 'Edit Violation')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('التاريخ', 'Date')}</Label>
              <Input type="date" value={editViolForm.date} onChange={e => setEditViolForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('نوع المخالفة', 'Violation Type')}</Label>
              <Select value={editViolForm.type} onValueChange={v => setEditViolForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{violationTypes.map(vt => <SelectItem key={vt.value} value={vt.value}>{ar ? vt.ar : vt.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('الوصف', 'Description')}</Label>
              <Textarea value={editViolForm.description} onChange={e => setEditViolForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('العقوبة', 'Penalty')}</Label>
              <Input value={editViolForm.penalty} onChange={e => setEditViolForm(p => ({ ...p, penalty: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditViolDialog(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={handleSaveEditViol}>{t('حفظ', 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StationManagerPortal;