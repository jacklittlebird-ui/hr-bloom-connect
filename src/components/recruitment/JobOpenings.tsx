import { useState, useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecruitmentData, JobOpening } from '@/contexts/RecruitmentDataContext';
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
import { Plus, Search, Edit, Trash2, Eye, Briefcase, Users, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const JobOpenings = () => {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { jobOpenings: openings, setJobOpenings: setOpenings } = useRecruitmentData();
  const [stations, setStations] = useState<{ id: string; name_ar: string; name_en: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name_ar: string; name_en: string }[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [form, setForm] = useState({ titleAr: '', titleEn: '', department: '', location: '', type: 'full-time' as JobOpening['type'], vacancies: 1, closingDate: '', description: '' });

  useEffect(() => {
    supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true).then(({ data }) => { if (data) setStations(data); });
    supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true).then(({ data }) => { if (data) setDepartments(data); });
  }, []);

  const stats = [
    { label: t('recruitment.stats.totalOpenings'), value: openings.length, icon: Briefcase, bg: 'bg-primary/10', color: 'text-primary' },
    { label: t('recruitment.stats.activeOpenings'), value: openings.filter(o => o.status === 'open').length, icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' },
    { label: t('recruitment.stats.totalApplicants'), value: openings.reduce((s, o) => s + o.applicants, 0), icon: Users, bg: 'bg-blue-100', color: 'text-blue-600' },
    { label: t('recruitment.stats.onHold'), value: openings.filter(o => o.status === 'on-hold').length, icon: Clock, bg: 'bg-amber-100', color: 'text-amber-600' },
  ];

  const filtered = openings.filter(o => {
    const matchSearch = o.titleAr.includes(search) || o.titleEn.toLowerCase().includes(search.toLowerCase()) || o.department.includes(search);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { paginatedItems: paginatedJobs, currentPage: jobPage, totalPages: jobTotalPages, totalItems: jobTotalItems, startIndex: jobStart, endIndex: jobEnd, setCurrentPage: setJobPage } = usePagination(filtered, 20);

  const resetForm = () => setForm({ titleAr: '', titleEn: '', department: '', location: '', type: 'full-time', vacancies: 1, closingDate: '', description: '' });

  const handleSave = () => {
    if (!form.titleAr || !form.department) {
      toast({ title: t('recruitment.error'), description: t('recruitment.fillRequired'), variant: 'destructive' });
      return;
    }
    if (editingJob) {
      setOpenings(prev => prev.map(o => o.id === editingJob.id ? { ...o, ...form } : o));
      toast({ title: t('recruitment.success'), description: t('recruitment.jobUpdated') });
    } else {
      const newJob: JobOpening = { id: String(Date.now()), ...form, status: 'open', applicants: 0, postedDate: new Date().toISOString().split('T')[0] };
      setOpenings(prev => [newJob, ...prev]);
      toast({ title: t('recruitment.success'), description: t('recruitment.jobCreated') });
    }
    setDialogOpen(false);
    setEditingJob(null);
    resetForm();
  };

  const handleEdit = (job: JobOpening) => {
    setEditingJob(job);
    setForm({ titleAr: job.titleAr, titleEn: job.titleEn, department: job.department, location: job.location, type: job.type, vacancies: job.vacancies, closingDate: job.closingDate, description: job.description });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setOpenings(prev => prev.filter(o => o.id !== id));
    toast({ title: t('recruitment.success'), description: t('recruitment.jobDeleted') });
  };

  const handleStatusChange = (id: string, status: JobOpening['status']) => {
    setOpenings(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    toast({ title: t('recruitment.success'), description: t('recruitment.statusUpdated') });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{t('recruitment.status.open')}</Badge>;
      case 'closed': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t('recruitment.status.closed')}</Badge>;
      case 'on-hold': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{t('recruitment.status.onHold')}</Badge>;
      default: return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'full-time': return <Badge variant="outline">{t('recruitment.type.fullTime')}</Badge>;
      case 'part-time': return <Badge variant="outline">{t('recruitment.type.partTime')}</Badge>;
      case 'contract': return <Badge variant="outline">{t('recruitment.type.contract')}</Badge>;
      default: return null;
    }
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
            <div className={cn("flex gap-3 flex-1", isRTL && "flex-row-reverse")}>
              <div className="relative flex-1 max-w-sm">
                <Search className={cn("absolute top-2.5 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input placeholder={t('recruitment.searchJobs')} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRTL ? "pr-9" : "pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('recruitment.filter.all')}</SelectItem>
                  <SelectItem value="open">{t('recruitment.status.open')}</SelectItem>
                  <SelectItem value="closed">{t('recruitment.status.closed')}</SelectItem>
                  <SelectItem value="on-hold">{t('recruitment.status.onHold')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingJob(null); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4" />{t('recruitment.addJob')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingJob ? t('recruitment.editJob') : t('recruitment.addJob')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t('recruitment.field.titleAr')}</Label><Input value={form.titleAr} onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('recruitment.field.titleEn')}</Label><Input value={form.titleEn} onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('recruitment.field.department')}</Label>
                      <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                        <SelectTrigger><SelectValue placeholder={t('recruitment.field.selectDept')} /></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => (
                            <SelectItem key={d.id} value={isRTL ? d.name_ar : d.name_en}>{isRTL ? d.name_ar : d.name_en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('recruitment.field.location')}</Label>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t('recruitment.field.type')}</Label>
                      <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">{t('recruitment.type.fullTime')}</SelectItem>
                          <SelectItem value="part-time">{t('recruitment.type.partTime')}</SelectItem>
                          <SelectItem value="contract">{t('recruitment.type.contract')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>{t('recruitment.field.vacancies')}</Label><Input type="number" min={1} value={form.vacancies} onChange={e => setForm(f => ({ ...f, vacancies: +e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('recruitment.field.closingDate')}</Label><Input type="date" value={form.closingDate} onChange={e => setForm(f => ({ ...f, closingDate: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>{t('recruitment.field.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                  <Button onClick={handleSave} className="w-full">{t('recruitment.save')}</Button>
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
                <TableHead>{t('recruitment.field.titleAr')}</TableHead>
                <TableHead>{t('recruitment.field.department')}</TableHead>
                <TableHead>{t('recruitment.field.location')}</TableHead>
                <TableHead>{t('recruitment.field.type')}</TableHead>
                <TableHead>{t('recruitment.field.vacancies')}</TableHead>
                <TableHead>{t('recruitment.field.applicants')}</TableHead>
                <TableHead>{t('recruitment.field.status')}</TableHead>
                <TableHead>{t('recruitment.field.postedDate')}</TableHead>
                <TableHead>{t('recruitment.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{isRTL ? 'لا توجد وظائف شاغرة' : 'No job openings'}</TableCell></TableRow>
              ) : paginatedJobs.map(job => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{isRTL ? job.titleAr : job.titleEn || job.titleAr}</TableCell>
                  <TableCell>{job.department}</TableCell>
                  <TableCell>{job.location}</TableCell>
                  <TableCell>{getTypeBadge(job.type)}</TableCell>
                  <TableCell>{job.vacancies}</TableCell>
                  <TableCell><Badge variant="secondary">{job.applicants}</Badge></TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>{job.postedDate}</TableCell>
                  <TableCell>
                    <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedJob(job); setViewDialogOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(job)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(job.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls currentPage={jobPage} totalPages={jobTotalPages} totalItems={jobTotalItems} startIndex={jobStart} endIndex={jobEnd} onPageChange={setJobPage} />
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('recruitment.jobDetails')}</DialogTitle></DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.titleAr')}</p><p className="font-medium">{selectedJob.titleAr}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.titleEn')}</p><p className="font-medium">{selectedJob.titleEn}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.department')}</p><p className="font-medium">{selectedJob.department}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.location')}</p><p className="font-medium">{selectedJob.location}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.type')}</p>{getTypeBadge(selectedJob.type)}</div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.status')}</p>{getStatusBadge(selectedJob.status)}</div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.vacancies')}</p><p className="font-medium">{selectedJob.vacancies}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.applicants')}</p><p className="font-medium">{selectedJob.applicants}</p></div>
              </div>
              {selectedJob.description && <div><p className="text-sm text-muted-foreground">{t('recruitment.field.description')}</p><p>{selectedJob.description}</p></div>}
              <div className="flex gap-2 pt-2">
                <Select value={selectedJob.status} onValueChange={v => { handleStatusChange(selectedJob.id, v as JobOpening['status']); setSelectedJob({ ...selectedJob, status: v as JobOpening['status'] }); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t('recruitment.status.open')}</SelectItem>
                    <SelectItem value="closed">{t('recruitment.status.closed')}</SelectItem>
                    <SelectItem value="on-hold">{t('recruitment.status.onHold')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
