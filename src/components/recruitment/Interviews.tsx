import { useState, useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecruitmentData, Interview } from '@/contexts/RecruitmentDataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Interviews = () => {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { interviews, setInterviews, candidates } = useRecruitmentData();
  const [stations, setStations] = useState<{ id: string; name_ar: string; name_en: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, feedback: '' });
  const [form, setForm] = useState({
    candidateId: '', interviewDate: '', interviewTime: '',
    interviewType: 'in-person' as Interview['interviewType'], interviewer: '', location: '',
  });

  useEffect(() => {
    supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true).then(({ data }) => { if (data) setStations(data); });
  }, []);

  // Candidates available for interview (not rejected/hired)
  const availableCandidates = candidates.filter(c => !['hired', 'rejected'].includes(c.status));

  const stats = [
    { label: t('recruitment.interviews.scheduled'), value: interviews.filter(i => i.status === 'scheduled').length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: t('recruitment.interviews.completed'), value: interviews.filter(i => i.status === 'completed').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    { label: t('recruitment.interviews.cancelled'), value: interviews.filter(i => i.status === 'cancelled').length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: t('recruitment.interviews.today'), value: interviews.filter(i => i.interviewDate === new Date().toISOString().split('T')[0] && i.status === 'scheduled').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  const filtered = interviews.filter(i => statusFilter === 'all' || i.status === statusFilter);

  const { paginatedItems: paginatedInterviews, currentPage: intPage, totalPages: intTotalPages, totalItems: intTotalItems, startIndex: intStart, endIndex: intEnd, setCurrentPage: setIntPage } = usePagination(filtered, 20);

  const handleAdd = () => {
    if (!form.candidateId || !form.interviewDate) {
      toast({ title: t('recruitment.error'), description: t('recruitment.fillRequired'), variant: 'destructive' });
      return;
    }
    const candidate = candidates.find(c => c.id === form.candidateId);
    if (!candidate) return;

    const newInterview: Interview = {
      id: String(Date.now()),
      candidateId: candidate.id,
      candidateName: isRTL ? candidate.nameAr : candidate.nameEn || candidate.nameAr,
      position: candidate.appliedPosition,
      department: candidate.department,
      interviewDate: form.interviewDate,
      interviewTime: form.interviewTime,
      interviewType: form.interviewType,
      interviewer: form.interviewer,
      location: form.location,
      status: 'scheduled',
    };
    setInterviews(prev => [newInterview, ...prev]);
    toast({ title: t('recruitment.success'), description: t('recruitment.interviewScheduled') });
    setDialogOpen(false);
    setForm({ candidateId: '', interviewDate: '', interviewTime: '', interviewType: 'in-person', interviewer: '', location: '' });
  };

  const handleComplete = () => {
    if (!selectedInterview) return;
    setInterviews(prev => prev.map(i => i.id === selectedInterview.id ? { ...i, status: 'completed' as const, rating: feedbackForm.rating, feedback: feedbackForm.feedback } : i));
    toast({ title: t('recruitment.success'), description: t('recruitment.interviewCompleted') });
    setFeedbackDialogOpen(false);
    setFeedbackForm({ rating: 5, feedback: '' });
  };

  const handleCancel = (id: string) => {
    setInterviews(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' as const } : i));
    toast({ title: t('recruitment.success'), description: t('recruitment.interviewCancelled') });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      scheduled: { className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', label: t('recruitment.interviewStatus.scheduled') },
      completed: { className: 'bg-green-100 text-green-700 hover:bg-green-100', label: t('recruitment.interviewStatus.completed') },
      cancelled: { className: 'bg-red-100 text-red-700 hover:bg-red-100', label: t('recruitment.interviewStatus.cancelled') },
      'no-show': { className: 'bg-gray-100 text-gray-700 hover:bg-gray-100', label: t('recruitment.interviewStatus.noShow') },
    };
    const s = map[status];
    return s ? <Badge className={s.className}>{s.label}</Badge> : null;
  };

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      phone: t('recruitment.interviewType.phone'),
      video: t('recruitment.interviewType.video'),
      'in-person': t('recruitment.interviewType.inPerson'),
      technical: t('recruitment.interviewType.technical'),
    };
    return <Badge variant="outline">{map[type]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className={cn("p-2.5 rounded-lg", stat.bg)}><stat.icon className={cn("w-5 h-5", stat.color)} /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-3 items-center justify-between", isRTL && "flex-row-reverse")}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('recruitment.filter.all')}</SelectItem>
                <SelectItem value="scheduled">{t('recruitment.interviewStatus.scheduled')}</SelectItem>
                <SelectItem value="completed">{t('recruitment.interviewStatus.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('recruitment.interviewStatus.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4" />{t('recruitment.scheduleInterview')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{t('recruitment.scheduleInterview')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('recruitment.field.candidateName')}</Label>
                    <Select value={form.candidateId} onValueChange={v => setForm(f => ({ ...f, candidateId: v }))}>
                      <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر المرشح' : 'Select candidate'} /></SelectTrigger>
                      <SelectContent>
                        {availableCandidates.length === 0 ? (
                          <SelectItem value="__none" disabled>{isRTL ? 'لا يوجد مرشحون' : 'No candidates available'}</SelectItem>
                        ) : availableCandidates.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {isRTL ? c.nameAr : c.nameEn || c.nameAr} - {c.appliedPosition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>{t('recruitment.field.date')}</Label><Input type="date" value={form.interviewDate} onChange={e => setForm(f => ({ ...f, interviewDate: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('recruitment.field.time')}</Label><Input type="time" value={form.interviewTime} onChange={e => setForm(f => ({ ...f, interviewTime: e.target.value }))} /></div>
                    <div className="space-y-2">
                      <Label>{t('recruitment.field.interviewType')}</Label>
                      <Select value={form.interviewType} onValueChange={v => setForm(f => ({ ...f, interviewType: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">{t('recruitment.interviewType.phone')}</SelectItem>
                          <SelectItem value="video">{t('recruitment.interviewType.video')}</SelectItem>
                          <SelectItem value="in-person">{t('recruitment.interviewType.inPerson')}</SelectItem>
                          <SelectItem value="technical">{t('recruitment.interviewType.technical')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t('recruitment.field.interviewer')}</Label><Input value={form.interviewer} onChange={e => setForm(f => ({ ...f, interviewer: e.target.value }))} /></div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'الموقع' : 'Location'}</Label>
                      <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
                        <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر الموقع' : 'Select location'} /></SelectTrigger>
                        <SelectContent>
                          {stations.map(s => (
                            <SelectItem key={s.id} value={isRTL ? s.name_ar : s.name_en}>{isRTL ? s.name_ar : s.name_en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleAdd} className="w-full">{t('recruitment.save')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('recruitment.field.candidateName')}</TableHead>
                <TableHead>{t('recruitment.field.appliedPosition')}</TableHead>
                <TableHead>{t('recruitment.field.date')}</TableHead>
                <TableHead>{t('recruitment.field.time')}</TableHead>
                <TableHead>{t('recruitment.field.interviewType')}</TableHead>
                <TableHead>{t('recruitment.field.interviewer')}</TableHead>
                <TableHead>{isRTL ? 'الموقع' : 'Location'}</TableHead>
                <TableHead>{t('recruitment.field.status')}</TableHead>
                <TableHead>{t('recruitment.field.rating')}</TableHead>
                <TableHead>{t('recruitment.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">{isRTL ? 'لا توجد مقابلات' : 'No interviews'}</TableCell></TableRow>
              ) : paginatedInterviews.map(interview => (
                <TableRow key={interview.id}>
                  <TableCell className="font-medium">{interview.candidateName}</TableCell>
                  <TableCell>{interview.position}</TableCell>
                  <TableCell>{interview.interviewDate}</TableCell>
                  <TableCell>{interview.interviewTime}</TableCell>
                  <TableCell>{getTypeBadge(interview.interviewType)}</TableCell>
                  <TableCell>{interview.interviewer}</TableCell>
                  <TableCell>{interview.location}</TableCell>
                  <TableCell>{getStatusBadge(interview.status)}</TableCell>
                  <TableCell>{interview.rating ? `${interview.rating}/10` : '-'}</TableCell>
                  <TableCell>
                    <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                      {interview.status === 'scheduled' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedInterview(interview); setFeedbackDialogOpen(true); }}><CheckCircle className="w-4 h-4 text-green-600" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(interview.id)}><XCircle className="w-4 h-4 text-destructive" /></Button>
                        </>
                      )}
                      {interview.feedback && (
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedInterview(interview); setFeedbackDialogOpen(true); }}><AlertCircle className="w-4 h-4 text-blue-600" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls currentPage={intPage} totalPages={intTotalPages} totalItems={intTotalItems} startIndex={intStart} endIndex={intEnd} onPageChange={setIntPage} />
        </CardContent>
      </Card>

      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedInterview?.status === 'completed' ? t('recruitment.viewFeedback') : t('recruitment.addFeedback')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {selectedInterview?.status === 'completed' && selectedInterview.feedback ? (
              <div className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.rating')}</p><p className="text-xl font-bold">{selectedInterview.rating}/10</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.feedback')}</p><p>{selectedInterview.feedback}</p></div>
              </div>
            ) : (
              <>
                <div className="space-y-2"><Label>{t('recruitment.field.rating')} (1-10)</Label><Input type="number" min={1} max={10} value={feedbackForm.rating} onChange={e => setFeedbackForm(f => ({ ...f, rating: +e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t('recruitment.field.feedback')}</Label><Textarea value={feedbackForm.feedback} onChange={e => setFeedbackForm(f => ({ ...f, feedback: e.target.value }))} rows={4} placeholder={t('recruitment.feedbackPlaceholder')} /></div>
                <Button onClick={handleComplete} className="w-full">{t('recruitment.completeInterview')}</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
