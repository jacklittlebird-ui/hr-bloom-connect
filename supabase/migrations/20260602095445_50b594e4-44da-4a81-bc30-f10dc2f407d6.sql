ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS social_insurance_closed boolean NOT NULL DEFAULT false;