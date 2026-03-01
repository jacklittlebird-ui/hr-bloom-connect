import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface JobOpening {
  id: string;
  titleAr: string;
  titleEn: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract';
  status: 'open' | 'closed' | 'on-hold';
  vacancies: number;
  applicants: number;
  postedDate: string;
  closingDate: string;
  description: string;
}

export interface Candidate {
  id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  phone: string;
  appliedPosition: string;
  department: string;
  experience: number;
  education: string;
  status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  appliedDate: string;
  notes: string;
  source: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  position: string;
  department: string;
  interviewDate: string;
  interviewTime: string;
  interviewType: 'phone' | 'video' | 'in-person' | 'technical';
  interviewer: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  rating?: number;
  feedback?: string;
  location: string;
}

interface RecruitmentContextType {
  jobOpenings: JobOpening[];
  setJobOpenings: React.Dispatch<React.SetStateAction<JobOpening[]>>;
  candidates: Candidate[];
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
  interviews: Interview[];
  setInterviews: React.Dispatch<React.SetStateAction<Interview[]>>;
}

const RecruitmentContext = createContext<RecruitmentContextType | null>(null);

export const useRecruitmentData = () => {
  const ctx = useContext(RecruitmentContext);
  if (!ctx) throw new Error('useRecruitmentData must be used within RecruitmentDataProvider');
  return ctx;
};

export const RecruitmentDataProvider = ({ children }: { children: ReactNode }) => {
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);

  return (
    <RecruitmentContext.Provider value={{ jobOpenings, setJobOpenings, candidates, setCandidates, interviews, setInterviews }}>
      {children}
    </RecruitmentContext.Provider>
  );
};
