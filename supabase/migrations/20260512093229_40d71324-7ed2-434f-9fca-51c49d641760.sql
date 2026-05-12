CREATE POLICY "dm_permission_requests_select" ON public.permission_requests FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'department_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
  )
);

CREATE POLICY "dm_permission_requests_update" ON public.permission_requests FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'department_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
  )
) WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
  )
);

CREATE POLICY "shr_permission_requests_select" ON public.permission_requests FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'station_hr'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_station_hr_station_ids(auth.uid()))
  )
);