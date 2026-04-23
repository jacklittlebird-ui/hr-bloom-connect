
-- Multi-station support for station_hr role
-- Mirror the area_manager_stations pattern

CREATE TABLE IF NOT EXISTS public.station_hr_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_id)
);

CREATE INDEX IF NOT EXISTS idx_station_hr_stations_user ON public.station_hr_stations(user_id);
CREATE INDEX IF NOT EXISTS idx_station_hr_stations_station ON public.station_hr_stations(station_id);

ALTER TABLE public.station_hr_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_station_hr_stations"
ON public.station_hr_stations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hr_station_hr_stations"
ON public.station_hr_stations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "own_station_hr_stations"
ON public.station_hr_stations FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Helper: returns all station IDs assigned to a station_hr user (includes the legacy primary station_id on user_roles)
CREATE OR REPLACE FUNCTION public.get_station_hr_station_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT station_id FROM public.station_hr_stations WHERE user_id = _user_id
  UNION
  SELECT station_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'station_hr'::app_role AND station_id IS NOT NULL
$$;

-- Update station_hr RLS policies to use the multi-station list

-- employees
DROP POLICY IF EXISTS "shr_read_employees" ON public.employees;
CREATE POLICY "shr_read_employees"
ON public.employees FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
);

-- attendance_records
DROP POLICY IF EXISTS "shr_attendance_select" ON public.attendance_records;
CREATE POLICY "shr_attendance_select"
ON public.attendance_records FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
  )
);

-- leave_requests
DROP POLICY IF EXISTS "shr_leave_requests_select" ON public.leave_requests;
CREATE POLICY "shr_leave_requests_select"
ON public.leave_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
  )
);

-- missions
DROP POLICY IF EXISTS "shr_missions_select" ON public.missions;
CREATE POLICY "shr_missions_select"
ON public.missions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
  )
);

-- attendance_assignments
DROP POLICY IF EXISTS "shr_attendance_assignments_select" ON public.attendance_assignments;
CREATE POLICY "shr_attendance_assignments_select"
ON public.attendance_assignments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND employee_id IN (
    SELECT id FROM public.employees
    WHERE station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
  )
);
