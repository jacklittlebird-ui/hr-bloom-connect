-- Add RLS policies for department_manager role across all relevant tables.
-- Department managers see employees in BOTH their assigned station AND department.

-- Employees
CREATE POLICY "dm_read_employees"
ON public.employees FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND station_id = get_user_station_id(auth.uid())
  AND department_id = get_user_department_id(auth.uid())
);

-- Attendance records
CREATE POLICY "dm_attendance_select"
ON public.attendance_records FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

CREATE POLICY "dm_attendance_insert"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

-- Leave requests
CREATE POLICY "dm_leave_requests_select"
ON public.leave_requests FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

CREATE POLICY "dm_leave_requests_update"
ON public.leave_requests FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

-- Missions
CREATE POLICY "dm_missions_select"
ON public.missions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

CREATE POLICY "dm_missions_update"
ON public.missions FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

-- Overtime requests
CREATE POLICY "dm_overtime_requests_select"
ON public.overtime_requests FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

CREATE POLICY "dm_overtime_requests_update"
ON public.overtime_requests FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

-- Performance reviews
CREATE POLICY "dm_perf_all"
ON public.performance_reviews FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

-- Violations
CREATE POLICY "dm_violations_all"
ON public.violations FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);

-- Attendance assignments (read-only for shifts/rules visibility)
CREATE POLICY "dm_attendance_assignments_select"
ON public.attendance_assignments FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'department_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id = get_user_station_id(auth.uid())
      AND department_id = get_user_department_id(auth.uid())
  )
);