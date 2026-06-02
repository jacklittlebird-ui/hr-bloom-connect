
CREATE TABLE public.non_recurring_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_code text NOT NULL,
  employee_name text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  bank_id_number text,
  bank_account_number text,
  description text,
  bonus_month text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nrb_batch ON public.non_recurring_bonuses(batch_id);
CREATE INDEX idx_nrb_employee ON public.non_recurring_bonuses(employee_id);
CREATE INDEX idx_nrb_created ON public.non_recurring_bonuses(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.non_recurring_bonuses TO authenticated;
GRANT ALL ON public.non_recurring_bonuses TO service_role;

ALTER TABLE public.non_recurring_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage non_recurring_bonuses"
ON public.non_recurring_bonuses FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Employees view own non_recurring_bonuses"
ON public.non_recurring_bonuses FOR SELECT
TO authenticated
USING (employee_id = public.get_user_employee_id(auth.uid()));
