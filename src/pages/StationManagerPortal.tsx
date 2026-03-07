import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { usePerformanceData, defaultCriteria, calculateScore, CriteriaItem } from '@/contexts/PerformanceDataContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { stationLocations } from '@/data/stationLocations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Users, Star, AlertTriangle, LogOut, Globe, MapPin, Target, TrendingUp, Lightbulb, MessageSquare, Save, Send, Plus, Trash2, Search, Filter, Pencil, Clock, UserCheck, UserX, FileText, ShieldCheck, Building2, BarChart3, CheckCircle, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
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
  { id: 'quality', name: 'Work Quality', nameAr: 'جودة العمل', score: 3, weight: 25 },
  { id: 'productivity', name: 'Productivity', nameAr: 'الإنتاجية', score: 3, weight: 20 },
  { id: 'teamwork', name: 'Teamwork', nameAr: 'العمل الجماعي', score: 3, weight: 20 },
  { id: 'communication', name: 'Communication', nameAr: 'التواصل', score: 3, weight: 15 },
  { id: 'initiative', name: 'Initiative', nameAr: 'المبادرة', score: 3, weight: 10 },
  { id: 'attendance', name: 'Attendance & Punctuality', nameAr: 'الحضور والالتزام', score: 3, weight: 10 },
];

const years = Array.from({ length: 11 }, (_, i) => String(2025 + i));
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

const StationManagerPortal = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, isRTL } = useLanguage();
  const { employees } = useEmployeeData();
  const { reviews, addReview, updateReview } = usePerformanceData();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const ar = language === 'ar';

  // Violations from Supabase
  const [violations, setViolations] = useState<Violation[]>([]);

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

  useEffect(() => { fetchViolations(); }, [fetchViolations]);

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

  // Violation dialog state
  const [violDialog, setViolDialog] = useState(false);
  const [violForm, setViolForm] = useState({ employeeId: '', type: 'absence', description: '', penalty: '', date: new Date().toISOString().split('T')[0] });

  // Edit evaluation dialog state
  const [editEvalDialog, setEditEvalDialog] = useState(false);
  const [editEvalId, setEditEvalId] = useState('');
  const [editEvalCriteria, setEditEvalCriteria] = useState<CriteriaScore[]>(initialCriteria.map(c => ({ ...c })));
  const [editEvalStrengths, setEditEvalStrengths] = useState('');
  const [editEvalImprovements, setEditEvalImprovements] = useState('');
  const [editEvalGoals, setEditEvalGoals] = useState('');
  const [editEvalComments, setEditEvalComments] = useState('');

  // Edit violation dialog state
  const [editViolDialog, setEditViolDialog] = useState(false);
  const [editViolId, setEditViolId] = useState('');
  const [editViolForm, setEditViolForm] = useState({ type: 'absence', description: '', penalty: '', date: '' });

  const stationName = useMemo(() => {
    const loc = stationLocations.find(s => s.value === user?.station);
    return language === 'ar' ? loc?.labelAr : loc?.labelEn;
  }, [user?.station, language]);

  const stationEmployees = useMemo(() => {
    return employees.filter(e => e.stationLocation === user?.station);
  }, [employees, user?.station]);

  // Filter reviews for this station's employees (use UUID)
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
  };

  const handleAddEvaluation = (status: 'draft' | 'submitted') => {
    if (!evalEmployeeId || !evalYear || !evalQuarter) {
      toast({ title: t('أكمل البيانات المطلوبة', 'Complete required fields'), variant: 'destructive' });
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
    setEditEvalDialog(true);
  };

  const editEvalOverallScore = useMemo(() => {
    const totalWeight = editEvalCriteria.reduce((s, c) => s + c.weight, 0);
    const weightedSum = editEvalCriteria.reduce((s, c) => s + (c.score * c.weight), 0);
    return parseFloat((weightedSum / totalWeight).toFixed(2));
  }, [editEvalCriteria]);

  const handleSaveEditEval = (status: 'draft' | 'submitted') => {
    updateReview(editEvalId, {
      score: editEvalOverallScore,
      status,
      strengths: editEvalStrengths,
      improvements: editEvalImprovements,
      goals: editEvalGoals,
      managerComments: editEvalComments,
      criteria: editEvalCriteria.map(c => ({ name: c.nameAr, nameEn: c.name, score: c.score, weight: c.weight })),
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
  const NEW_EVAL_PAGE_SIZE = 5;

  const newEvalFilteredEmps = useMemo(() => {
    let list = stationEmployees.filter(e => e.status === 'active');
    if (newEvalDeptFilter !== 'all') list = list.filter(e => e.department === newEvalDeptFilter);
    return list;
  }, [stationEmployees, newEvalDeptFilter]);

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
    } else {
      setEvalCriteria(initialCriteria.map(c => ({ ...c })));
      setEvalStrengths('');
      setEvalImprovements('');
      setEvalGoals('');
      setEvalComments('');
    }
  }, [newEvalExisting]);

  useEffect(() => { setNewEvalPage(0); }, [newEvalDeptFilter]);

  const handleNewEvalSave = async (status: 'draft' | 'submitted') => {
    if (!newEvalSelectedEmp || !newEvalYear || !newEvalQuarter) {
      toast({ title: t('أكمل البيانات المطلوبة', 'Complete required fields'), variant: 'destructive' });
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
  const filteredViolations = useMemo(() => {
    let list = stationViolations;
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
  }, [stationViolations, violFilterEmployee, violFilterType, violFilterStatus, violSearch, stationEmployees]);

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
    };
    return language === 'ar' ? labels[q]?.ar : labels[q]?.en;
  };

  return (
    <div className={cn("min-h-screen bg-background", isRTL ? "font-arabic" : "font-sans")} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-foreground text-sm md:text-base truncate">{t('بوابة مدير المحطة', 'Station Manager Portal')}</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{stationName} - {language === 'ar' ? user?.nameAr : user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
              <Globe className="h-4 w-4" />
            </Button>
            <NotificationDropdown variant="portal" />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 md:gap-1.5 text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('خروج', 'Logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* Tabs */}
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="employees" className="gap-1 md:gap-1.5 text-xs md:text-sm"><Users className="h-3.5 w-3.5 md:h-4 md:w-4" /><span className="hidden sm:inline">{t('الموظفين', 'Employees')}</span></TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-1 md:gap-1.5 text-xs md:text-sm"><Star className="h-3.5 w-3.5 md:h-4 md:w-4" /><span className="hidden sm:inline">{t('التقييمات', 'Evaluations')}</span></TabsTrigger>
            <TabsTrigger value="violations" className="gap-1 md:gap-1.5 text-xs md:text-sm"><AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4" /><span className="hidden sm:inline">{t('المخالفات', 'Violations')}</span></TabsTrigger>
          </TabsList>

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
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('الرقم', 'ID')}</TableHead>
                    <TableHead>{t('الاسم', 'Name')}</TableHead>
                    <TableHead>{t('الوظيفة', 'Job Title')}</TableHead>
                    <TableHead>{t('القسم', 'Department')}</TableHead>
                    <TableHead>{t('الحالة', 'Status')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredStationEmployees.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('لا يوجد موظفين', 'No employees found')}</TableCell></TableRow>
                    ) : filteredStationEmployees.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                        <TableCell className="font-medium">{language === 'ar' ? emp.nameAr : emp.nameEn}</TableCell>
                        <TableCell>{emp.jobTitle}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>
                          <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                            {emp.status === 'active' ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evaluations Tab - with inner tabs */}
          <TabsContent value="evaluations">
            <Tabs value={evalInnerTab} onValueChange={setEvalInnerTab} className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="dashboard" className="text-xs md:text-sm gap-1"><BarChart3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('لوحة التحكم', 'Dashboard')}</span></TabsTrigger>
                <TabsTrigger value="newReview" className="text-xs md:text-sm gap-1"><Star className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('تقييم جديد', 'New Review')}</span></TabsTrigger>
                <TabsTrigger value="reviews" className="text-xs md:text-sm gap-1"><FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('السجل', 'Records')}</span></TabsTrigger>
              </TabsList>

              {/* Dashboard */}
              <TabsContent value="dashboard">
                <div className="space-y-4">
                  {/* Year/Quarter filter */}
                  <Card>
                    <CardContent className="p-4">
                      <div className={cn("flex items-end gap-4 flex-wrap", isRTL && "flex-row-reverse")}>
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
                      <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
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
                            <div className={cn("flex items-center justify-between text-sm", isRTL && "flex-row-reverse")}>
                              <span className="font-medium">{d.dept}</span>
                              <div className={cn("flex items-center gap-2 text-xs", isRTL && "flex-row-reverse")}>
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
                <div className="space-y-4">
                  {/* Employee selection with green/gray indicators */}
                  <Card>
                    <CardHeader>
                      <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
                        <Users className="w-5 h-5 text-primary" />
                        {t('اختيار الموظف', 'Select Employee')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50", isSelected && "bg-primary/10", isRTL && "flex-row-reverse text-right")}>
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
                              <div className={cn("flex items-center justify-between px-4 py-2 border-t bg-muted/30", isRTL && "flex-row-reverse")}>
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
                          <div className={cn("p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm", isRTL && "text-right")}>
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

                  {/* Criteria */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
                        <Target className="w-4 h-4 text-primary" />
                        {t('معايير التقييم', 'Evaluation Criteria')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {evalCriteria.map((criterion) => (
                        <div key={criterion.id} className="space-y-1.5">
                          <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                              <Label className="text-sm font-medium">{ar ? criterion.nameAr : criterion.name}</Label>
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{criterion.weight}%</span>
                            </div>
                            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
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
                      <div className={cn("flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20", isRTL && "flex-row-reverse")}>
                        <span className="font-semibold">{t('الدرجة الإجمالية', 'Overall Score')}</span>
                        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                          <span className={cn("font-bold text-xl", scoreInfo.color)}>{evalOverallScore}</span>
                          <Badge variant="outline" className={cn(scoreInfo.color, "border-current")}>{scoreInfo.label}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comments */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}><TrendingUp className="w-4 h-4 text-[hsl(var(--stat-green))]" />{t('نقاط القوة', 'Strengths')}</Label>
                          <Textarea value={evalStrengths} onChange={e => setEvalStrengths(e.target.value)} className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                          <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}><Lightbulb className="w-4 h-4 text-[hsl(var(--stat-coral))]" />{t('مجالات التحسين', 'Improvements')}</Label>
                          <Textarea value={evalImprovements} onChange={e => setEvalImprovements(e.target.value)} className="min-h-[80px]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}><Target className="w-4 h-4 text-primary" />{t('أهداف الربع القادم', 'Next Quarter Goals')}</Label>
                        <Textarea value={evalGoals} onChange={e => setEvalGoals(e.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}><MessageSquare className="w-4 h-4 text-primary" />{t('ملاحظات المدير', 'Manager Comments')}</Label>
                        <Textarea value={evalComments} onChange={e => setEvalComments(e.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className={cn("flex gap-2 pt-2", isRTL && "flex-row-reverse")}>
                        <Button variant="outline" onClick={() => handleNewEvalSave('draft')} className="gap-1.5"><Save className="w-4 h-4" />{t('حفظ كمسودة', 'Save Draft')}</Button>
                        <Button onClick={() => handleNewEvalSave('submitted')} className="gap-1.5"><Send className="w-4 h-4" />{t('إرسال التقييم', 'Submit')}</Button>
                      </div>
                    </CardContent>
                  </Card>
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
                        <TableHead>{t('الربع', 'Quarter')}</TableHead>
                        <TableHead>{t('السنة', 'Year')}</TableHead>
                        <TableHead>{t('الدرجة', 'Score')}</TableHead>
                        <TableHead>{t('الحالة', 'Status')}</TableHead>
                        <TableHead>{t('التاريخ', 'Date')}</TableHead>
                        <TableHead>{t('إجراءات', 'Actions')}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {filteredReviews.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('لا توجد تقييمات', 'No evaluations')}</TableCell></TableRow>
                        ) : filteredReviews.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.employeeName}</TableCell>
                            <TableCell>{r.quarter}</TableCell>
                            <TableCell>{r.year}</TableCell>
                            <TableCell>
                              <Badge className={severityFromScore(r.score)}>{r.score}/5 - {getScoreLabel(r.score).label}</Badge>
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
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Violations Tab */}
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
                      const emp = stationEmployees.find(e => e.employeeId === v.employeeId);
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
        </Tabs>
      </main>

      {/* Full Evaluation Dialog - matches PerformanceReviewForm */}
      <Dialog open={evalDialog} onOpenChange={v => { if (!v) resetEvalForm(); setEvalDialog(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
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
                <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
                  <Target className="w-4 h-4 text-primary" />
                  {t('معايير التقييم', 'Evaluation Criteria')}
                </CardTitle>
                <CardDescription>{t('اضغط على النجوم لتحديد الدرجة (1-5)', 'Click stars to set score (1-5)')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evalCriteria.map((criterion) => (
                  <div key={criterion.id} className="space-y-1.5">
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Label className="text-sm font-medium">{ar ? criterion.nameAr : criterion.name}</Label>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{criterion.weight}%</span>
                      </div>
                      <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
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
                <div className={cn("flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Star className="w-5 h-5 text-[hsl(var(--stat-yellow))] fill-[hsl(var(--stat-yellow))]" />
                    <span className="font-semibold">{t('الدرجة الإجمالية', 'Overall Score')}</span>
                  </div>
                  <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <span className={cn("font-bold text-xl", scoreInfo.color)}>{evalOverallScore}</span>
                    <Badge variant="outline" className={cn(scoreInfo.color, "border-current")}>{scoreInfo.label}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                  <TrendingUp className="w-4 h-4 text-[hsl(var(--stat-green))]" />
                  {t('نقاط القوة', 'Strengths')}
                </Label>
                <Textarea value={evalStrengths} onChange={e => setEvalStrengths(e.target.value)} className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                  <Lightbulb className="w-4 h-4 text-[hsl(var(--stat-coral))]" />
                  {t('مجالات التحسين', 'Improvements')}
                </Label>
                <Textarea value={evalImprovements} onChange={e => setEvalImprovements(e.target.value)} className="min-h-[80px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                <Target className="w-4 h-4 text-primary" />
                {t('أهداف الربع القادم', 'Next Quarter Goals')}
              </Label>
              <Textarea value={evalGoals} onChange={e => setEvalGoals(e.target.value)} className="min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
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
              <Select value={violForm.employeeId} onValueChange={v => setViolForm(p => ({ ...p, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('اختر موظفاً', 'Select employee')} /></SelectTrigger>
                <SelectContent>{stationEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{ar ? emp.nameAr : emp.nameEn}</SelectItem>)}</SelectContent>
              </Select>
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
            <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Pencil className="w-5 h-5 text-primary" />
              {t('تعديل التقييم', 'Edit Evaluation')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
                  <Target className="w-4 h-4 text-primary" />
                  {t('معايير التقييم', 'Evaluation Criteria')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editEvalCriteria.map((criterion) => (
                  <div key={criterion.id} className="space-y-1.5">
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Label className="text-sm font-medium">{ar ? criterion.nameAr : criterion.name}</Label>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{criterion.weight}%</span>
                      </div>
                      <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
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
                <div className={cn("flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20", isRTL && "flex-row-reverse")}>
                  <span className="font-semibold">{t('الدرجة الإجمالية', 'Overall Score')}</span>
                  <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
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