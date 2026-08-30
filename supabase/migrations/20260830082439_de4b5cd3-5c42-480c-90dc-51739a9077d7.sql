ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Existing historical payroll stays visible to employees
UPDATE public.payroll_entries SET is_published = true, published_at = now() WHERE is_published = false;

DROP POLICY IF EXISTS "emp_payroll" ON public.payroll_entries;
CREATE POLICY "emp_payroll" ON public.payroll_entries
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()) AND is_published = true);

CREATE INDEX IF NOT EXISTS idx_payroll_published ON public.payroll_entries (year, month, is_published);