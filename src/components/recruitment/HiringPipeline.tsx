import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecruitmentData } from '@/contexts/RecruitmentDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, User, Briefcase, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const stages = ['new', 'screening', 'interview', 'offer', 'hired'] as const;

export const HiringPipeline = () => {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { candidates, setCandidates } = useRecruitmentData();

  const stageLabels: Record<string, string> = {
    new: t('recruitment.candidateStatus.new'),
    screening: t('recruitment.candidateStatus.screening'),
    interview: t('recruitment.candidateStatus.interview'),
    offer: t('recruitment.candidateStatus.offer'),
    hired: t('recruitment.candidateStatus.hired'),
  };

  const stageColors: Record<string, string> = {
    new: 'border-t-blue-500',
    screening: 'border-t-purple-500',
    interview: 'border-t-amber-500',
    offer: 'border-t-orange-500',
    hired: 'border-t-green-500',
  };

  const stageBgColors: Record<string, string> = {
    new: 'bg-blue-50 dark:bg-blue-950/30',
    screening: 'bg-purple-50 dark:bg-purple-950/30',
    interview: 'bg-amber-50 dark:bg-amber-950/30',
    offer: 'bg-orange-50 dark:bg-orange-950/30',
    hired: 'bg-green-50 dark:bg-green-950/30',
  };

  // Filter out rejected candidates for pipeline
  const pipelineCandidates = candidates.filter(c => c.status !== 'rejected');

  const moveCandidate = (candidateId: string, direction: 'forward' | 'backward') => {
    setCandidates(prev => prev.map(c => {
      if (c.id !== candidateId) return c;
      const currentIndex = stages.indexOf(c.status as any);
      if (currentIndex === -1) return c;
      const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex < 0 || newIndex >= stages.length) return c;
      return { ...c, status: stages[newIndex] };
    }));
    toast({ title: t('recruitment.success'), description: t('recruitment.candidateMoved') });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg">{t('recruitment.pipeline.title')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? `إجمالي المرشحين: ${pipelineCandidates.length}` : `Total candidates: ${pipelineCandidates.length}`}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stages.map(stage => {
          const stageCandidates = pipelineCandidates.filter(c => c.status === stage);
          return (
            <div key={stage} className="space-y-3">
              <Card className={cn("border-t-4", stageColors[stage])}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">{stageLabels[stage]}</h4>
                    <Badge variant="secondary" className="text-xs">{stageCandidates.length}</Badge>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2 min-h-[200px]">
                {stageCandidates.map(candidate => (
                  <Card key={candidate.id} className={cn("hover:shadow-md transition-shadow", stageBgColors[stage])}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <p className="font-medium text-sm truncate">{isRTL ? candidate.nameAr : candidate.nameEn || candidate.nameAr}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Briefcase className="w-3 h-3" />
                          <span className="truncate">{candidate.appliedPosition}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{candidate.department}</p>
                        <div className={cn("flex gap-1 justify-end", isRTL && "flex-row-reverse")}>
                          {stage !== 'new' && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCandidate(candidate.id, 'backward')}>
                              {isRTL ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                            </Button>
                          )}
                          {stage !== 'hired' && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCandidate(candidate.id, 'forward')}>
                              {isRTL ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>{t('recruitment.pipeline.summary')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {stages.map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <div className={cn("px-4 py-2 rounded-lg text-center", stageBgColors[stage])}>
                  <p className="text-xl font-bold">{pipelineCandidates.filter(c => c.status === stage).length}</p>
                  <p className="text-xs text-muted-foreground">{stageLabels[stage]}</p>
                </div>
                {i < stages.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
