import { useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecruitmentData, Candidate } from '@/contexts/RecruitmentDataContext';
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
import { Plus, Search, Eye, UserCheck, UserX, Mail, Phone, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Candidates = () => {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { candidates, setCandidates, jobOpenings, setJobOpenings } = useRecruitmentData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [form, setForm] = useState({ nameAr: '', nameEn: '', email: '', phone: '', appliedPosition: '', department: '', experience: 0, education: '', source: '', notes: '' });

  // Only show open job openings for selection
  const openJobs = jobOpenings.filter(j => j.status === 'open');

  const filtered = candidates.filter(c => {
    const matchSearch = c.nameAr.includes(search) || c.nameEn.toLowerCase().includes(search.toLowerCase()) || c.email.includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { paginatedItems: paginatedCandidates, currentPage: candPage, totalPages: candTotalPages, totalItems: candTotalItems, startIndex: candStart, endIndex: candEnd, setCurrentPage: setCandPage } = usePagination(filtered);

  const handleAdd = () => {
    if (!form.nameAr || !form.appliedPosition) {
      toast({ title: t('recruitment.error'), description: t('recruitment.fillRequired'), variant: 'destructive' });
      return;
    }
    // Find the job to get department
    const job = jobOpenings.find(j => j.id === form.appliedPosition);
    const newCandidate: Candidate = {
      id: String(Date.now()),
      ...form,
      appliedPosition: job ? (isRTL ? job.titleAr : job.titleEn || job.titleAr) : form.appliedPosition,
      department: job?.department || form.department,
      status: 'new',
      appliedDate: new Date().toISOString().split('T')[0],
    };
    setCandidates(prev => [newCandidate, ...prev]);
    // Increment applicants count on the job
    if (job) {
      setJobOpenings(prev => prev.map(j => j.id === form.appliedPosition ? { ...j, applicants: j.applicants + 1 } : j));
    }
    toast({ title: t('recruitment.success'), description: t('recruitment.candidateAdded') });
    setDialogOpen(false);
    setForm({ nameAr: '', nameEn: '', email: '', phone: '', appliedPosition: '', department: '', experience: 0, education: '', source: '', notes: '' });
  };

  const handleStatusChange = (id: string, status: Candidate['status']) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    toast({ title: t('recruitment.success'), description: t('recruitment.statusUpdated') });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      new: { className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', label: t('recruitment.candidateStatus.new') },
      screening: { className: 'bg-purple-100 text-purple-700 hover:bg-purple-100', label: t('recruitment.candidateStatus.screening') },
      interview: { className: 'bg-amber-100 text-amber-700 hover:bg-amber-100', label: t('recruitment.candidateStatus.interview') },
      offer: { className: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100', label: t('recruitment.candidateStatus.offer') },
      hired: { className: 'bg-green-100 text-green-700 hover:bg-green-100', label: t('recruitment.candidateStatus.hired') },
      rejected: { className: 'bg-red-100 text-red-700 hover:bg-red-100', label: t('recruitment.candidateStatus.rejected') },
    };
    const s = map[status];
    return s ? <Badge className={s.className}>{s.label}</Badge> : null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {(['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const).map(status => (
          <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{candidates.filter(c => c.status === status).length}</p>
              <p className="text-xs text-muted-foreground">{getStatusBadge(status)}</p>
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
                <Input placeholder={t('recruitment.searchCandidates')} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRTL ? "pr-9" : "pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('recruitment.filter.all')}</SelectItem>
                  <SelectItem value="new">{t('recruitment.candidateStatus.new')}</SelectItem>
                  <SelectItem value="screening">{t('recruitment.candidateStatus.screening')}</SelectItem>
                  <SelectItem value="interview">{t('recruitment.candidateStatus.interview')}</SelectItem>
                  <SelectItem value="offer">{t('recruitment.candidateStatus.offer')}</SelectItem>
                  <SelectItem value="hired">{t('recruitment.candidateStatus.hired')}</SelectItem>
                  <SelectItem value="rejected">{t('recruitment.candidateStatus.rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4" />{t('recruitment.addCandidate')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{t('recruitment.addCandidate')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t('recruitment.field.nameAr')}</Label><Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('recruitment.field.nameEn')}</Label><Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t('recruitment.field.email')}</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('recruitment.field.phone')}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('recruitment.field.appliedPosition')}</Label>
                      <Select value={form.appliedPosition} onValueChange={v => {
                        const job = jobOpenings.find(j => j.id === v);
                        setForm(f => ({ ...f, appliedPosition: v, department: job?.department || f.department }));
                      }}>
                        <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر الوظيفة' : 'Select position'} /></SelectTrigger>
                        <SelectContent>
                          {openJobs.length === 0 ? (
                            <SelectItem value="__none" disabled>{isRTL ? 'لا توجد وظائف شاغرة' : 'No open positions'}</SelectItem>
                          ) : openJobs.map(job => (
                            <SelectItem key={job.id} value={job.id}>
                              {isRTL ? job.titleAr : job.titleEn || job.titleAr} - {job.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('recruitment.field.department')}</Label>
                      <Input value={form.department} disabled className="bg-muted" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>{t('recruitment.field.experience')}</Label><Input type="number" min={0} value={form.experience} onChange={e => setForm(f => ({ ...f, experience: +e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('recruitment.field.education')}</Label><Input value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('recruitment.field.source')}</Label><Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>{t('recruitment.field.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
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
                <TableHead>{t('recruitment.field.name')}</TableHead>
                <TableHead>{t('recruitment.field.appliedPosition')}</TableHead>
                <TableHead>{t('recruitment.field.department')}</TableHead>
                <TableHead>{t('recruitment.field.experience')}</TableHead>
                <TableHead>{t('recruitment.field.source')}</TableHead>
                <TableHead>{t('recruitment.field.appliedDate')}</TableHead>
                <TableHead>{t('recruitment.field.status')}</TableHead>
                <TableHead>{t('recruitment.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{isRTL ? 'لا يوجد مرشحون' : 'No candidates'}</TableCell></TableRow>
              ) : paginatedCandidates.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{isRTL ? c.nameAr : c.nameEn || c.nameAr}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{c.appliedPosition}</TableCell>
                  <TableCell>{c.department}</TableCell>
                  <TableCell>{c.experience} {t('recruitment.years')}</TableCell>
                  <TableCell>{c.source}</TableCell>
                  <TableCell>{c.appliedDate}</TableCell>
                  <TableCell>{getStatusBadge(c.status)}</TableCell>
                  <TableCell>
                    <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedCandidate(c); setViewDialogOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      {c.status !== 'hired' && c.status !== 'rejected' && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleStatusChange(c.id, 'hired')}><UserCheck className="w-4 h-4 text-green-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleStatusChange(c.id, 'rejected')}><UserX className="w-4 h-4 text-destructive" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls currentPage={candPage} totalPages={candTotalPages} totalItems={candTotalItems} startIndex={candStart} endIndex={candEnd} onPageChange={setCandPage} />
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('recruitment.candidateDetails')}</DialogTitle></DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.nameAr')}</p><p className="font-medium">{selectedCandidate.nameAr}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.nameEn')}</p><p className="font-medium">{selectedCandidate.nameEn}</p></div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><p>{selectedCandidate.email}</p></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><p>{selectedCandidate.phone}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.appliedPosition')}</p><p className="font-medium">{selectedCandidate.appliedPosition}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.department')}</p><p className="font-medium">{selectedCandidate.department}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.experience')}</p><p className="font-medium">{selectedCandidate.experience} {t('recruitment.years')}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.education')}</p><p className="font-medium">{selectedCandidate.education}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.source')}</p><p className="font-medium">{selectedCandidate.source}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('recruitment.field.status')}</p>{getStatusBadge(selectedCandidate.status)}</div>
              </div>
              {selectedCandidate.notes && <div><p className="text-sm text-muted-foreground">{t('recruitment.field.notes')}</p><p>{selectedCandidate.notes}</p></div>}
              <div className="flex gap-2 pt-2">
                <Select value={selectedCandidate.status} onValueChange={v => { handleStatusChange(selectedCandidate.id, v as Candidate['status']); setSelectedCandidate({ ...selectedCandidate, status: v as Candidate['status'] }); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{t('recruitment.candidateStatus.new')}</SelectItem>
                    <SelectItem value="screening">{t('recruitment.candidateStatus.screening')}</SelectItem>
                    <SelectItem value="interview">{t('recruitment.candidateStatus.interview')}</SelectItem>
                    <SelectItem value="offer">{t('recruitment.candidateStatus.offer')}</SelectItem>
                    <SelectItem value="hired">{t('recruitment.candidateStatus.hired')}</SelectItem>
                    <SelectItem value="rejected">{t('recruitment.candidateStatus.rejected')}</SelectItem>
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
