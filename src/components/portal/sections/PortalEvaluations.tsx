import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PortalReview {
  id: string;
  employeeId: string;
  quarter: string;
  year: string;
  score: number;
  status: string;
  reviewer: string;
  reviewDate: string;
  strengths?: string;
  improvements?: string;
  goals?: string;
}

export const PortalEvaluations = () => {
  const { loading: authLoading, session } = useAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [myReviews, setMyReviews] = useState<PortalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      setMyReviews([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadReviews = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase.rpc('get_my_performance_reviews');

      if (cancelled) return;

      if (fetchError) {
        console.error('Portal evaluations fetch error:', fetchError);
        setError(fetchError.message);
        setMyReviews([]);
      } else {
        setMyReviews((data || []).map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          quarter: String(r.quarter || '').trim().toUpperCase(),
          year: String(r.year || '').trim(),
          score: Number(r.score || 0),
          status: r.status || 'submitted',
          reviewer: '',
          reviewDate: r.review_date || '',
          strengths: r.strengths || undefined,
          improvements: r.improvements || undefined,
          goals: r.goals || undefined,
        })));
      }
      setLoading(false);
    };

    void loadReviews();
    return () => { cancelled = true; };
  }, [authLoading, session?.user]);

  const statusLabel = (status: string) => {
    if (status === 'approved') return ar ? 'معتمد' : 'Approved';
    if (status === 'submitted') return ar ? 'مقدّم' : 'Submitted';
    if (status === 'completed') return ar ? 'مكتمل' : 'Completed';
    return ar ? 'مسودة' : 'Draft';
  };

  const statusColor = (status: string) => {
    if (status === 'approved' || status === 'completed') return 'bg-success/10 text-success border-success';
    if (status === 'submitted') return 'bg-warning/10 text-warning border-warning';
    return 'bg-muted text-muted-foreground border-muted';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ar ? 'تقييماتي' : 'My Evaluations'}</h1>

      {loading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{ar ? 'جاري تحميل التقييمات...' : 'Loading evaluations...'}</CardContent></Card>
      ) : error ? (
        <Card><CardContent className="p-10 text-center text-destructive">{ar ? 'تعذر تحميل التقييمات' : 'Unable to load evaluations'}</CardContent></Card>
      ) : myReviews.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{ar ? 'لا توجد تقييمات' : 'No evaluations'}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {myReviews.map(r => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{r.quarter} {r.year}</h3>
                    <p className="text-sm text-muted-foreground">{ar ? 'التاريخ:' : 'Date:'} {r.reviewDate}</p>
                    {r.strengths && <p className="text-sm mt-2"><span className="font-medium">{ar ? 'نقاط القوة:' : 'Strengths:'}</span> {r.strengths}</p>}
                    {r.improvements && <p className="text-sm"><span className="font-medium">{ar ? 'التحسينات:' : 'Improvements:'}</span> {r.improvements}</p>}
                    {r.goals && <p className="text-sm"><span className="font-medium">{ar ? 'الأهداف:' : 'Goals:'}</span> {r.goals}</p>}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className={cn("w-5 h-5", si < Math.floor(r.score) ? "text-warning fill-warning" : "text-muted")} />
                      ))}
                    </div>
                    <span className="text-xl font-bold">{r.score}/5</span>
                    <Badge variant="outline" className={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};