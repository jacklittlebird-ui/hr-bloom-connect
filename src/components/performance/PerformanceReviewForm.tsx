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
import { Star, Save, Send, Users, Target, Lightbulb, TrendingUp, MessageSquare, CheckCircle, Circle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { stationLocations } from '@/data/stationLocations';

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

export const PerformanceReviewForm = () => {
  const { t, isRTL, language } = useLanguage();
  const { addReview, updateReview, reviews } = usePerformanceData();
  const { employees } = useEmployeeData();
  const ar = language === 'ar';

  // Filters
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeePage, setEmployeePage] = useState(0);
  const PAGE_SIZE = 5;

  // Form
  const [criteria, setCriteria] = useState<CriteriaScore[]>(initialCriteria);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [goals, setGoals] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [saving, setSaving] = useState<null | 'draft' | 'submitted' | 'approved'>(null);

  // Find existing review for selected employee+quarter+year
  const existingReview = useMemo(() => {
    if (!selectedEmployee || !selectedQuarter || !selectedYear) return null;
    return reviews.find(r => r.employeeId === selectedEmployee && r.quarter === selectedQuarter && r.year === selectedYear) || null;
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
      }
      setStrengths(existingReview.strengths || '');
      setImprovements(existingReview.improvements || '');
      setGoals(existingReview.goals || '');
      setManagerComments(existingReview.managerComments || '');
    } else {
      // Reset form for new evaluation
      setCriteria(initialCriteria.map(c => ({ ...c })));
      setStrengths('');
      setImprovements('');
      setGoals('');
      setManagerComments('');
    }
  }, [existingReview]);

  const activeEmployees = employees.filter(e => e.status === 'active');

  // Get unique departments from employees
  const departments = useMemo(() => {
    const depts = [...new Set(activeEmployees.map(e => e.department).filter(Boolean))];
    return depts.sort();
  }, [activeEmployees]);

  // Filter employees by station + department
  const filteredEmployees = useMemo(() => {
    let list = activeEmployees;
    if (stationFilter !== 'all') list = list.filter(e => e.stationLocation === stationFilter);
    if (departmentFilter !== 'all') list = list.filter(e => e.department === departmentFilter);
    return list;
  }, [activeEmployees, stationFilter, departmentFilter]);

  // Reset page when filters change
  useEffect(() => { setEmployeePage(0); }, [stationFilter, departmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const paginatedEmployees = filteredEmployees.slice(employeePage * PAGE_SIZE, (employeePage + 1) * PAGE_SIZE);

  // Set of employee IDs that have been evaluated for selected quarter+year
  const evaluatedEmployeeIds = useMemo(() => {
    if (!selectedQuarter || !selectedYear) return new Set<string>();
    return new Set(
      reviews
        .filter(r => r.quarter === selectedQuarter && r.year === selectedYear)
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
    };
  };

  const resetForm = () => {
    setSelectedEmployee('');
    setCriteria(initialCriteria.map(c => ({ ...c })));
    setStrengths('');
    setImprovements('');
    setGoals('');
    setManagerComments('');
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
    } catch (err) {
      toast.error(ar ? 'حدث خطأ أثناء الحفظ' : 'Error saving review');
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
    };
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-sm font-medium">{ar ? 'الموظفون' : 'Employees'} ({filteredEmployees.length})</span>
              {selectedQuarter && selectedYear && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-stat-green inline-block" /> {ar ? 'تم التقييم' : 'Evaluated'}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 inline-block" /> {ar ? 'لم يتم التقييم' : 'Not evaluated'}</span>
                </div>
              )}
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
                          <p className="font-medium truncate">{ar ? emp.nameAr : emp.nameEn}</p>
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
              <span className="font-medium">{ar ? 'الموظف المحدد:' : 'Selected:'}</span>{' '}
              <span className="text-primary font-semibold">{ar ? selectedEmp.nameAr : selectedEmp.nameEn}</span>
              {' - '}{selectedEmp.department}
              {existingReview && (
                <Badge variant="outline" className="ml-2 bg-stat-yellow/10 text-stat-yellow border-stat-yellow">
                  {ar ? `تقييم موجود (${existingReview.status === 'draft' ? 'مسودة' : existingReview.status === 'submitted' ? 'مرسل' : 'معتمد'})` : `Existing (${existingReview.status})`}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Criteria */}
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

      {/* Comments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-stat-green", isRTL && "flex-row-reverse")}><TrendingUp className="w-5 h-5" />{t('performance.form.strengths')}</CardTitle>
          </CardHeader>
          <CardContent><Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder={t('performance.form.strengthsPlaceholder')} className="min-h-[120px]" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-stat-coral", isRTL && "flex-row-reverse")}><Lightbulb className="w-5 h-5" />{t('performance.form.improvements')}</CardTitle>
          </CardHeader>
          <CardContent><Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder={t('performance.form.improvementsPlaceholder')} className="min-h-[120px]" /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><Target className="w-5 h-5 text-primary" />{t('performance.form.nextQuarterGoals')}</CardTitle></CardHeader>
        <CardContent><Textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder={t('performance.form.goalsPlaceholder')} className="min-h-[100px]" /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><MessageSquare className="w-5 h-5 text-primary" />{t('performance.form.managerComments')}</CardTitle></CardHeader>
        <CardContent><Textarea value={managerComments} onChange={(e) => setManagerComments(e.target.value)} placeholder={t('performance.form.managerCommentsPlaceholder')} className="min-h-[100px]" /></CardContent>
      </Card>

      <div className={cn("flex gap-3", isRTL ? "flex-row-reverse justify-start" : "justify-end")}>
        <Button variant="outline" onClick={handleSaveDraft} className="gap-2"><Save className="w-4 h-4" />{t('performance.form.saveDraft')}</Button>
        <Button onClick={handleSubmit} className="gap-2"><Send className="w-4 h-4" />{t('performance.form.submit')}</Button>
        <Button onClick={handleApprove} className="gap-2 bg-stat-green hover:bg-stat-green/90"><CheckCircle className="w-4 h-4" />{ar ? 'اعتماد' : 'Approve'}</Button>
      </div>
    </div>
  );
};
