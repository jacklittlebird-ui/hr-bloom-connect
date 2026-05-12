ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_loans_archived ON public.loans(archived);