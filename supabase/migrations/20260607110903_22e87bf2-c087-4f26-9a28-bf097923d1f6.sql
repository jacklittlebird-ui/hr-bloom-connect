
DROP POLICY IF EXISTS dm_violations_all ON public.violations;
CREATE POLICY dm_violations_all ON public.violations
FOR ALL
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.station_id = get_user_station_id(auth.uid())
      AND e.department_id IN (SELECT get_dm_department_ids(auth.uid()))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.station_id = get_user_station_id(auth.uid())
      AND e.department_id IN (SELECT get_dm_department_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS dm_overtime_requests_select ON public.overtime_requests;
CREATE POLICY dm_overtime_requests_select ON public.overtime_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.station_id = get_user_station_id(auth.uid())
      AND e.department_id IN (SELECT get_dm_department_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS dm_overtime_requests_update ON public.overtime_requests;
CREATE POLICY dm_overtime_requests_update ON public.overtime_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.station_id = get_user_station_id(auth.uid())
      AND e.department_id IN (SELECT get_dm_department_ids(auth.uid()))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.station_id = get_user_station_id(auth.uid())
      AND e.department_id IN (SELECT get_dm_department_ids(auth.uid()))
  )
);
