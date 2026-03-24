import { useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePerformanceData, CriteriaItem, PerformanceReview, defaultCriteria, calculateScore } from '@/contexts/PerformanceDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Search, Eye, Edit, Star, FileText, Printer, Download, FileSpreadsheet, Save, Send, Target, TrendingUp, Lightbulb, MessageSquare, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';
import { initialDepartments } from '@/data/departments';
import { toast } from 'sonner';

const years = Array.from({ length: 11 }, (_, i) => String(2025 + i));

export const PerformanceList = () => {
  const { t, isRTL, language } = useLanguage();
  const { reviews, updateReview, deleteReview } = usePerformanceData();
  const { exportToCSV, exportToPDF, handlePrint, reportRef } = useReportExport();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [quarterFilter, setQuarterFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewReview, setViewReview] = useState<PerformanceReview | null>(null);
  const [editReview, setEditReview] = useState<PerformanceReview | null>(null);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  const [editCriteria, setEditCriteria] = useState<CriteriaItem[]>([]);
  const [editStrengths, setEditStrengths] = useState('');
  const [editImprovements, setEditImprovements] = useState('');
  const [editGoals, setEditGoals] = useState('');
  const [editManagerComments, setEditManagerComments] = useState('');

  const openEditDialog = (review: PerformanceReview) => {
    setEditReview(review);
    setEditCriteria(review.criteria ? [...review.criteria] : defaultCriteria.map(c => ({ ...c })));
    setEditStrengths(review.strengths || '');
    setEditImprovements(review.improvements || '');
    setEditGoals(review.goals || '');
    setEditManagerComments(review.managerComments || '');
  };

  const handleSaveEdit = () => {
    if (!editReview) return;
    const newScore = calculateScore(editCriteria);
    updateReview(editReview.id, { criteria: editCriteria, score: newScore, strengths: editStrengths, improvements: editImprovements, goals: editGoals, managerComments: editManagerComments });
    setEditReview(null);
    toast.success(language === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully');
  };

  const handleSubmitEdit = () => {
    if (!editReview) return;
    const newScore = calculateScore(editCriteria);
    updateReview(editReview.id, { criteria: editCriteria, score: newScore, strengths: editStrengths, improvements: editImprovements, goals: editGoals, managerComments: editManagerComments, status: 'submitted' });
    setEditReview(null);
    toast.success(language === 'ar' ? 'تم إرسال التقييم بنجاح' : 'Review submitted successfully');
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.employeeName.includes(searchQuery) || 
                         review.department.includes(searchQuery) ||
                         review.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    const matchesQuarter = quarterFilter === 'all' || review.quarter === quarterFilter;
    const matchesYear = yearFilter === 'all' || review.year === yearFilter;
    const matchesStation = stationFilter === 'all' || review.station === stationFilter;
    const matchesDepartment = departmentFilter === 'all' || review.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesQuarter && matchesYear && matchesStation && matchesDepartment;
  });

  const { paginatedItems: paginatedReviews, currentPage: revPage, totalPages: revTotalPages, totalItems: revTotalItems, startIndex: revStart, endIndex: revEnd, setCurrentPage: setRevPage } = usePagination(filteredReviews);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-stat-green/10 text-stat-green hover:bg-stat-green/20">{t('performance.status.approved')}</Badge>;
      case 'submitted': return <Badge className="bg-stat-blue/10 text-stat-blue hover:bg-stat-blue/20">{t('performance.status.submitted')}</Badge>;
      case 'draft': return <Badge variant="secondary">{t('performance.status.draft')}</Badge>;
      default: return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-stat-green';
    if (score >= 3.5) return 'text-stat-blue';
    if (score >= 2.5) return 'text-stat-yellow';
    return 'text-stat-coral';
  };

  const getStationLabel = (stationValue: string) => {
    const station = stationLocations.find(s => s.value === stationValue);
    return station ? (language === 'ar' ? station.labelAr : station.labelEn) : stationValue;
  };

  const handleExportCSV = () => {
    exportToCSV({
      title: language === 'ar' ? 'تقييمات الأداء' : 'Performance Reviews',
      columns: [
        { header: t('performance.list.employee'), key: 'employeeName' },
        { header: t('performance.list.department'), key: 'department' },
        { header: language === 'ar' ? 'المحطة' : 'Station', key: 'station' },
        { header: t('performance.list.quarter'), key: 'quarter' },
        { header: language === 'ar' ? 'السنة' : 'Year', key: 'year' },
        { header: t('performance.list.score'), key: 'score' },
        { header: t('performance.list.status'), key: 'statusLabel' },
        { header: t('performance.list.reviewer'), key: 'reviewer' },
      ],
      data: filteredReviews.map(r => ({ ...r, station: getStationLabel(r.station), statusLabel: t(`performance.status.${r.status}`) })),
      fileName: 'performance_reviews',
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: language === 'ar' ? 'تقييمات الأداء' : 'Performance Reviews',
      columns: [
        { header: t('performance.list.employee'), key: 'employeeName' },
        { header: t('performance.list.department'), key: 'department' },
        { header: language === 'ar' ? 'المحطة' : 'Station', key: 'station' },
        { header: t('performance.list.score'), key: 'score' },
        { header: t('performance.list.status'), key: 'statusLabel' },
      ],
      data: filteredReviews.map(r => ({ ...r, station: getStationLabel(r.station), statusLabel: t(`performance.status.${r.status}`) })),
      fileName: 'performance_reviews',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className={cn("flex flex-col sm:flex-row justify-between gap-3", isRTL && "sm:flex-row-reverse")}>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <FileText className="w-5 h-5 text-primary" />
              {t('performance.list.title')}
            </CardTitle>
            <div className={cn("flex gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
              <Button variant="outline" size="sm" onClick={() => handlePrint(language === 'ar' ? 'تقييمات الأداء' : 'Performance Reviews')} className="gap-1.5">
                <Printer className="w-4 h-4" />
                {language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
                <Download className="w-4 h-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className={cn("flex flex-col sm:flex-row gap-3 flex-wrap", isRTL && "sm:flex-row-reverse")}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input placeholder={t('performance.list.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={cn("w-full", isRTL ? "pr-10" : "pl-10")} />
            </div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder={language === 'ar' ? 'السنة' : 'Year'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع السنوات' : 'All Years'}</SelectItem>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={quarterFilter} onValueChange={setQuarterFilter}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder={t('performance.list.quarter')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('performance.list.allQuarters')}</SelectItem>
                <SelectItem value="Q4">Q4</SelectItem>
                <SelectItem value="Q3">Q3</SelectItem>
                <SelectItem value="Q2">Q2</SelectItem>
                <SelectItem value="Q1">Q1</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder={t('performance.list.status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('performance.list.allStatuses')}</SelectItem>
                <SelectItem value="approved">{t('performance.status.approved')}</SelectItem>
                <SelectItem value="submitted">{t('performance.status.submitted')}</SelectItem>
                <SelectItem value="draft">{t('performance.status.draft')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={language === 'ar' ? 'القسم' : 'Department'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
                {initialDepartments.map(d => (
                  <SelectItem key={d.id} value={d.nameAr}>{language === 'ar' ? d.nameAr : d.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder={language === 'ar' ? 'المحطة/الموقع' : 'Station/Location'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                {stationLocations.map(s => (
                  <SelectItem key={s.value} value={s.value}>{language === 'ar' ? s.labelAr : s.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden" ref={reportRef}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className={isRTL ? "text-right" : ""}>{t('performance.list.employee')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{t('performance.list.department')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{language === 'ar' ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{language === 'ar' ? 'الفترة' : 'Period'}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{t('performance.list.score')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{t('performance.list.status')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{t('performance.list.reviewer')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{t('performance.list.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReviews.map((review) => (
                  <TableRow key={review.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{review.employeeName}</TableCell>
                    <TableCell>{review.department}</TableCell>
                    <TableCell>{getStationLabel(review.station)}</TableCell>
                    <TableCell>{review.quarter} {review.year}</TableCell>
                    <TableCell>
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Star className={cn("w-4 h-4 fill-current", getScoreColor(review.score))} />
                        <span className={cn("font-bold", getScoreColor(review.score))}>{review.score}</span>
                        <Progress value={review.score * 20} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(review.status)}</TableCell>
                    <TableCell>{review.reviewer}</TableCell>
                    <TableCell>
                      <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewReview(review)} title={language === 'ar' ? 'عرض' : 'View'}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(review)} title={language === 'ar' ? 'تعديل' : 'Edit'}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteReviewId(review.id)} title={language === 'ar' ? 'حذف' : 'Delete'}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls currentPage={revPage} totalPages={revTotalPages} totalItems={revTotalItems} startIndex={revStart} endIndex={revEnd} onPageChange={setRevPage} />

          {filteredReviews.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">{t('performance.list.noResults')}</div>
          )}

          <div className={cn("flex gap-4 text-sm text-muted-foreground pt-2 border-t", isRTL && "flex-row-reverse")}>
            <span>{language === 'ar' ? 'إجمالي النتائج:' : 'Total Results:'} <strong className="text-foreground">{filteredReviews.length}</strong></span>
            <span>{language === 'ar' ? 'متوسط التقييم:' : 'Average Score:'} <strong className="text-foreground">{filteredReviews.length > 0 ? (filteredReviews.reduce((s, r) => s + r.score, 0) / filteredReviews.length).toFixed(1) : '0'}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* View Review Dialog */}
      <Dialog open={!!viewReview} onOpenChange={() => setViewReview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Star className="w-5 h-5 text-stat-yellow fill-stat-yellow" />
              {language === 'ar' ? 'تفاصيل التقييم' : 'Review Details'}
            </DialogTitle>
          </DialogHeader>
          {viewReview && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                <div className={cn(isRTL && "text-right")}><p className="text-sm text-muted-foreground">{t('performance.list.employee')}</p><p className="font-semibold">{viewReview.employeeName}</p></div>
                <div className={cn(isRTL && "text-right")}><p className="text-sm text-muted-foreground">{t('performance.list.department')}</p><p className="font-semibold">{viewReview.department}</p></div>
                <div className={cn(isRTL && "text-right")}><p className="text-sm text-muted-foreground">{language === 'ar' ? 'المحطة' : 'Station'}</p><p className="font-semibold">{getStationLabel(viewReview.station)}</p></div>
                <div className={cn(isRTL && "text-right")}><p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفترة' : 'Period'}</p><p className="font-semibold">{viewReview.quarter} {viewReview.year}</p></div>
                <div className={cn(isRTL && "text-right")}><p className="text-sm text-muted-foreground">{t('performance.list.reviewer')}</p><p className="font-semibold">{viewReview.reviewer}</p></div>
                <div className={cn(isRTL && "text-right")}><p className="text-sm text-muted-foreground">{t('performance.list.status')}</p>{getStatusBadge(viewReview.status)}</div>
              </div>

              <div className={cn("flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20", isRTL && "flex-row-reverse")}>
                <span className="font-semibold text-lg">{language === 'ar' ? 'التقييم الإجمالي' : 'Overall Score'}</span>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn("w-5 h-5", s <= Math.floor(viewReview.score) ? "text-stat-yellow fill-stat-yellow" : "text-muted")} />
                  ))}
                  <span className={cn("font-bold text-2xl ms-2", getScoreColor(viewReview.score))}>{viewReview.score}/5</span>
                </div>
              </div>

              {viewReview.criteria && (
                <div className="space-y-3">
                  <h4 className={cn("font-semibold", isRTL && "text-right")}>{language === 'ar' ? 'تفصيل المعايير' : 'Criteria Breakdown'}</h4>
                  {viewReview.criteria.map((c, i) => (
                    <div key={i} className={cn("flex items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
                      <span className="text-sm flex-1">{c.name} <span className="text-muted-foreground text-xs">({c.weight}%)</span></span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={cn("w-3.5 h-3.5", s <= c.score ? "text-stat-yellow fill-stat-yellow" : "text-muted")} />
                        ))}
                        <span className="font-bold text-sm w-6 text-center">{c.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewReview.strengths && (
                <div className={cn("space-y-1", isRTL && "text-right")}>
                  <h4 className="font-semibold text-stat-green">{language === 'ar' ? 'نقاط القوة' : 'Strengths'}</h4>
                  <p className="text-sm bg-stat-green/5 p-3 rounded-lg border border-stat-green/20">{viewReview.strengths}</p>
                </div>
              )}
              {viewReview.improvements && (
                <div className={cn("space-y-1", isRTL && "text-right")}>
                  <h4 className="font-semibold text-stat-coral">{language === 'ar' ? 'مجالات التحسين' : 'Areas for Improvement'}</h4>
                  <p className="text-sm bg-stat-coral/5 p-3 rounded-lg border border-stat-coral/20">{viewReview.improvements}</p>
                </div>
              )}
              {viewReview.goals && (
                <div className={cn("space-y-1", isRTL && "text-right")}>
                  <h4 className="font-semibold text-primary">{language === 'ar' ? 'الأهداف القادمة' : 'Next Goals'}</h4>
                  <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/20">{viewReview.goals}</p>
                </div>
              )}
              {viewReview.managerComments && (
                <div className={cn("space-y-1", isRTL && "text-right")}>
                  <h4 className="font-semibold">{language === 'ar' ? 'ملاحظات المدير' : 'Manager Comments'}</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{viewReview.managerComments}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Review Dialog */}
      <Dialog open={!!editReview} onOpenChange={() => setEditReview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Edit className="w-5 h-5 text-primary" />
              {language === 'ar' ? 'تعديل التقييم' : 'Edit Review'}
            </DialogTitle>
          </DialogHeader>
          {editReview && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                <div className={cn(isRTL && "text-right")}><p className="text-sm text-muted-foreground">{t('performance.list.employee')}</p><p className="font-semibold">{editReview.employeeName}</p></div>
                <div className={cn(isRTL && "text-right")}><p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفترة' : 'Period'}</p><p className="font-semibold">{editReview.quarter} {editReview.year}</p></div>
              </div>

              <div className="space-y-4">
                <h4 className={cn("font-semibold flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Target className="w-4 h-4 text-primary" />
                  {language === 'ar' ? 'معايير التقييم' : 'Evaluation Criteria'}
                </h4>
                {editCriteria.map((criterion, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Label className="text-sm font-medium">{language === 'ar' ? criterion.name : criterion.nameEn}</Label>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{criterion.weight}%</span>
                      </div>
                      <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={cn("w-5 h-5 cursor-pointer transition-colors hover:scale-110", star <= criterion.score ? "text-stat-yellow fill-stat-yellow" : "text-muted-foreground hover:text-stat-yellow/50")}
                            onClick={() => setEditCriteria(prev => prev.map((c, i) => i === idx ? { ...c, score: star } : c))} />
                        ))}
                        <span className="font-bold text-sm w-6 text-center">{criterion.score}</span>
                      </div>
                    </div>
                    <Progress value={criterion.score * 20} className="h-1.5" />
                  </div>
                ))}
                <div className={cn("flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20", isRTL && "flex-row-reverse")}>
                  <span className="font-semibold">{language === 'ar' ? 'التقييم الإجمالي' : 'Overall Score'}</span>
                  <span className={cn("font-bold text-xl", getScoreColor(calculateScore(editCriteria)))}>{calculateScore(editCriteria)}/5</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={cn("flex items-center gap-1.5 text-stat-green", isRTL && "flex-row-reverse")}><TrendingUp className="w-4 h-4" />{language === 'ar' ? 'نقاط القوة' : 'Strengths'}</Label>
                  <Textarea value={editStrengths} onChange={e => setEditStrengths(e.target.value)} className="min-h-[80px]" />
                </div>
                <div className="space-y-2">
                  <Label className={cn("flex items-center gap-1.5 text-stat-coral", isRTL && "flex-row-reverse")}><Lightbulb className="w-4 h-4" />{language === 'ar' ? 'مجالات التحسين' : 'Improvements'}</Label>
                  <Textarea value={editImprovements} onChange={e => setEditImprovements(e.target.value)} className="min-h-[80px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}><Target className="w-4 h-4 text-primary" />{language === 'ar' ? 'الأهداف القادمة' : 'Next Goals'}</Label>
                <Textarea value={editGoals} onChange={e => setEditGoals(e.target.value)} className="min-h-[70px]" />
              </div>
              <div className="space-y-2">
                <Label className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}><MessageSquare className="w-4 h-4 text-primary" />{language === 'ar' ? 'ملاحظات المدير' : 'Manager Comments'}</Label>
                <Textarea value={editManagerComments} onChange={e => setEditManagerComments(e.target.value)} className="min-h-[70px]" />
              </div>

              <div className={cn("flex gap-3 pt-2", isRTL ? "flex-row-reverse justify-start" : "justify-end")}>
                <Button variant="outline" onClick={handleSaveEdit} className="gap-2"><Save className="w-4 h-4" />{language === 'ar' ? 'حفظ كمسودة' : 'Save Draft'}</Button>
                <Button onClick={handleSubmitEdit} className="gap-2 bg-stat-green hover:bg-stat-green/90"><Send className="w-4 h-4" />{language === 'ar' ? 'إرسال التقييم' : 'Submit Review'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReviewId} onOpenChange={() => setDeleteReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' ? 'هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this review? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => {
              if (deleteReviewId) {
                deleteReview(deleteReviewId);
                toast.success(language === 'ar' ? 'تم حذف التقييم بنجاح' : 'Review deleted successfully');
                setDeleteReviewId(null);
              }
            }}>
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
