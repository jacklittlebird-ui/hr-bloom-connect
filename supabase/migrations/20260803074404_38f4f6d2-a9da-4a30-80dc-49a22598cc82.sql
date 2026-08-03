-- attendance_records
DROP POLICY IF EXISTS admin_attendance ON public.attendance_records;
CREATE POLICY admin_attendance ON public.attendance_records FOR ALL TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS hr_attendance_records ON public.attendance_records;
CREATE POLICY hr_attendance_records ON public.attendance_records FOR ALL TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'hr'::app_role)))
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'hr'::app_role)));

DROP POLICY IF EXISTS am_attendance_select ON public.attendance_records;
CREATE POLICY am_attendance_select ON public.attendance_records FOR SELECT TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'area_manager'::app_role))
  AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.station_id IN (SELECT public.get_area_manager_station_ids((SELECT auth.uid())))));

DROP POLICY IF EXISTS shr_attendance_select ON public.attendance_records;
CREATE POLICY shr_attendance_select ON public.attendance_records FOR SELECT TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'station_hr'::app_role))
  AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.station_id IN (SELECT public.get_station_hr_station_ids((SELECT auth.uid())))));

DROP POLICY IF EXISTS sm_attendance_select ON public.attendance_records;
CREATE POLICY sm_attendance_select ON public.attendance_records FOR SELECT TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'station_manager'::app_role))
  AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.station_id = (SELECT public.get_user_station_id((SELECT auth.uid())))));

DROP POLICY IF EXISTS dm_attendance_select ON public.attendance_records;
CREATE POLICY dm_attendance_select ON public.attendance_records FOR SELECT TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'department_manager'::app_role))
  AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.station_id = (SELECT public.get_user_station_id((SELECT auth.uid()))) AND e.department_id IN (SELECT public.get_dm_department_ids((SELECT auth.uid())))));

DROP POLICY IF EXISTS emp_attendance ON public.attendance_records;
CREATE POLICY emp_attendance ON public.attendance_records FOR SELECT TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'employee'::app_role))
  AND employee_id = (SELECT public.get_user_employee_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS emp_attendance_update ON public.attendance_records;
CREATE POLICY emp_attendance_update ON public.attendance_records FOR UPDATE TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'employee'::app_role)) AND employee_id = (SELECT public.get_user_employee_id((SELECT auth.uid()))))
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'employee'::app_role)) AND employee_id = (SELECT public.get_user_employee_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS emp_attendance_insert ON public.attendance_records;
CREATE POLICY emp_attendance_insert ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'employee'::app_role)) AND employee_id = (SELECT public.get_user_employee_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS sm_attendance_insert ON public.attendance_records;
CREATE POLICY sm_attendance_insert ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'station_manager'::app_role))
  AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.station_id = (SELECT public.get_user_station_id((SELECT auth.uid())))));

DROP POLICY IF EXISTS dm_attendance_insert ON public.attendance_records;
CREATE POLICY dm_attendance_insert ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'department_manager'::app_role))
  AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.station_id = (SELECT public.get_user_station_id((SELECT auth.uid()))) AND e.department_id IN (SELECT public.get_dm_department_ids((SELECT auth.uid())))));

-- attendance_events
DROP POLICY IF EXISTS admin_read_all_attendance_events ON public.attendance_events;
CREATE POLICY admin_read_all_attendance_events ON public.attendance_events FOR ALL TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS hr_attendance_events ON public.attendance_events;
CREATE POLICY hr_attendance_events ON public.attendance_events FOR ALL TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'hr'::app_role)))
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'hr'::app_role)));

DROP POLICY IF EXISTS read_own_attendance_events ON public.attendance_events;
CREATE POLICY read_own_attendance_events ON public.attendance_events FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS scoped_read_attendance_events ON public.attendance_events;
CREATE POLICY scoped_read_attendance_events ON public.attendance_events FOR SELECT TO authenticated
USING (
  (SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role))
  OR (SELECT public.has_role((SELECT auth.uid()), 'hr'::app_role))
  OR user_id = (SELECT auth.uid())
  OR employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE ((SELECT public.has_role((SELECT auth.uid()), 'station_manager'::app_role)) AND e.station_id = (SELECT public.get_user_station_id((SELECT auth.uid()))))
       OR ((SELECT public.has_role((SELECT auth.uid()), 'area_manager'::app_role)) AND e.station_id IN (SELECT public.get_area_manager_station_ids((SELECT auth.uid()))))
       OR ((SELECT public.has_role((SELECT auth.uid()), 'station_hr'::app_role)) AND e.station_id IN (SELECT public.get_station_hr_station_ids((SELECT auth.uid()))))
       OR ((SELECT public.has_role((SELECT auth.uid()), 'department_manager'::app_role)) AND e.department_id IN (SELECT public.get_dm_department_ids((SELECT auth.uid()))))
  )
);

CREATE INDEX IF NOT EXISTS idx_attendance_events_scan_time ON public.attendance_events (scan_time DESC);
CREATE INDEX IF NOT EXISTS idx_employees_station ON public.employees (station_id);
CREATE INDEX IF NOT EXISTS idx_employees_station_dept ON public.employees (station_id, department_id);
