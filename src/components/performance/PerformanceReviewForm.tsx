import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePerformanceData, defaultCriteria, calculateScore, CriteriaItem } from '@/contexts/PerformanceDataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Star, Save, Send, Users, Target, Lightbulb, TrendingUp, MessageSquare, CheckCircle, Circle, ChevronLeft, ChevronRight, Loader2, Clock, AlertTriangle, Search, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const violationTypeLabels: Record<string, { ar: string; en: string }> = {
  absence: { ar: 'غياب بدون إذن', en: 'Unauthorized Absence' },
  late: { ar: 'تأخر متكرر', en: 'Repeated Tardiness' },
  conduct: { ar: 'سلوك غير لائق', en: 'Misconduct' },
  safety: { ar: 'مخالفة سلامة', en: 'Safety Violation' },
  other: { ar: 'أخرى', en: 'Other' },
};
import { toast } from 'sonner';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { stationLocations } from '@/data/stationLocations';
import { supabase } from '@/integrations/supabase/client';
import { computeWorkMinutes } from '@/lib/attendanceClassification';

const fmtHoursHM = (h: number): string => {
  const totalMinutes = Math.max(0, Math.round((Number(h) || 0) * 60));
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
};

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
const JOB_DEGREES = ['AA', 'A', 'B', 'C'];
const normalizePeriodValue = (value: unknown) => String(value || '').trim().toUpperCase();
const normalizeYearValue = (value: unknown) => String(value || '').trim();

const normalizeSearchText = (s: string) =>
  (s || '')
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

export const PerformanceReviewForm = () => {
  const { t, isRTL, language } = useLanguage();
  const { addReview, updateReview, reviews } = usePerformanceData();
  const { employees } = useEmployeeData();
  const ar = language === 'ar';

  // Filters
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [jobDegreeFilter, setJobDegreeFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState(() => {
    try {
      const v = sessionStorage.getItem('perf_preselect_year');
      if (v) { sessionStorage.removeItem('perf_preselect_year'); return v; }
    } catch {}
    return '';
  });
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    try {
      const v = sessionStorage.getItem('perf_preselect_quarter');
      if (v) { sessionStorage.removeItem('perf_preselect_quarter'); return v; }
    } catch {}
    const month = new Date().getMonth();
    if (month >= 0 && month <= 2) return 'Q1';
    if (month >= 3 && month <= 5) return 'Q2';
    if (month >= 6 && month <= 8) return 'Q3';
    return 'Q4';
  });
  const [selectedEmployee, setSelectedEmployee] = useState(() => {
    try {
      const v = sessionStorage.getItem('perf_preselect_employee');
      if (v) { sessionStorage.removeItem('perf_preselect_employee'); return v; }
    } catch {}
    return '';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.employeeId) setSelectedEmployee(detail.employeeId);
      if (detail.year) setSelectedYear(String(detail.year));
      if (detail.quarter) setSelectedQuarter(String(detail.quarter).toUpperCase());
    };
    window.addEventListener('performance:goto-new-review', handler);
    return () => window.removeEventListener('performance:goto-new-review', handler);
  }, []);

  const [employeePage, setEmployeePage] = useState(0);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const PAGE_SIZE = 5;

  // Form
  const [criteria, setCriteria] = useState<CriteriaScore[]>(initialCriteria);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [goals, setGoals] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState<string>('');
  const [saving, setSaving] = useState<null | 'draft' | 'submitted' | 'approved'>(null);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusSearch, setBonusSearch] = useState('');
  const BONUS_OPTIONS = Array.from({ length: 41 }, (_, i) => i * 2.5);

  // Quarter context: monthly work hours + violations (penalties)
  interface QuarterViolation {
    id: string; date: string; type: string; description: string; penalty: string; status: string;
  }
  const [quarterMonthly, setQuarterMonthly] = useState<{ month: string; hours: number; days: number; violations: QuarterViolation[]; }[]>([]);
  const [quarterLoading, setQuarterLoading] = useState(false);

  const selectedEmpForMonths = useMemo(
    () => employees.find(e => e.id === selectedEmployee),
    [employees, selectedEmployee]
  );

  const quarterMonths = useMemo(() => {
    if (!selectedQuarter) return [] as string[];
    if (selectedQuarter === 'M3') {
      const hire = selectedEmpForMonths?.hireDate;
      if (!hire) return [];
      const d = new Date(hire);
      if (isNaN(d.getTime())) return [];
      // 3 months starting from hire month
      return [0, 1, 2].map(i => {
        const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
        return String(m.getMonth() + 1).padStart(2, '0');
      });
    }
    const map: Record<string, string[]> = { Q1: ['01','02','03'], Q2: ['04','05','06'], Q3: ['07','08','09'], Q4: ['10','11','12'] };
    return map[selectedQuarter] || [];
  }, [selectedQuarter, selectedEmpForMonths]);

  
  // For M3, compute exact 3-month window from hire date. For quarters, use selectedYear.
  const periodRange = useMemo(() => {
    if (!selectedQuarter || quarterMonths.length === 0) return null;
    if (selectedQuarter === 'M3') {
      const hire = selectedEmpForMonths?.hireDate;
      if (!hire) return null;
      const d = new Date(hire);
      if (isNaN(d.getTime())) return null;
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 3, 0); // last day of 3rd month
      const months = [0, 1, 2].map(i => {
        const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
        return { key: String(m.getMonth() + 1).padStart(2, '0'), year: m.getFullYear() };
      });
      const toIso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
      return { start: toIso(start), end: toIso(end), months };
    }
    if (!selectedYear) return null;
    const startDate = `${selectedYear}-${quarterMonths[0]}-01`;
    const lastMonth = quarterMonths[quarterMonths.length - 1];
    const lastDay = new Date(parseInt(selectedYear), parseInt(lastMonth), 0).getDate();
    const endDate = `${selectedYear}-${lastMonth}-${String(lastDay).padStart(2,'0')}`;
    return {
      start: startDate,
      end: endDate,
      months: quarterMonths.map(m => ({ key: m, year: parseInt(selectedYear) })),
    };
  }, [selectedQuarter, selectedYear, quarterMonths, selectedEmpForMonths]);

  const [quarterError, setQuarterError] = useState<string | null>(null);
  const [quarterReloadKey, setQuarterReloadKey] = useState(0);

  useEffect(() => {
    if (!selectedEmployee || !periodRange) {
      setQuarterMonthly([]);
      setQuarterError(null);
      return;
    }
    let cancelled = false;
    const fetchWithRetry = async (attempt = 0): Promise<void> => {
      setQuarterLoading(true);
      setQuarterError(null);
      try {
        const { start: startDate, end: endDate, months } = periodRange;

        const [violRes, attRes] = await Promise.all([
          supabase.from('violations')
            .select('id, date, type, description, penalty, status')
            .eq('employee_id', selectedEmployee).gte('date', startDate).lte('date', endDate)
            .order('date', { ascending: false }),
          supabase.from('attendance_records')
            .select('date, work_hours, work_minutes, check_in, check_out')
            .eq('employee_id', selectedEmployee).gte('date', startDate).lte('date', endDate),
        ]);
        if (cancelled) return;

        if (violRes.error) {
          const msg = (violRes.error.message || '').toLowerCase();
          if (msg.includes('permission') || msg.includes('rls') || msg.includes('policy')) {
            supabase.rpc('log_rls_access_denied' as any, {
              p_module: 'performance_review:violations',
              p_resource_id: selectedEmployee,
            }).then(() => {}, () => {});
            console.warn('[RLS] violations access denied for employee', selectedEmployee, violRes.error);
          } else {
            throw violRes.error;
          }
        }
        if (attRes.error) throw attRes.error;

        const minutesByKey: Record<string, number> = {};
        const daysByKey: Record<string, Set<string>> = {};
        (attRes.data || []).forEach((r: any) => {
          const k = (r.date as string).slice(0, 7);
          const mins = computeWorkMinutes(r).minutes;
          minutesByKey[k] = (minutesByKey[k] || 0) + mins;
          if (!daysByKey[k]) daysByKey[k] = new Set();
          daysByKey[k].add(r.date as string);
        });
        const violByKey: Record<string, QuarterViolation[]> = {};
        (violRes.data || []).forEach((v: any) => {
          const k = (v.date as string).slice(0, 7);
          if (!violByKey[k]) violByKey[k] = [];
          violByKey[k].push({
            id: v.id, date: v.date, type: v.type || 'other',
            description: v.description || '', penalty: v.penalty || '', status: v.status || '',
          });
        });
        setQuarterMonthly(months.map(({ key, year }) => {
          const k = `${year}-${key}`;
          return {
            month: key,
            hours: (minutesByKey[k] || 0) / 60,
            days: daysByKey[k]?.size || 0,
            violations: violByKey[k] || [],
          };
        }));
      } catch (err: any) {
        if (cancelled) return;
        if (attempt < 2) {
          const backoff = 500 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, backoff));
          if (!cancelled) return fetchWithRetry(attempt + 1);
        }
        console.error('[performance] quarter data fetch failed after retries', err);
        setQuarterError(err?.message || 'fetch_failed');
        setQuarterMonthly([]);
      } finally {
        if (!cancelled) setQuarterLoading(false);
      }
    };
    fetchWithRetry();
    return () => { cancelled = true; };
  }, [selectedEmployee, periodRange, quarterReloadKey]);


  const monthLabel = (m: string) => {
    const ar_m = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const en_m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const idx = parseInt(m) - 1;
    return ar ? ar_m[idx] : en_m[idx];
  };

  // Find existing review for selected employee+quarter+year
  const existingReview = useMemo(() => {
    if (!selectedEmployee || !selectedQuarter || !selectedYear) return null;
    const quarter = normalizePeriodValue(selectedQuarter);
    const year = normalizeYearValue(selectedYear);
    return reviews.find(r => r.employeeId === selectedEmployee && normalizePeriodValue(r.quarter) === quarter && normalizeYearValue(r.year) === year) || null;
  }, [reviews, selectedEmployee, selectedQuarter, selectedYear]);

  // Load existing review data into form when found
  useEffect(() => {
    if (existingReview) {
      if (existingReview.criteria && existingReview.criteria.length > 0) {
        setCriteria(existingReview.criteria.map((c, i) => ({
          id: initialCriteria[i]?.id || `c${i}`,
          name: c.nameEn,
          nameAr: c.name,
          score: c.score,
          weight: c.weight,
        })));
      } else {
        setCriteria(initialCriteria.map(c => ({ ...c })));
      }
      setStrengths(existingReview.strengths || '');
      setImprovements(existingReview.improvements || '');
      setGoals(existingReview.goals || '');
      setManagerComments(existingReview.managerComments || '');
      setBonusPercentage(existingReview.bonusPercentage != null ? String(existingReview.bonusPercentage) : '');
    } else {
      // Reset form for new evaluation (also when switching to another unevaluated employee)
      setCriteria(initialCriteria.map(c => ({ ...c })));
      setStrengths('');
      setImprovements('');
      setGoals('');
      setManagerComments('');
      setBonusPercentage('');
    }
  }, [existingReview, selectedEmployee, selectedQuarter, selectedYear]);

  const activeEmployees = employees.filter(e => e.status === 'active');

  // Get unique departments from employees
  const departments = useMemo(() => {
    const depts = [...new Set(activeEmployees.map(e => e.department).filter(Boolean))];
    return depts.sort();
  }, [activeEmployees]);

  // Filter employees by station + department + name search
  const filteredEmployees = useMemo(() => {
    let list = activeEmployees;
    if (stationFilter !== 'all') list = list.filter(e => e.stationLocation === stationFilter);
    if (departmentFilter !== 'all') list = list.filter(e => e.department === departmentFilter);
    if (jobDegreeFilter !== 'all') list = list.filter(e => (e.jobDegree || '') === jobDegreeFilter);
    if (employeeSearch.trim()) {
      const query = normalizeSearchText(employeeSearch);
      list = list.filter(e => {
        const nameAr = normalizeSearchText(e.nameAr || '');
        const nameEn = normalizeSearchText(e.nameEn || '');
        const code = normalizeSearchText(e.employeeId || '');
        return nameAr.includes(query) || nameEn.includes(query) || code.includes(query);
      });
    }
    return list;
  }, [activeEmployees, stationFilter, departmentFilter, jobDegreeFilter, employeeSearch]);

  // Reset page when filters change
  useEffect(() => { setEmployeePage(0); }, [stationFilter, departmentFilter, jobDegreeFilter, employeeSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const paginatedEmployees = filteredEmployees.slice(employeePage * PAGE_SIZE, (employeePage + 1) * PAGE_SIZE);

  // Set of employee IDs that have been evaluated for selected quarter+year
  const evaluatedEmployeeIds = useMemo(() => {
    if (!selectedQuarter || !selectedYear) return new Set<string>();
    return new Set(
      reviews
        .filter(r => normalizePeriodValue(r.quarter) === normalizePeriodValue(selectedQuarter) && normalizeYearValue(r.year) === normalizeYearValue(selectedYear))
        .map(r => r.employeeId)
    );
  }, [reviews, selectedQuarter, selectedYear]);

  const handleScoreChange = (id: string, newScore: number[]) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, score: newScore[0] } : c));
  };

  const calculateOverallScore = () => {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const weightedSum = criteria.reduce((sum, c) => sum + (c.score * c.weight), 0);
    return (weightedSum / totalWeight).toFixed(2);
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return { label: t('performance.score.excellent'), color: 'text-stat-green' };
    if (score >= 3.5) return { label: t('performance.score.veryGood'), color: 'text-stat-blue' };
    if (score >= 2.5) return { label: t('performance.score.good'), color: 'text-stat-yellow' };
    if (score >= 1.5) return { label: t('performance.score.acceptable'), color: 'text-stat-coral' };
    return { label: t('performance.score.poor'), color: 'text-destructive' };
  };

  const overallScore = parseFloat(calculateOverallScore());
  const scoreInfo = getScoreLabel(overallScore);

  // Suggested bonus percentage: linear from 0% at score=1 to 50% at score=5
  // score 3 -> 25%, score 5 -> 50%, below 3 -> < 25%
  const suggestedBonusPercentage = useMemo(() => {
    const clamped = Math.min(5, Math.max(1, overallScore));
    return Math.round((clamped - 1) * 12.5 * 10) / 10; // 1 decimal place
  }, [overallScore]);

  const buildReview = (status: 'draft' | 'submitted' | 'approved') => {
    const emp = employees.find(e => e.id === selectedEmployee);
    if (!emp) return null;
    return {
      employeeId: emp.id,
      employeeName: ar ? emp.nameAr : emp.nameEn,
      department: emp.department,
      station: emp.stationLocation || '',
      quarter: selectedQuarter,
      year: selectedYear,
      score: overallScore,
      status,
      reviewer: '',
      reviewDate: new Date().toISOString().split('T')[0],
      strengths,
      improvements,
      goals,
      managerComments,
      criteria: criteria.map(c => ({ name: c.nameAr, nameEn: c.name, score: c.score, weight: c.weight })),
      bonusPercentage: bonusPercentage === '' ? undefined : Number(bonusPercentage),
    };
  };

  const resetForm = () => {
    setSelectedEmployee('');
    setCriteria(initialCriteria.map(c => ({ ...c })));
    setStrengths('');
    setImprovements('');
    setGoals('');
    setManagerComments('');
    setBonusPercentage('');
    setBonusSearch('');
  };

  const saveOrUpdate = async (status: 'draft' | 'submitted' | 'approved') => {
    if (!selectedEmployee || !selectedYear || !selectedQuarter) {
      toast.error(t('performance.form.fillRequired'));
      return;
    }
    // Validate scores 1..5
    if (criteria.some(c => c.score < 1 || c.score > 5)) {
      toast.error(ar ? 'الدرجات يجب أن تكون بين 1 و 5' : 'Scores must be between 1 and 5');
      return;
    }
    const review = buildReview(status);
    if (!review) return;

    setSaving(status);
    try {
      if (existingReview) {
        await updateReview(existingReview.id, { ...review });
      } else {
        await addReview(review);
      }
      const msgs: Record<string, string> = {
        draft: t('performance.form.draftSaved'),
        submitted: t('performance.form.submitted'),
        approved: ar ? 'تم اعتماد التقييم بنجاح' : 'Review approved successfully',
      };
      toast.success(msgs[status]);
    } catch (err: any) {
      const detail = err?.message || err?.error_description || '';
      toast.error((ar ? 'حدث خطأ أثناء الحفظ' : 'Error saving review') + (detail ? `: ${detail}` : ''));
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveDraft = () => saveOrUpdate('draft');
  const handleSubmit = () => saveOrUpdate('submitted');
  const handleApprove = () => saveOrUpdate('approved');

  const getQuarterLabel = (q: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      'Q1': { ar: 'Q1 (يناير - مارس)', en: 'Q1 (Jan - Mar)' },
      'Q2': { ar: 'Q2 (أبريل - يونيو)', en: 'Q2 (Apr - Jun)' },
      'Q3': { ar: 'Q3 (يوليو - سبتمبر)', en: 'Q3 (Jul - Sep)' },
      'Q4': { ar: 'Q4 (أكتوبر - ديسمبر)', en: 'Q4 (Oct - Dec)' },
      'M3': { ar: 'M3 — تقييم بعد 3 أشهر من التعيين', en: 'M3 — Evaluation after 3 months from hire date' },
    };
    if (!labels[q]) return q;
    return ar ? labels[q].ar : labels[q].en;
  };

  const selectedEmp = employees.find(e => e.id === selectedEmployee);

  return (
    <div className="space-y-6">
      {/* Filters: Station, Department, Year, Quarter */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Users className="w-5 h-5 text-primary" />
            {t('performance.form.selectEmployee')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Station */}
            <div className="space-y-2">
              <Label>{ar ? 'المحطة' : 'Station'}</Label>
              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger><SelectValue placeholder={ar ? 'اختر المحطة...' : 'Select station...'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stationLocations.map(s => (
                    <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Department */}
            <div className="space-y-2">
              <Label>{ar ? 'القسم' : 'Department'}</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger><SelectValue placeholder={ar ? 'اختر القسم...' : 'Select department...'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Year */}
            <div className="space-y-2">
              <Label>{ar ? 'السنة' : 'Year'}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue placeholder={ar ? 'اختر السنة...' : 'Select year...'} /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Job Degree */}
            <div className="space-y-2">
              <Label>{ar ? 'الدرجة الوظيفية' : 'Job Degree'}</Label>
              <Select value={jobDegreeFilter} onValueChange={setJobDegreeFilter}>
                <SelectTrigger><SelectValue placeholder={ar ? 'اختر الدرجة...' : 'Select degree...'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'كل الدرجات' : 'All Degrees'}</SelectItem>
                  {JOB_DEGREES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Quarter */}
            <div className="space-y-2">
              <Label>{t('performance.form.quarter')}</Label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger><SelectValue placeholder={t('performance.form.selectQuarterPlaceholder')} /></SelectTrigger>
                <SelectContent>{quarters.map(q => <SelectItem key={q} value={q}>{getQuarterLabel(q)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Employee List with evaluation status */}
          <div className="border rounded-lg max-h-[340px] overflow-y-auto">
            <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-sm font-medium">{ar ? 'الموظفون' : 'Employees'} ({filteredEmployees.length})</span>
              {selectedQuarter && selectedYear && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-stat-green inline-block" /> {ar ? 'تم التقييم' : 'Evaluated'}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 inline-block" /> {ar ? 'لم يتم التقييم' : 'Not evaluated'}</span>
                </div>
              )}
            </div>
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  placeholder={ar ? 'ابحث بالاسم أو الرقم الوظيفي...' : 'Search by name or employee code...'}
                  className="ps-8 text-sm"
                />
              </div>
            </div>
            {filteredEmployees.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                {ar ? 'لا يوجد موظفون بالفلتر المحدد' : 'No employees match the selected filters'}
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {paginatedEmployees.map(emp => {
                    const isEvaluated = evaluatedEmployeeIds.has(emp.id);
                    const isSelected = selectedEmployee === emp.id;
                    const stationLabel = stationLocations.find(s => s.value === emp.stationLocation);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedEmployee(emp.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                          isSelected && "bg-primary/10 border-primary",
                          isRTL && "flex-row-reverse text-right"
                        )}
                      >
                        {selectedQuarter && selectedYear ? (
                          <span className={cn(
                            "w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1",
                            isEvaluated
                              ? "bg-stat-green ring-stat-green/30"
                              : "bg-muted-foreground/30 ring-muted-foreground/10"
                          )} />
                        ) : (
                          <Circle className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                        )}
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {(ar ? emp.nameAr : emp.nameEn).split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <p className="font-medium truncate">{ar ? emp.nameAr : emp.nameEn}</p>
                            {emp.jobDegree && (
                              <Badge variant="outline" className={cn("font-mono text-[10px] font-bold px-1.5 py-0 shrink-0", getJobDegreeBadgeClass(emp.jobDegree))}>
                                {emp.jobDegree}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {emp.employeeId} • {emp.department} {stationLabel ? `• ${ar ? stationLabel.labelAr : stationLabel.labelEn}` : ''}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className={cn("flex items-center justify-between px-4 py-2 border-t bg-muted/30", isRTL && "flex-row-reverse")}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={employeePage === 0}
                      onClick={() => setEmployeePage(p => p - 1)}
                      className="gap-1"
                    >
                      <ChevronRight className={cn("w-4 h-4", !isRTL && "hidden")} />
                      <ChevronLeft className={cn("w-4 h-4", isRTL && "hidden")} />
                      {ar ? 'السابق' : 'Previous'}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {ar ? `صفحة ${employeePage + 1} من ${totalPages}` : `Page ${employeePage + 1} of ${totalPages}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={employeePage >= totalPages - 1}
                      onClick={() => setEmployeePage(p => p + 1)}
                      className="gap-1"
                    >
                      {ar ? 'التالي' : 'Next'}
                      <ChevronLeft className={cn("w-4 h-4", !isRTL && "hidden")} />
                      <ChevronRight className={cn("w-4 h-4", isRTL && "hidden")} />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedEmp && (
            <div className={cn("p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm", isRTL && "text-right")}>
              <div className="font-medium">{ar ? 'الموظف المحدد:' : 'Selected:'}{' '}
                <span className="text-primary font-semibold">{ar ? selectedEmp.nameAr : selectedEmp.nameEn}</span>
              </div>
              <div className="mt-1">
                <span className="text-muted-foreground">{ar ? 'الرقم:' : 'ID:'}</span>{' '}
                <span className="font-medium">{selectedEmp.employeeId || '-'}</span>
                {' · '}
                <span className="text-muted-foreground">{ar ? 'القسم:' : 'Dept:'}</span>{' '}
                <span className="font-medium">{selectedEmp.department || '-'}</span>
              </div>
              <div className="mt-1">
                <span className="text-muted-foreground">{ar ? 'تاريخ التعيين:' : 'Hire Date:'}</span>{' '}
                <span className="font-medium">{selectedEmp.hireDate ? formatDate(selectedEmp.hireDate) : '-'}</span>
              </div>
              {existingReview && (
                <div className="mt-1">
                  <Badge variant="outline" className="bg-stat-yellow/10 text-stat-yellow border-stat-yellow">
                    {ar ? `تقييم موجود (${existingReview.status === 'draft' ? 'مسودة' : existingReview.status === 'submitted' ? 'مرسل' : 'معتمد'})` : `Existing (${existingReview.status})`}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quarter context: hours per month + deductions */}
      {selectedEmployee && selectedYear && selectedQuarter && (
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Clock className="w-5 h-5 text-primary" />
              {selectedQuarter === 'M3'
                ? (ar ? `تقييم 3 شهور من التعيين${selectedEmpForMonths?.hireDate ? ` (${formatDate(selectedEmpForMonths.hireDate)})` : ''}` : `3-Month Evolution${selectedEmpForMonths?.hireDate ? ` (from ${formatDate(selectedEmpForMonths.hireDate)})` : ''}`)
                : (ar ? `بيانات الربع ${selectedQuarter} - ${selectedYear}` : `Quarter ${selectedQuarter} - ${selectedYear} Data`)}
            </CardTitle>
            <CardDescription>
              {selectedQuarter === 'M3'
                ? (ar ? 'ساعات العمل والجزاءات خلال أول 3 أشهر من تاريخ التعيين' : 'Work hours and penalties during the first 3 months from hire date')
                : (ar ? 'ساعات العمل والجزاءات التي حصل عليها الموظف في كل شهر من أشهر الربع' : 'Actual work hours and penalties received by the employee per month of the quarter')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quarterLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {ar ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : quarterError ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {ar ? 'فشل تحميل بيانات الحضور' : 'Failed to load attendance data'}
                </div>
                <Button variant="outline" size="sm" onClick={() => setQuarterReloadKey(k => k + 1)}>
                  {ar ? 'إعادة المحاولة' : 'Retry'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quarterMonthly.map(m => (
                  <div key={m.month} className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <span className="font-semibold">{monthLabel(m.month)}</span>
                      <Badge variant="outline" className="bg-primary/5 border-primary/30 text-primary">{m.month}/{selectedYear}</Badge>
                    </div>
                    <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                      <Users className="w-4 h-4 text-stat-green" />
                      <span className="text-muted-foreground">{ar ? 'أيام العمل:' : 'Work days:'}</span>
                      <span className="font-bold text-stat-green ms-auto">{m.days}</span>
                    </div>
                    <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                      <Clock className="w-4 h-4 text-stat-blue" />
                      <span className="text-muted-foreground">{ar ? 'ساعات العمل:' : 'Work hours:'}</span>
                      <span className="font-bold text-stat-blue ms-auto">{fmtHoursHM(m.hours)} {ar ? 'س' : 'h'}</span>
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
                  <span><span className="text-muted-foreground me-1">{ar ? 'أيام:' : 'Days:'}</span><span className="font-bold text-stat-green">{quarterMonthly.reduce((s, m) => s + m.days, 0)}</span></span>
                  <span><span className="text-muted-foreground me-1">{ar ? 'ساعات:' : 'Hours:'}</span><span className="font-bold text-stat-blue">{fmtHoursHM(quarterMonthly.reduce((s, m) => s + m.hours, 0))}</span></span>
                  <span><span className="text-muted-foreground me-1">{ar ? 'جزاءات:' : 'Penalties:'}</span><span className="font-bold text-destructive">{quarterMonthly.reduce((s, m) => s + m.violations.length, 0)}</span></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Evaluation Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Target className="w-5 h-5 text-primary" />
              {t('performance.form.criteria')}
            </CardTitle>
            <CardDescription>{t('performance.form.criteriaDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {criteria.map((criterion) => (
              <div key={criterion.id} className="space-y-2">
                <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Label className="text-base font-medium">{ar ? criterion.nameAr : criterion.name}</Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{criterion.weight}%</span>
                  </div>
                  <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={cn("w-6 h-6 cursor-pointer transition-colors hover:scale-110", star <= criterion.score ? "text-stat-yellow fill-stat-yellow" : "text-muted-foreground hover:text-stat-yellow/50")}
                        onClick={() => handleScoreChange(criterion.id, [star])} />
                    ))}
                    <span className="font-bold text-lg w-8 text-center">{criterion.score}</span>
                  </div>
                </div>
                <Progress value={criterion.score * 20} className="h-2" />
              </div>
            ))}

            <div className={cn("flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20", isRTL && "flex-row-reverse")}>
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Star className="w-6 h-6 text-stat-yellow fill-stat-yellow" />
                <span className="font-semibold text-lg">{t('performance.form.overallScore')}</span>
              </div>
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <span className={cn("font-bold text-2xl", scoreInfo.color)}>{overallScore}</span>
                <Badge variant="outline" className={cn(scoreInfo.color, "border-current")}>{scoreInfo.label}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right column: Bonus Percentage + Improvements */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Star className="w-5 h-5 text-stat-yellow" />
                {ar ? 'نسبة المكافأة' : 'Bonus Percentage'}
              </CardTitle>
              <CardDescription>
                {ar
                  ? 'يمكنك كتابة النسبة يدوياً أو اختيارها من القائمة المنسدلة (من 0% حتى 100%).'
                  : 'You can type the percentage manually or select from the dropdown (0% to 100%).'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Suggested bonus percentage */}
              <div className={cn(
                "flex items-center justify-between p-4 rounded-lg bg-stat-green/5 border border-stat-green/20",
                isRTL && "flex-row-reverse"
              )}>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Lightbulb className="w-5 h-5 text-stat-green" />
                  <span className="font-semibold text-base">{ar ? 'نسبة المكافأة المقترحة' : 'Suggested Bonus Percentage'}</span>
                </div>
                <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                  <span className="font-bold text-2xl text-stat-green">{suggestedBonusPercentage}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBonusPercentage(String(suggestedBonusPercentage))}
                    className="text-xs"
                  >
                    {ar ? 'استخدام' : 'Use'}
                  </Button>
                </div>
              </div>

              <Popover open={bonusOpen} onOpenChange={setBonusOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={bonusOpen}
                    className={cn("w-full md:w-80 justify-between font-normal h-10", isRTL && "flex-row-reverse")}
                  >
                    <span>
                      {bonusPercentage === '' ? (ar ? 'اختر النسبة...' : 'Select percentage...') : `${bonusPercentage}%`}
                    </span>
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={cn("w-full md:w-80 p-0", isRTL && "text-right")} align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={ar ? 'اكتب أو اختر...' : 'Type or select...'}
                      value={bonusSearch}
                      onValueChange={setBonusSearch}
                    />
                    <CommandList className="max-h-72">
                      <CommandEmpty>{ar ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
                      <CommandGroup>
                        {(() => {
                          const n = Number(bonusSearch);
                          const isValidSearch = bonusSearch !== '' && !Number.isNaN(n) && n >= 0 && n <= 100;
                          const isInList = BONUS_OPTIONS.includes(n);
                          if (isValidSearch && !isInList) {
                            return (
                              <CommandItem
                                value={`custom-${bonusSearch}`}
                                onSelect={() => {
                                  setBonusPercentage(String(n));
                                  setBonusSearch('');
                                  setBonusOpen(false);
                                }}
                              >
                                {ar ? `استخدام ${n}%` : `Use ${n}%`}
                              </CommandItem>
                            );
                          }
                          return null;
                        })()}
                        {BONUS_OPTIONS.map(p => (
                          <CommandItem
                            key={p}
                            value={String(p)}
                            onSelect={() => {
                              setBonusPercentage(String(p));
                              setBonusSearch('');
                              setBonusOpen(false);
                            }}
                          >
                            <Check className={cn("me-2 h-4 w-4", bonusPercentage === String(p) ? "opacity-100" : "opacity-0")} />
                            {p.toFixed(2)}%
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className={cn(
                "flex items-start gap-2 p-4 rounded-lg bg-stat-yellow/5 border border-stat-yellow/30 text-base leading-relaxed",
                isRTL && "flex-row-reverse text-right"
              )}>
                <AlertTriangle className="w-5 h-5 text-stat-yellow shrink-0 mt-0.5" />
                <span className="text-foreground">
                  {ar
                    ? 'ملاحظة: يجب أن تكون نسبة المكافأة متماشية مع درجات التقييم وساعات العمل والجزاءات الموقعة على الموظف.'
                    : 'Note: The bonus percentage must be consistent with the evaluation scores, work hours, and penalties imposed on the employee.'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Improvements - below Bonus Percentage */}
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2 text-stat-coral", isRTL && "flex-row-reverse")}><Lightbulb className="w-5 h-5" />{t('performance.form.improvements')}</CardTitle>
            </CardHeader>
            <CardContent><Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder={t('performance.form.improvementsPlaceholder')} className="min-h-[120px]" /></CardContent>
          </Card>
        </div>
      </div>


      {/* Comments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-stat-green", isRTL && "flex-row-reverse")}><TrendingUp className="w-5 h-5" />{t('performance.form.strengths')}</CardTitle>
          </CardHeader>
          <CardContent><Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder={t('performance.form.strengthsPlaceholder')} className="min-h-[120px]" /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><Target className="w-5 h-5 text-primary" />{t('performance.form.nextQuarterGoals')}</CardTitle></CardHeader>
          <CardContent><Textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder={t('performance.form.goalsPlaceholder')} className="min-h-[100px]" /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><MessageSquare className="w-5 h-5 text-primary" />{t('performance.form.managerComments')}</CardTitle></CardHeader>
        <CardContent><Textarea value={managerComments} onChange={(e) => setManagerComments(e.target.value)} placeholder={t('performance.form.managerCommentsPlaceholder')} className="min-h-[100px]" /></CardContent>
      </Card>

      <div className={cn("flex gap-3", isRTL ? "flex-row-reverse justify-start" : "justify-end")}>
        <Button variant="outline" onClick={handleSaveDraft} disabled={!!saving} className="gap-2" aria-label={t('performance.form.saveDraft')}>
          {saving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('performance.form.saveDraft')}
        </Button>
        <Button onClick={handleSubmit} disabled={!!saving} className="gap-2" aria-label={t('performance.form.submit')}>
          {saving === 'submitted' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t('performance.form.submit')}
        </Button>
        <Button onClick={handleApprove} disabled={!!saving} className="gap-2 bg-stat-green hover:bg-stat-green/90" aria-label={ar ? 'اعتماد' : 'Approve'}>
          {saving === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {ar ? 'اعتماد' : 'Approve'}
        </Button>
      </div>
    </div>
  );
};
