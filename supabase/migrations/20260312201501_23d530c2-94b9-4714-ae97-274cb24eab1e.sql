
CREATE TABLE public.asset_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, employee_id)
);

ALTER TABLE public.asset_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_asset_ack" ON public.asset_acknowledgments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hr_asset_ack" ON public.asset_acknowledgments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "emp_asset_ack_select" ON public.asset_acknowledgments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));

CREATE POLICY "emp_asset_ack_insert" ON public.asset_acknowledgments
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));
