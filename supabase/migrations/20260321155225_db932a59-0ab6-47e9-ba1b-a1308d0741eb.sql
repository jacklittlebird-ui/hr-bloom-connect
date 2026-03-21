
-- Station managers can view and update leave requests for their station employees
CREATE POLICY "sm_leave_requests_select" ON public.leave_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ));

CREATE POLICY "sm_leave_requests_update" ON public.leave_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ))
  WITH CHECK (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ));

-- Area managers can update leave requests for their stations' employees
CREATE POLICY "am_leave_requests_update" ON public.leave_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'area_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  ))
  WITH CHECK (has_role(auth.uid(), 'area_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  ));

-- Station managers can view and update permission requests for their station employees
CREATE POLICY "sm_permission_requests_select" ON public.permission_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ));

CREATE POLICY "sm_permission_requests_update" ON public.permission_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ))
  WITH CHECK (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ));

-- Area managers can view and update permission requests
CREATE POLICY "am_permission_requests_select" ON public.permission_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'area_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  ));

CREATE POLICY "am_permission_requests_update" ON public.permission_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'area_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  ))
  WITH CHECK (has_role(auth.uid(), 'area_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  ));

-- Station managers can view and update overtime requests for their station employees
CREATE POLICY "sm_overtime_requests_select" ON public.overtime_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ));

CREATE POLICY "sm_overtime_requests_update" ON public.overtime_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ))
  WITH CHECK (has_role(auth.uid(), 'station_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  ));

-- Area managers can view and update overtime requests
CREATE POLICY "am_overtime_requests_select" ON public.overtime_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'area_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  ));

CREATE POLICY "am_overtime_requests_update" ON public.overtime_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'area_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  ))
  WITH CHECK (has_role(auth.uid(), 'area_manager'::app_role) AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  ));
