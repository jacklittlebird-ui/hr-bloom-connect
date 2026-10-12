CREATE TABLE public.quality_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  station_id uuid REFERENCES public.stations(id) ON DELETE SET NULL,
  record_type text NOT NULL CHECK (record_type IN ('deduction','gratitude')),
  deduction_days numeric,
  reason text NOT NULL,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quality_records_employee ON public.quality_records(employee_id, record_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_records TO authenticated;
GRANT ALL ON public.quality_records TO service_role;
ALTER TABLE public.quality_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality/admin/hr manage" ON public.quality_records FOR ALL TO authenticated
  USING ((SELECT public.has_role(auth.uid(),'quality')) OR (SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr')))
  WITH CHECK ((SELECT public.has_role(auth.uid(),'quality')) OR (SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr')));
CREATE POLICY "Staff read" ON public.quality_records FOR SELECT TO authenticated
  USING ((SELECT public.is_staff_user(auth.uid())));
CREATE POLICY "Employee reads own" ON public.quality_records FOR SELECT TO authenticated
  USING (employee_id = (SELECT public.get_user_employee_id(auth.uid())));