CREATE TABLE public.extra_days_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  employee_name text,
  days numeric NOT NULL,
  net_salary numeric NOT NULL,
  daily_rate numeric NOT NULL,
  amount numeric NOT NULL,
  bank_id_number text,
  bank_account_number text,
  allowance_month text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extra_days_allowances TO authenticated;
GRANT ALL ON public.extra_days_allowances TO service_role;
ALTER TABLE public.extra_days_allowances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage extra_days_allowances" ON public.extra_days_allowances FOR ALL TO authenticated
USING ((SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr')))
WITH CHECK ((SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr')));
CREATE POLICY "Employees view own extra_days_allowances" ON public.extra_days_allowances FOR SELECT TO authenticated
USING ((SELECT public.has_role(auth.uid(),'employee')) AND employee_id = (SELECT public.get_user_employee_id(auth.uid())));
CREATE INDEX idx_extra_days_batch ON public.extra_days_allowances(batch_id);