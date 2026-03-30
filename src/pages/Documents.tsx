import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePersistedState } from '@/hooks/usePersistedState';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, FileText, Download, Trash2, Edit, FolderOpen, File, Eye, Upload, Filter, ShieldAlert, CreditCard, Landmark, Briefcase } from 'lucide-react';
import { InsuranceRenewals } from '@/components/documents/InsuranceRenewals';
import { NationalIdRenewals } from '@/components/documents/NationalIdRenewals';
import { MissingBankData } from '@/components/documents/MissingBankData';
import { MissingJobData } from '@/components/documents/MissingJobData';

interface Document {
  id: string;
  title: string;
  category: string;
  type: string;
  description: string;
  uploadedBy: string;
  uploadDate: string;
  expiryDate?: string;
  size: string;
  status: 'active' | 'expired' | 'archived';
  tags: string[];
}

const categories = [
  { value: 'contracts', ar: 'العقود', en: 'Contracts' },
  { value: 'policies', ar: 'السياسات', en: 'Policies' },
  { value: 'forms', ar: 'النماذج', en: 'Forms' },
  { value: 'reports', ar: 'التقارير', en: 'Reports' },
  { value: 'certificates', ar: 'الشهادات', en: 'Certificates' },
  { value: 'letters', ar: 'الخطابات', en: 'Letters' },
  { value: 'manuals', ar: 'الأدلة', en: 'Manuals' },
  { value: 'other', ar: 'أخرى', en: 'Other' },
];

const initialDocs: Document[] = [
  { id: '1', title: 'لائحة العمل الداخلية', category: 'policies', type: 'PDF', description: 'اللائحة الداخلية المعتمدة', uploadedBy: 'أحمد محمد', uploadDate: '2025-01-15', size: '2.5 MB', status: 'active', tags: ['لوائح', 'سياسات'] },
  { id: '2', title: 'نموذج طلب إجازة', category: 'forms', type: 'DOCX', description: 'نموذج طلب إجازة رسمي', uploadedBy: 'سارة أحمد', uploadDate: '2025-02-01', size: '150 KB', status: 'active', tags: ['نماذج', 'إجازات'] },
  { id: '3', title: 'عقد عمل موحد', category: 'contracts', type: 'PDF', description: 'صيغة عقد العمل الموحدة', uploadedBy: 'أحمد محمد', uploadDate: '2025-01-10', size: '500 KB', status: 'active', tags: ['عقود'] },
  { id: '4', title: 'دليل الموظف الجديد', category: 'manuals', type: 'PDF', description: 'دليل إرشادي للموظفين الجدد', uploadedBy: 'محمد علي', uploadDate: '2025-03-01', size: '5.2 MB', status: 'active', tags: ['أدلة', 'توجيه'] },
  { id: '5', title: 'سياسة الحضور والانصراف', category: 'policies', type: 'PDF', description: 'قواعد الحضور والانصراف', uploadedBy: 'سارة أحمد', uploadDate: '2024-12-01', expiryDate: '2025-12-01', size: '800 KB', status: 'active', tags: ['سياسات', 'حضور'] },
  { id: '6', title: 'شهادة ISO 9001', category: 'certificates', type: 'PDF', description: 'شهادة الجودة المعتمدة', uploadedBy: 'أحمد محمد', uploadDate: '2024-06-01', expiryDate: '2025-06-01', size: '1.2 MB', status: 'expired', tags: ['شهادات', 'جودة'] },
  { id: '7', title: 'تقرير الأداء السنوي 2024', category: 'reports', type: 'XLSX', description: 'تقرير أداء الشركة لعام 2024', uploadedBy: 'محمد علي', uploadDate: '2025-01-20', size: '3.8 MB', status: 'archived', tags: ['تقارير', 'أداء'] },
];

const Documents = () => {
  const { language, isRTL } = useLanguage();
  const [activeMainTab, setActiveMainTab] = useState('renewals');
  const [docs, setDocs] = usePersistedState<Document[]>('hr_documents_library', initialDocs);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', category: '', type: 'PDF', description: '', tags: '', expiryDate: '' });

  const isAr = language === 'ar';

  const filtered = docs.filter(d => {
    const matchSearch = d.title.includes(search) || d.description.includes(search) || d.tags.some(t => t.includes(search));
    const matchCat = categoryFilter === 'all' || d.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const openAdd = () => { setEditingDoc(null); setForm({ title: '', category: '', type: 'PDF', description: '', tags: '', expiryDate: '' }); setDialogOpen(true); };
  const openEdit = (doc: Document) => { setEditingDoc(doc); setForm({ title: doc.title, category: doc.category, type: doc.type, description: doc.description, tags: doc.tags.join(', '), expiryDate: doc.expiryDate || '' }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.title || !form.category) { toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى ملء الحقول المطلوبة' : 'Fill required fields', variant: 'destructive' }); return; }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editingDoc) {
      setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...d, title: form.title, category: form.category, type: form.type, description: form.description, tags, expiryDate: form.expiryDate || undefined } : d));
      toast({ title: isAr ? 'تم التحديث' : 'Updated' });
    } else {
      const newDoc: Document = {
        id: Date.now().toString(), title: form.title, category: form.category, type: form.type,
        description: form.description, uploadedBy: isAr ? 'المستخدم الحالي' : 'Current User',
        uploadDate: new Date().toISOString().split('T')[0], size: '—',
        status: 'active', tags, expiryDate: form.expiryDate || undefined,
      };
      setDocs(prev => [...prev, newDoc]);
      toast({ title: isAr ? 'تم الرفع' : 'Uploaded' });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { setDocs(prev => prev.filter(d => d.id !== id)); setDeleteConfirm(null); toast({ title: isAr ? 'تم الحذف' : 'Deleted' }); };
  const handleArchive = (id: string) => { setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'archived' as const } : d)); toast({ title: isAr ? 'تمت الأرشفة' : 'Archived' }); };

  const catLabel = (val: string) => { const c = categories.find(c => c.value === val); return c ? (isAr ? c.ar : c.en) : val; };
  const statusBadge = (s: string) => s === 'active' ? 'default' : s === 'expired' ? 'destructive' : 'secondary';
  const statusLabel = (s: string) => s === 'active' ? (isAr ? 'نشط' : 'Active') : s === 'expired' ? (isAr ? 'منتهي' : 'Expired') : (isAr ? 'مؤرشف' : 'Archived');

  const stats = { total: docs.length, active: docs.filter(d => d.status === 'active').length, expired: docs.filter(d => d.status === 'expired').length, archived: docs.filter(d => d.status === 'archived').length };

  return (
    <DashboardLayout>
      <div className={cn("space-y-6", isRTL && "text-right")}>
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isAr ? 'التنبيهات والمستندات' : 'Alerts & Documents'}</h1>
            <p className="text-muted-foreground">{isAr ? 'إدارة المستندات والتنبيهات والتجديدات' : 'Manage documents, alerts and renewals'}</p>
          </div>
          {activeMainTab === 'documents' && (
            <Button onClick={openAdd} className={cn("gap-2", isRTL && "flex-row-reverse")}>
              <Upload className="w-4 h-4" /> {isAr ? 'رفع مستند' : 'Upload Document'}
            </Button>
          )}
        </div>

        {/* Main Tabs */}
        <div className="flex gap-3">
          <Button
            variant={activeMainTab === 'renewals' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setActiveMainTab('renewals')}
          >
            <ShieldAlert className="w-4 h-4" />
            {isAr ? 'تجديدات العقود' : 'Contract Renewals'}
          </Button>
          <Button
            variant={activeMainTab === 'nationalId' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setActiveMainTab('nationalId')}
          >
            <CreditCard className="w-4 h-4" />
            {isAr ? 'تجديد الرقم القومي' : 'National ID Renewal'}
          </Button>
          <Button
            variant={activeMainTab === 'bankData' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setActiveMainTab('bankData')}
          >
            <Landmark className="w-4 h-4" />
            {isAr ? 'البيانات البنكية' : 'Bank Data'}
          </Button>
          <Button
            variant={activeMainTab === 'missingJob' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setActiveMainTab('missingJob')}
          >
            <Briefcase className="w-4 h-4" />
            {isAr ? 'بيانات التعيين' : 'Job Data'}
          </Button>
          <Button
            variant={activeMainTab === 'documents' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setActiveMainTab('documents')}
          >
            <FileText className="w-4 h-4" />
            {isAr ? 'المستندات' : 'Documents'}
          </Button>
        </div>

        {activeMainTab === 'renewals' ? (
          <InsuranceRenewals />
        ) : activeMainTab === 'nationalId' ? (
          <NationalIdRenewals />
        ) : activeMainTab === 'bankData' ? (
          <MissingBankData />
        ) : activeMainTab === 'missingJob' ? (
          <MissingJobData />
        ) : (
        <>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">{isAr ? 'إجمالي المستندات' : 'Total'}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><File className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">{isAr ? 'نشط' : 'Active'}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10"><File className="w-5 h-5 text-red-600" /></div><div><p className="text-2xl font-bold">{stats.expired}</p><p className="text-xs text-muted-foreground">{isAr ? 'منتهي' : 'Expired'}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><FolderOpen className="w-5 h-5 text-muted-foreground" /></div><div><p className="text-2xl font-bold">{stats.archived}</p><p className="text-xs text-muted-foreground">{isAr ? 'مؤرشف' : 'Archived'}</p></div></CardContent></Card>
        </div>

        {/* Filters */}
        <div className={cn("flex flex-wrap items-center gap-3", isRTL && "flex-row-reverse")}>
          <div className="relative flex-1 max-w-md">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
            <Input placeholder={isAr ? 'بحث في المستندات...' : 'Search documents...'} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRTL ? "pr-10" : "pl-10")} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder={isAr ? 'التصنيف' : 'Category'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
              {categories.map(c => <SelectItem key={c.value} value={c.value}>{isAr ? c.ar : c.en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder={isAr ? 'الحالة' : 'Status'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="active">{isAr ? 'نشط' : 'Active'}</SelectItem>
              <SelectItem value="expired">{isAr ? 'منتهي' : 'Expired'}</SelectItem>
              <SelectItem value="archived">{isAr ? 'مؤرشف' : 'Archived'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'العنوان' : 'Title'}</TableHead>
                  <TableHead>{isAr ? 'التصنيف' : 'Category'}</TableHead>
                  <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                  <TableHead>{isAr ? 'رفع بواسطة' : 'Uploaded By'}</TableHead>
                  <TableHead>{isAr ? 'تاريخ الرفع' : 'Upload Date'}</TableHead>
                  <TableHead>{isAr ? 'الحجم' : 'Size'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        {doc.tags.length > 0 && <div className="flex gap-1 mt-1">{doc.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{catLabel(doc.category)}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                    <TableCell>{doc.uploadedBy}</TableCell>
                    <TableCell>{doc.uploadDate}</TableCell>
                    <TableCell>{doc.size}</TableCell>
                    <TableCell><Badge variant={statusBadge(doc.status) as any}>{statusLabel(doc.status)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setViewDoc(doc)}><Eye className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(doc)}><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => toast({ title: isAr ? 'جاري التنزيل...' : 'Downloading...' })}><Download className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(doc.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد مستندات' : 'No documents'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingDoc ? (isAr ? 'تعديل مستند' : 'Edit Document') : (isAr ? 'رفع مستند جديد' : 'Upload Document')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{isAr ? 'العنوان' : 'Title'} *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>{isAr ? 'التصنيف' : 'Category'} *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{isAr ? c.ar : c.en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{isAr ? 'نوع الملف' : 'File Type'}</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="DOCX">DOCX</SelectItem>
                    <SelectItem value="XLSX">XLSX</SelectItem>
                    <SelectItem value="PNG">PNG</SelectItem>
                    <SelectItem value="JPG">JPG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{isAr ? 'الوصف' : 'Description'}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>{isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</Label><Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} /></div>
              <div><Label>{isAr ? 'الوسوم (مفصولة بفاصلة)' : 'Tags (comma separated)'}</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
              {!editingDoc && (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p>{isAr ? 'اسحب الملف هنا أو انقر للاختيار' : 'Drag file here or click to select'}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleSave}>{editingDoc ? (isAr ? 'حفظ' : 'Save') : (isAr ? 'رفع' : 'Upload')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{viewDoc?.title}</DialogTitle></DialogHeader>
            {viewDoc && (
              <div className="space-y-3">
                <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}><span className="text-muted-foreground">{isAr ? 'التصنيف' : 'Category'}</span><Badge variant="secondary">{catLabel(viewDoc.category)}</Badge></div>
                <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}><span className="text-muted-foreground">{isAr ? 'النوع' : 'Type'}</span><span>{viewDoc.type}</span></div>
                <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}><span className="text-muted-foreground">{isAr ? 'الحجم' : 'Size'}</span><span>{viewDoc.size}</span></div>
                <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}><span className="text-muted-foreground">{isAr ? 'رفع بواسطة' : 'By'}</span><span>{viewDoc.uploadedBy}</span></div>
                <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}><span className="text-muted-foreground">{isAr ? 'تاريخ الرفع' : 'Date'}</span><span>{viewDoc.uploadDate}</span></div>
                {viewDoc.expiryDate && <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}><span className="text-muted-foreground">{isAr ? 'تاريخ الانتهاء' : 'Expiry'}</span><span>{viewDoc.expiryDate}</span></div>}
                <p className="text-sm">{viewDoc.description}</p>
                <div className={cn("flex gap-2 pt-2", isRTL && "flex-row-reverse")}>
                  <Button className="gap-2" onClick={() => toast({ title: isAr ? 'جاري التنزيل' : 'Downloading' })}><Download className="w-4 h-4" />{isAr ? 'تنزيل' : 'Download'}</Button>
                  {viewDoc.status !== 'archived' && <Button variant="outline" onClick={() => { handleArchive(viewDoc.id); setViewDoc(null); }}>{isAr ? 'أرشفة' : 'Archive'}</Button>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{isAr ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle></DialogHeader>
            <p className="text-muted-foreground">{isAr ? 'هل أنت متأكد من حذف هذا المستند؟' : 'Delete this document?'}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>{isAr ? 'حذف' : 'Delete'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Documents;
