-- Admin can manage area_manager_stations
CREATE POLICY "admin_area_manager_stations" ON public.area_manager_stations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Area managers can read their own stations
CREATE POLICY "own_area_manager_stations" ON public.area_manager_stations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS: area_manager can SELECT employees in their stations
CREATE POLICY "area_manager_read_employees" ON public.employees
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'area_manager'::app_role) 
    AND station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  );

-- RLS: area_manager can SELECT attendance_records
CREATE POLICY "am_attendance_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
    )
  );

-- RLS: area_manager can manage violations
CREATE POLICY "am_violations_all" ON public.violations
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
    )
  );

-- RLS: area_manager can manage performance_reviews
CREATE POLICY "am_perf_all" ON public.performance_reviews
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
    )
  );

-- RLS: area_manager can read leave_requests
CREATE POLICY "am_leave_requests_select" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
    )
  );
