CREATE TABLE public.gps_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  employee_id uuid,
  event_type text NOT NULL,
  expected_recorded_at timestamptz,
  found_recorded_at timestamptz,
  matched_record_date date,
  outcome text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gps_verif_employee_created ON public.gps_verification_logs(employee_id, created_at DESC);
CREATE INDEX idx_gps_verif_outcome ON public.gps_verification_logs(outcome, created_at DESC);

ALTER TABLE public.gps_verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_gps_verif ON public.gps_verification_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY hr_gps_verif ON public.gps_verification_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY emp_gps_verif_select ON public.gps_verification_logs
  FOR SELECT TO authenticated
  USING (employee_id = get_user_employee_id(auth.uid()));

CREATE POLICY any_gps_verif_insert ON public.gps_verification_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());