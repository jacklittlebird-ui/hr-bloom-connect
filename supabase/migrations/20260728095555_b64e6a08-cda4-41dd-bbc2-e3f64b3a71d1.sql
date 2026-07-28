
CREATE POLICY "scoped_read_attendance_events" ON public.attendance_events
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'hr'::app_role)
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = attendance_events.employee_id
      AND (
        (has_role(auth.uid(), 'station_manager'::app_role) AND e.station_id = get_user_station_id(auth.uid()))
        OR (has_role(auth.uid(), 'area_manager'::app_role) AND e.station_id IN (SELECT get_area_manager_station_ids(auth.uid())))
        OR (has_role(auth.uid(), 'station_hr'::app_role) AND e.station_id IN (SELECT get_station_hr_station_ids(auth.uid())))
        OR (has_role(auth.uid(), 'department_manager'::app_role) AND e.department_id IN (SELECT get_dm_department_ids(auth.uid())))
      )
  )
);
