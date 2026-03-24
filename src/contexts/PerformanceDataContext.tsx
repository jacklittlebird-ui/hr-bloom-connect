import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CriteriaItem {
  name: string;
  nameEn: string;
  score: number;
  weight: number;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  station: string;
  quarter: string;
  year: string;
  score: number;
  status: 'draft' | 'submitted' | 'approved';
  reviewer: string;
  reviewDate: string;
  strengths?: string;
  improvements?: string;
  goals?: string;
  managerComments?: string;
  criteria?: CriteriaItem[];
}

export const defaultCriteria: CriteriaItem[] = [
  { name: 'جودة العمل', nameEn: 'Work Quality', score: 3, weight: 25 },
  { name: 'الإنتاجية', nameEn: 'Productivity', score: 3, weight: 20 },
  { name: 'العمل الجماعي', nameEn: 'Teamwork', score: 3, weight: 20 },
  { name: 'التواصل', nameEn: 'Communication', score: 3, weight: 15 },
  { name: 'المبادرة', nameEn: 'Initiative', score: 3, weight: 10 },
  { name: 'الحضور والالتزام', nameEn: 'Attendance', score: 3, weight: 10 },
];

export const calculateScore = (criteria: CriteriaItem[]) => {
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  const weightedSum = criteria.reduce((s, c) => s + (c.score * c.weight), 0);
  return parseFloat((weightedSum / totalWeight).toFixed(2));
};

interface PerformanceDataContextType {
  reviews: PerformanceReview[];
  addReview: (review: Omit<PerformanceReview, 'id'>) => void;
  updateReview: (id: string, updates: Partial<PerformanceReview>) => void;
  deleteReview: (id: string) => void;
}

const PerformanceDataContext = createContext<PerformanceDataContextType | undefined>(undefined);

const mapRow = (r: any): PerformanceReview => ({
  id: r.id,
  employeeId: r.employee_id,
  employeeName: (r.employees as any)?.name_ar || '',
  department: '',
  station: '',
  quarter: r.quarter,
  year: r.year,
  score: r.score ?? 0,
  status: r.status as PerformanceReview['status'],
  reviewer: r.reviewer_id || '',
  reviewDate: r.review_date || '',
  strengths: r.strengths || undefined,
  improvements: r.improvements || undefined,
  goals: r.goals || undefined,
  managerComments: r.manager_comments || undefined,
  criteria: r.criteria ? (r.criteria as CriteriaItem[]) : undefined,
});

export const PerformanceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('performance_reviews')
      .select('*, employees(name_ar)')
      .order('created_at', { ascending: false });
    if (data) setReviews(data.map(mapRow));
  }, []);

  useEffect(() => {
    fetchReviews();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') fetchReviews();
    });
    return () => subscription.unsubscribe();
  }, [fetchReviews]);

  const addReview = useCallback(async (review: Omit<PerformanceReview, 'id'>) => {
    const { error } = await supabase.from('performance_reviews').insert({
      employee_id: review.employeeId,
      quarter: review.quarter,
      year: review.year,
      score: review.score,
      status: review.status,
      reviewer_id: review.reviewer || null,
      review_date: review.reviewDate || null,
      strengths: review.strengths || null,
      improvements: review.improvements || null,
      goals: review.goals || null,
      manager_comments: review.managerComments || null,
      criteria: review.criteria ? JSON.parse(JSON.stringify(review.criteria)) : null,
    });
    if (error) { console.error('addReview error:', error); throw error; }
    await fetchReviews();
  }, [fetchReviews]);

  const updateReview = useCallback(async (id: string, updates: Partial<PerformanceReview>) => {
    const payload: any = {};
    if (updates.quarter !== undefined) payload.quarter = updates.quarter;
    if (updates.year !== undefined) payload.year = updates.year;
    if (updates.score !== undefined) payload.score = updates.score;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.reviewer !== undefined) payload.reviewer_id = updates.reviewer || null;
    if (updates.reviewDate !== undefined) payload.review_date = updates.reviewDate;
    if (updates.strengths !== undefined) payload.strengths = updates.strengths;
    if (updates.improvements !== undefined) payload.improvements = updates.improvements;
    if (updates.goals !== undefined) payload.goals = updates.goals;
    if (updates.managerComments !== undefined) payload.manager_comments = updates.managerComments;
    if (updates.criteria !== undefined) payload.criteria = JSON.parse(JSON.stringify(updates.criteria));
    if (updates.employeeId !== undefined) payload.employee_id = updates.employeeId;

    const { error } = await supabase.from('performance_reviews').update(payload).eq('id', id);
    if (error) { console.error('updateReview error:', error); throw error; }
    await fetchReviews();
  }, [fetchReviews]);

  const deleteReview = useCallback(async (id: string) => {
    await supabase.from('performance_reviews').delete().eq('id', id);
    await fetchReviews();
  }, [fetchReviews]);

  return (
    <PerformanceDataContext.Provider value={{ reviews, addReview, updateReview, deleteReview }}>
      {children}
    </PerformanceDataContext.Provider>
  );
};

export const usePerformanceData = () => {
  const ctx = useContext(PerformanceDataContext);
  if (!ctx) throw new Error('usePerformanceData must be used within PerformanceDataProvider');
  return ctx;
};
