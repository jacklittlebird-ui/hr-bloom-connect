import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, X, ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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

export const CoursesSyllabus = () => {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const ar = language === 'ar';
  const [syllabi, setSyllabi] = useState<CourseSyllabus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState<CourseSyllabus>({
    id: '', courseName: '', provider: '', courseCode: '', editedBy: '',
    courseDuration: '', courseObjective: '', courseAdministration: '', exercises: '',
    basicTopics: '', intermediateTopics: '', advancedTopics: '', reference: '', examination: '',
  });

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
    if (mapped.length > 0 && !isAddMode) {
      setFormData(mapped[0]);
      setCurrentIndex(0);
    }
  };

  useEffect(() => { fetchSyllabi(); }, []);

  const handleNew = () => {
    setIsAddMode(true);
    setFormData({
      id: '', courseName: '', provider: '', courseCode: '', editedBy: '',
      courseDuration: '', courseObjective: '', courseAdministration: '', exercises: '',
      basicTopics: '', intermediateTopics: '', advancedTopics: '', reference: '', examination: '',
    });
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? Math.max(0, currentIndex - 1)
      : Math.min(syllabi.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    setFormData(syllabi[newIndex]);
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

  return (
    <div dir="rtl">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('training.syllabus.title')}</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('training.syllabus.editedBy')}:</span>
          <Select value={formData.editedBy} onValueChange={(val) => setFormData({ ...formData, editedBy: val })}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Hossam Hagag">Hossam Hagag</SelectItem>
              <SelectItem value="Ahmed Mostafa">Ahmed Mostafa</SelectItem>
              <SelectItem value="Mohamed Ali">Mohamed Ali</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={handleDelete} disabled={syllabi.length <= 1}>
            <X className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleNavigate('prev')} disabled={currentIndex === 0 || isAddMode}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleNavigate('next')} disabled={currentIndex === syllabi.length - 1 || isAddMode}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t('common.add')}
          </Button>
        </div>
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
            {!isAddMode && syllabi.length > 0 && `${t('training.trainers.record')} ${currentIndex + 1} ${t('common.of')} ${syllabi.length}`}
          </span>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={syllabi.length <= 1}>
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
