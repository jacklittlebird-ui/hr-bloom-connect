
-- Station HR full management of uniforms in their stations
CREATE POLICY "shr_uniforms_all" ON public.uniforms
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM employees
    WHERE station_id IN (SELECT get_station_hr_station_ids(auth.uid()))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM employees
    WHERE station_id IN (SELECT get_station_hr_station_ids(auth.uid()))
  )
);

-- Station manager: read-only for own station
CREATE POLICY "sm_uniforms_select" ON public.uniforms
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  )
);

-- Area manager: read-only across assigned stations
CREATE POLICY "am_uniforms_select" ON public.uniforms
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'area_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM employees
    WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  )
);

-- HR full access (if not already)
CREATE POLICY "hr_uniforms_all" ON public.uniforms
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));
