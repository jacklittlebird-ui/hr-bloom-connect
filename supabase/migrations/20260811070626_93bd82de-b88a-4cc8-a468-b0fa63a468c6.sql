CREATE TABLE public.penalty_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  days numeric NOT NULL DEFAULT 0,
  deduction_month text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, deduction_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.penalty_deductions TO authenticated;
GRANT ALL ON public.penalty_deductions TO service_role;
ALTER TABLE public.penalty_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_penalty_deductions ON public.penalty_deductions FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY hr_penalty_deductions ON public.penalty_deductions FOR ALL TO authenticated USING (has_role(auth.uid(),'hr'::app_role)) WITH CHECK (has_role(auth.uid(),'hr'::app_role));
CREATE POLICY emp_penalty_deductions_select ON public.penalty_deductions FOR SELECT TO authenticated USING (has_role(auth.uid(),'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));
CREATE TRIGGER trg_penalty_deductions_updated BEFORE UPDATE ON public.penalty_deductions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.living_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  allowance_month text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, allowance_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.living_allowances TO authenticated;
GRANT ALL ON public.living_allowances TO service_role;
ALTER TABLE public.living_allowances ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_living_allowances ON public.living_allowances FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY hr_living_allowances ON public.living_allowances FOR ALL TO authenticated USING (has_role(auth.uid(),'hr'::app_role)) WITH CHECK (has_role(auth.uid(),'hr'::app_role));
CREATE POLICY emp_living_allowances_select ON public.living_allowances FOR SELECT TO authenticated USING (has_role(auth.uid(),'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));
CREATE TRIGGER trg_living_allowances_updated BEFORE UPDATE ON public.living_allowances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();