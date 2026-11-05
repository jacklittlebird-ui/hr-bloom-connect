ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS nbe_account_number text,
  ADD COLUMN IF NOT EXISTS credit_account_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nbe_account_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS salary_bank text NOT NULL DEFAULT 'credit_agricole';
UPDATE public.employees SET salary_bank = 'cash' WHERE bank_name = 'cash' OR bank_name IS NULL;
ALTER TABLE public.employees ADD CONSTRAINT employees_salary_bank_chk CHECK (salary_bank IN ('credit_agricole','nbe','cash'));
ALTER TABLE public.employees ADD CONSTRAINT employees_nbe_account_chk CHECK (nbe_account_number IS NULL OR nbe_account_number ~ '^[0-9]{19}$');