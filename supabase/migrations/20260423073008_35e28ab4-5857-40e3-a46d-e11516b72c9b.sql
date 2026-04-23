-- Station HR role: READ-ONLY mirror of station_manager (no approvals, no evaluations writes)

-- Employees: read employees of their station
CREATE POLICY "shr_read_employees" ON public.employees
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND station_id = get_user_station_id(auth.uid())
);

-- Attendance records: read station's
CREATE POLICY "shr_attendance_select" ON public.attendance_records
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees WHERE station_id = get_user_station_id(auth.uid())
  )
);

-- Attendance assignments: read
CREATE POLICY "shr_attendance_assignments_select" ON public.attendance_assignments
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees WHERE station_id = get_user_station_id(auth.uid())
  )
);

-- Leave requests: read only (no update => no approvals)
CREATE POLICY "shr_leave_requests_select" ON public.leave_requests
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees WHERE station_id = get_user_station_id(auth.uid())
  )
);

-- Missions: read only
CREATE POLICY "shr_missions_select" ON public.missions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees WHERE station_id = get_user_station_id(auth.uid())
  )
);