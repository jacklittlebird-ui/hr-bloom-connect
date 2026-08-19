CREATE POLICY shr_leave_requests_insert ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.station_id IN (SELECT get_station_hr_station_ids(auth.uid()))
  )
);