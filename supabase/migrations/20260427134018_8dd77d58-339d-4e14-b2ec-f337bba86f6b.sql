-- HR full access
CREATE POLICY "hr_violations_all" ON public.violations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- Station HR scoped to assigned stations
CREATE POLICY "shr_violations_all" ON public.violations
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'station_hr'::app_role)
    AND employee_id IN (
      SELECT id FROM public.employees
      WHERE station_id IN (SELECT get_station_hr_station_ids(auth.uid()))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'station_hr'::app_role)
    AND employee_id IN (
      SELECT id FROM public.employees
      WHERE station_id IN (SELECT get_station_hr_station_ids(auth.uid()))
    )
  );