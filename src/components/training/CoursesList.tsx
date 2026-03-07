import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  provider: string;
  duration: string;
  status: 'active' | 'inactive';
  description: string;
  durationHours: number;
  validityYears: number;
}

export const CoursesList = () => {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<Partial<Course>>({});

  const fetchCourses = async () => {
    const { data } = await supabase.from('training_courses').select('*').order('created_at', { ascending: false });
    setCourses((data || []).map((c: any) => ({
      id: c.id,
      code: c.course_code || '',
      nameEn: c.name_en,
      nameAr: c.name_ar,
      provider: c.provider || '',
      duration: c.duration_hours ? `${c.duration_hours} hours` : '',
      durationHours: c.duration_hours || 0,
      description: c.description || '',
      status: c.is_active ? 'active' as const : 'inactive' as const,
      validityYears: c.validity_years || 1,
    })));
  };

  useEffect(() => { fetchCourses(); }, []);

  const filteredCourses = courses.filter(course => {
    const searchMatch = course.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || course.nameAr.includes(searchQuery) || course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = !filterStatus || filterStatus === 'all' || course.status === filterStatus;
    return searchMatch && statusMatch;
  });

  const handleNew = () => {
    setSelectedCourse(null); setIsViewMode(false);
    setFormData({ code: '', nameEn: '', nameAr: '', provider: '', durationHours: 0, status: 'active', description: '', validityYears: 1 });
    setIsDialogOpen(true);
  };

  const handleEdit = (course: Course) => { setSelectedCourse(course); setIsViewMode(false); setFormData(course); setIsDialogOpen(true); };
  const handleView = (course: Course) => { setSelectedCourse(course); setIsViewMode(true); setFormData(course); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.nameEn) { toast({ title: t('common.error'), description: t('training.fillRequired'), variant: 'destructive' }); return; }
    if (selectedCourse) {
      await supabase.from('training_courses').update({
        name_en: formData.nameEn,
        name_ar: formData.nameAr || '',
        description: formData.description,
        is_active: formData.status === 'active',
        provider: formData.provider || '',
        course_code: formData.code || '',
        duration_hours: formData.durationHours || 0,
        validity_years: formData.validityYears || 1,
      } as any).eq('id', selectedCourse.id);
      toast({ title: t('common.success'), description: t('training.courses.updated') });
    } else {
      await supabase.from('training_courses').insert({
        name_en: formData.nameEn || '',
        name_ar: formData.nameAr || '',
        description: formData.description,
        provider: formData.provider || '',
        course_code: formData.code || '',
        duration_hours: formData.durationHours || 0,
        validity_years: formData.validityYears || 1,
      } as any);
      toast({ title: t('common.success'), description: t('training.courses.added') });
    }
    setIsDialogOpen(false);
    fetchCourses();
  };

  const handleDelete = async (courseId: string) => {
    await supabase.from('training_courses').delete().eq('id', courseId);
    toast({ title: t('common.success'), description: t('training.courses.deleted') });
    fetchCourses();
  };

  return (
    <div dir="rtl" className="space-y-6">
      <Card><CardContent className="p-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
            <Input placeholder={t('training.courses.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={cn(isRTL ? "pr-10" : "pl-10")} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t('training.courses.filterStatus')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="active">{t('training.status.active')}</SelectItem>
              <SelectItem value="inactive">{t('training.status.inactive')}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />{t('training.courses.add')}</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
            <TableHead>{t('training.courses.name')}</TableHead>
            <TableHead>{language === 'ar' ? 'الجهة' : 'Provider'}</TableHead>
            <TableHead>{t('training.courses.duration')}</TableHead>
            <TableHead>{language === 'ar' ? 'الصلاحية' : 'Validity'}</TableHead>
            <TableHead>{t('training.courses.status')}</TableHead>
            <TableHead>{t('common.actions')}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredCourses.map(course => (
              <TableRow key={course.id}>
                <TableCell className="font-mono">{course.code}</TableCell>
                <TableCell className="font-medium">{language === 'ar' ? course.nameAr : course.nameEn}</TableCell>
                <TableCell>{course.provider}</TableCell>
                <TableCell>{course.duration}</TableCell>
                <TableCell>{course.validityYears} {language === 'ar' ? (course.validityYears === 1 ? 'سنة' : 'سنوات') : (course.validityYears === 1 ? 'Year' : 'Years')}</TableCell>
                <TableCell><Badge variant={course.status === 'active' ? 'default' : 'secondary'}>{course.status === 'active' ? t('training.status.active') : t('training.status.inactive')}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleView(course)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(course)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCourses.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('training.courses.noResults')}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isViewMode ? t('training.courses.view') : selectedCourse ? t('training.courses.edit') : t('training.courses.add')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{language === 'ar' ? 'الكود' : 'Code'}</Label><Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} disabled={isViewMode} /></div>
            <div><Label>{t('training.courses.nameEn')}</Label><Input value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} disabled={isViewMode} /></div>
            <div><Label>{t('training.courses.nameAr')}</Label><Input value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} disabled={isViewMode} dir="rtl" /></div>
            <div><Label>{language === 'ar' ? 'الجهة المقدمة' : 'Provider'}</Label><Input value={formData.provider || ''} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} disabled={isViewMode} /></div>
            <div><Label>{language === 'ar' ? 'المدة (ساعات)' : 'Duration (hours)'}</Label><Input type="number" value={formData.durationHours || ''} onChange={(e) => setFormData({ ...formData, durationHours: parseInt(e.target.value) || 0 })} disabled={isViewMode} /></div>
            <div><Label>{language === 'ar' ? 'مدة الصلاحية (سنوات)' : 'Validity (years)'}</Label>
              <Select value={String(formData.validityYears || 1)} onValueChange={(v) => setFormData({ ...formData, validityYears: parseInt(v) })} disabled={isViewMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(y => <SelectItem key={y} value={String(y)}>{y} {language === 'ar' ? (y === 1 ? 'سنة' : 'سنوات') : (y === 1 ? 'Year' : 'Years')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t('training.courses.status')}</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })} disabled={isViewMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('training.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('training.status.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>{t('training.courses.description')}</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isViewMode} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
            {!isViewMode && <Button onClick={handleSave}>{t('common.save')}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
