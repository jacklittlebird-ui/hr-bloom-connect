DROP POLICY IF EXISTS dm_perf_all ON public.performance_reviews;

CREATE POLICY dm_perf_all ON public.performance_reviews
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND (employee_id IN (
      SELECT employees.id FROM employees
      WHERE employees.station_id = get_user_station_id(auth.uid())
        AND employees.department_id IN (SELECT get_dm_department_ids(auth.uid()))
    ))
  )
  WITH CHECK (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND (employee_id IN (
      SELECT employees.id FROM employees
      WHERE employees.station_id = get_user_station_id(auth.uid())
        AND employees.department_id IN (SELECT get_dm_department_ids(auth.uid()))
    ))
  );