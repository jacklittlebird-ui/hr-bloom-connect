import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, ChevronLeft, ChevronRight, Save, Trash2, Search, X, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CourseSyllabus {
  id: string;
  courseName: string;
  provider: string;
  courseCode: string;
  editedBy: string;
  courseDuration: string;
  courseObjective: string;
  courseAdministration: string;
  exercises: string;
  basicTopics: string;
  intermediateTopics: string;
  advancedTopics: string;
  reference: string;
  examination: string;
}

const emptyForm: CourseSyllabus = {
  id: '', courseName: '', provider: '', courseCode: '', editedBy: '',
  courseDuration: '', courseObjective: '', courseAdministration: '', exercises: '',
  basicTopics: '', intermediateTopics: '', advancedTopics: '', reference: '', examination: '',
};

export const CoursesSyllabus = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const ar = language === 'ar';
  const [syllabi, setSyllabi] = useState<CourseSyllabus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAddMode, setIsAddMode] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchProvider, setSearchProvider] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState<CourseSyllabus>(emptyForm);

  const fetchSyllabi = async () => {
    const { data } = await supabase
      .from('training_courses')
      .select('*')
      .order('created_at', { ascending: false });
    const mapped: CourseSyllabus[] = (data || []).map((c: any) => ({
      id: c.id,
      courseName: ar ? c.name_ar : c.name_en,
      provider: c.provider || '',
      courseCode: c.course_code || '',
      editedBy: c.edited_by || '',
      courseDuration: c.course_duration || '',
      courseObjective: c.course_objective || '',
      courseAdministration: c.course_administration || '',
      exercises: c.exercises || '',
      basicTopics: c.basic_topics || '',
      intermediateTopics: c.intermediate_topics || '',
      advancedTopics: c.advanced_topics || '',
      reference: c.reference_material || '',
      examination: c.examination || '',
    }));
    setSyllabi(mapped);
  };

  useEffect(() => { fetchSyllabi(); }, []);

  const filtered = useMemo(() => {
    return syllabi.filter(s => {
      const n = searchName.toLowerCase();
      const c = searchCode.toLowerCase();
      const p = searchProvider.toLowerCase();
      return (!n || s.courseName.toLowerCase().includes(n))
        && (!c || s.courseCode.toLowerCase().includes(c))
        && (!p || s.provider.toLowerCase().includes(p));
    });
  }, [syllabi, searchName, searchCode, searchProvider]);

  // Sync form with filtered list
  useEffect(() => {
    if (isAddMode) return;
    if (filtered.length > 0) {
      const idx = Math.min(currentIndex, filtered.length - 1);
      setCurrentIndex(idx);
      setFormData(filtered[idx]);
    } else {
      setFormData(emptyForm);
    }
  }, [filtered, isAddMode]);

  const handleNew = () => {
    setIsAddMode(true);
    setFormData(emptyForm);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? Math.max(0, currentIndex - 1)
      : Math.min(filtered.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    setFormData(filtered[newIndex]);
    setIsAddMode(false);
  };

  const handleSave = async () => {
    if (!formData.courseName) {
      toast({ title: t('common.error'), description: t('training.fillRequired'), variant: 'destructive' });
      return;
    }

    if (isAddMode) {
      await supabase.from('training_courses').insert({
        name_en: formData.courseName,
        name_ar: formData.courseName,
        provider: formData.provider,
        course_code: formData.courseCode,
        edited_by: formData.editedBy,
        course_duration: formData.courseDuration,
        course_objective: formData.courseObjective,
        course_administration: formData.courseAdministration,
        exercises: formData.exercises,
        basic_topics: formData.basicTopics,
        intermediate_topics: formData.intermediateTopics,
        advanced_topics: formData.advancedTopics,
        reference_material: formData.reference,
        examination: formData.examination,
      } as any);
      toast({ title: t('common.success'), description: t('training.syllabus.added') });
    } else {
      await supabase.from('training_courses').update({
        provider: formData.provider,
        course_code: formData.courseCode,
        edited_by: formData.editedBy,
        course_duration: formData.courseDuration,
        course_objective: formData.courseObjective,
        course_administration: formData.courseAdministration,
        exercises: formData.exercises,
        basic_topics: formData.basicTopics,
        intermediate_topics: formData.intermediateTopics,
        advanced_topics: formData.advancedTopics,
        reference_material: formData.reference,
        examination: formData.examination,
      } as any).eq('id', formData.id);
      toast({ title: t('common.success'), description: t('training.syllabus.updated') });
    }
    setIsAddMode(false);
    fetchSyllabi();
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    await supabase.from('training_courses').delete().eq('id', formData.id);
    toast({ title: t('common.success'), description: t('training.syllabus.deleted') });
    fetchSyllabi();
  };

  const clearFilters = () => {
    setSearchName('');
    setSearchCode('');
    setSearchProvider('');
  };

  const hasFilters = searchName || searchCode || searchProvider;

  return (
    <div dir="rtl">
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>{t('training.syllabus.title')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5"
            >
              <Filter className="h-4 w-4" />
              {ar ? 'بحث' : 'Search'}
              {hasFilters && <span className="bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">{filtered.length}</span>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleNavigate('prev')} disabled={currentIndex === 0 || isAddMode || filtered.length === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleNavigate('next')} disabled={currentIndex >= filtered.length - 1 || isAddMode || filtered.length === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t('common.add')}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={ar ? 'بحث باسم الدورة...' : 'Search by course name...'}
                value={searchName}
                onChange={(e) => { setSearchName(e.target.value); setCurrentIndex(0); }}
                className="pr-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={ar ? 'بحث بكود الدورة...' : 'Search by course code...'}
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value); setCurrentIndex(0); }}
                className="pr-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={ar ? 'بحث بالجهة المقدمة...' : 'Search by provider...'}
                value={searchProvider}
                onChange={(e) => { setSearchProvider(e.target.value); setCurrentIndex(0); }}
                className="pr-9"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 self-center">
                <X className="h-4 w-4" />
                {ar ? 'مسح الفلاتر' : 'Clear'}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <Label>{t('training.courseName')}</Label>
            <Input value={formData.courseName} onChange={(e) => setFormData({ ...formData, courseName: e.target.value })} readOnly={!isAddMode} className={!isAddMode ? 'bg-muted' : ''} />
          </div>
          <div>
            <Label>{t('training.provider')}</Label>
            <Input value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} />
          </div>
          <div>
            <Label>{t('training.syllabus.courseCode')}</Label>
            <Input value={formData.courseCode} onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">{t('training.syllabus.courseInfo')}</h3>
            <div><Label>{t('training.syllabus.duration')}</Label><Input value={formData.courseDuration} onChange={(e) => setFormData({ ...formData, courseDuration: e.target.value })} /></div>
            <div><Label>{t('training.syllabus.objective')}</Label><Textarea value={formData.courseObjective} onChange={(e) => setFormData({ ...formData, courseObjective: e.target.value })} rows={4} /></div>
            <div><Label>{t('training.syllabus.administration')}</Label><Textarea value={formData.courseAdministration} onChange={(e) => setFormData({ ...formData, courseAdministration: e.target.value })} rows={4} /></div>
            <div><Label>{t('training.syllabus.exercises')}</Label><Textarea value={formData.exercises} onChange={(e) => setFormData({ ...formData, exercises: e.target.value })} rows={4} /></div>
            <div><h4 className="text-md font-semibold text-destructive mt-4">{t('training.syllabus.examination')}</h4><Textarea value={formData.examination} onChange={(e) => setFormData({ ...formData, examination: e.target.value })} rows={3} /></div>
          </div>

          <div className="space-y-4">
            <div><h3 className="text-lg font-semibold text-primary">{t('training.syllabus.basicTopics')}</h3><Textarea value={formData.basicTopics} onChange={(e) => setFormData({ ...formData, basicTopics: e.target.value })} rows={8} className="mt-2" /></div>
            <div><h3 className="text-lg font-semibold text-destructive">{t('training.syllabus.intermediateTopics')}</h3><Textarea value={formData.intermediateTopics} onChange={(e) => setFormData({ ...formData, intermediateTopics: e.target.value })} rows={8} className="mt-2" /></div>
          </div>

          <div className="space-y-4">
            <div><h3 className="text-lg font-semibold text-primary">{t('training.syllabus.advancedTopics')}</h3><Textarea value={formData.advancedTopics} onChange={(e) => setFormData({ ...formData, advancedTopics: e.target.value })} rows={8} className="mt-2" /></div>
            <div><h3 className="text-lg font-semibold text-primary">{t('training.syllabus.reference')}</h3><Textarea value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} rows={8} className="mt-2" /></div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {!isAddMode && filtered.length > 0 && `${t('training.trainers.record')} ${currentIndex + 1} ${t('common.of')} ${filtered.length}`}
            {hasFilters && ` (${ar ? 'من أصل' : 'out of'} ${syllabi.length})`}
          </span>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={filtered.length <= 1 || isAddMode}>
              <Trash2 className="h-4 w-4 mr-2" />{t('common.delete')}
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />{t('common.save')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
