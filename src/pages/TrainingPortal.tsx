import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainingRecords } from '@/components/training/TrainingRecords';
import { Trainers } from '@/components/training/Trainers';
import { CoursesSyllabus } from '@/components/training/CoursesSyllabus';
import { CoursesList } from '@/components/training/CoursesList';
import { TrainingPlan } from '@/components/training/TrainingPlan';
import { TrainingRecordsReport } from '@/components/training/TrainingRecordsReport';
import { TrainingStatsCards } from '@/components/training/TrainingStatsCards';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { GraduationCap, LogOut, BookOpen, Users, FileText, Calendar, BarChart3, Library } from 'lucide-react';

const TrainingPortal = () => {
  const { language } = useLanguage();
  const { logout, user } = useAuth();
  const ar = language === 'ar';

  return (
    <div dir="rtl" className="min-h-screen bg-background font-arabic">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center justify-between px-4 md:px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">{ar ? 'بوابة التدريب' : 'Training Portal'}</h1>
              <p className="text-xs text-muted-foreground">{user?.name || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown variant="portal" />
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-destructive hover:text-destructive">
              <LogOut className="w-4 h-4" />
              {ar ? 'خروج' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 md:p-6 max-w-[1400px] mx-auto">
        <TrainingStatsCards />
        <Tabs defaultValue="records" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1" dir="rtl">
            <TabsTrigger value="records" className="gap-1.5 text-xs md:text-sm">
              <BookOpen className="w-4 h-4" />
              {ar ? 'السجلات' : 'Records'}
            </TabsTrigger>
            <TabsTrigger value="trainers" className="gap-1.5 text-xs md:text-sm">
              <Users className="w-4 h-4" />
              {ar ? 'المدربين' : 'Trainers'}
            </TabsTrigger>
            <TabsTrigger value="syllabus" className="gap-1.5 text-xs md:text-sm">
              <FileText className="w-4 h-4" />
              {ar ? 'المناهج' : 'Syllabus'}
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5 text-xs md:text-sm">
              <Library className="w-4 h-4" />
              {ar ? 'الدورات' : 'Courses'}
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-1.5 text-xs md:text-sm">
              <Calendar className="w-4 h-4" />
              {ar ? 'الخطة' : 'Plan'}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs md:text-sm">
              <BarChart3 className="w-4 h-4" />
              {ar ? 'التقارير' : 'Reports'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="mt-6"><TrainingRecords /></TabsContent>
          <TabsContent value="trainers" className="mt-6"><Trainers /></TabsContent>
          <TabsContent value="syllabus" className="mt-6"><CoursesSyllabus /></TabsContent>
          <TabsContent value="courses" className="mt-6"><CoursesList /></TabsContent>
          <TabsContent value="plan" className="mt-6"><TrainingPlan /></TabsContent>
          <TabsContent value="reports" className="mt-6"><TrainingRecordsReport /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TrainingPortal;
