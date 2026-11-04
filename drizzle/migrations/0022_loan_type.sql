ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS loan_type text NOT NULL DEFAULT 'personal';
UPDATE public.loans SET loan_type = 'insurance' WHERE reason ILIKE '%تأمين%';
ALTER TABLE public.loans ADD CONSTRAINT loans_loan_type_check CHECK (loan_type IN ('personal','insurance'));