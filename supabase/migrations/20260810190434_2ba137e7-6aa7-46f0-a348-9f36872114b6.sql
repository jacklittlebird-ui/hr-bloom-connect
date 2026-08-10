CREATE TABLE public.leave_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  days numeric NOT NULL,
  deduction_month text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, deduction_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_deductions TO authenticated;
GRANT ALL ON public.leave_deductions TO service_role;

ALTER TABLE public.leave_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_leave_deductions ON public.leave_deductions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY hr_leave_deductions ON public.leave_deductions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY emp_leave_deductions_select ON public.leave_deductions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));

CREATE INDEX idx_leave_deductions_month ON public.leave_deductions(deduction_month);