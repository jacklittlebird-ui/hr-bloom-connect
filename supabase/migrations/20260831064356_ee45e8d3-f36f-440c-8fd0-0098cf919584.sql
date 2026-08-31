-- Helper: all station ids a user is scoped to (any role)
CREATE OR REPLACE FUNCTION public.get_user_scoped_station_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ur.station_id FROM public.user_roles ur
   WHERE ur.user_id = _user_id AND ur.station_id IS NOT NULL
  UNION
  SELECT ams.station_id FROM public.area_manager_stations ams
   WHERE ams.user_id = _user_id
  UNION
  SELECT shs.station_id FROM public.station_hr_stations shs
   WHERE shs.user_id = _user_id
  UNION
  SELECT e.station_id FROM public.employees e
   WHERE e.station_id IS NOT NULL
     AND e.id = public.get_user_employee_id(_user_id)
$$;

-- 1) employees: remove blanket update by training managers
DROP POLICY IF EXISTS training_manager_update_employees ON public.employees;

-- 2) notifications: scope manager inserts to their own stations/departments
CREATE OR REPLACE FUNCTION public.can_manager_notify(_user_id uuid, _employee_id uuid, _station_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t_station uuid;
  t_dept uuid;
BEGIN
  t_station := _station_id;
  t_dept := _department_id;

  IF _employee_id IS NOT NULL THEN
    SELECT COALESCE(t_station, e.station_id), COALESCE(t_dept, e.department_id)
      INTO t_station, t_dept
      FROM public.employees e WHERE e.id = _employee_id;
  END IF;

  -- must target something we can validate
  IF t_station IS NULL AND t_dept IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id, 'department_manager') THEN
    IF t_dept IS NOT NULL
       AND t_dept IN (SELECT public.get_dm_department_ids(_user_id))
       AND (t_station IS NULL OR t_station = public.get_user_station_id(_user_id)) THEN
      RETURN true;
    END IF;
  END IF;

  IF t_station IS NOT NULL AND t_station IN (SELECT public.get_user_scoped_station_ids(_user_id)) THEN
    IF public.has_role(_user_id, 'station_manager')
       OR public.has_role(_user_id, 'area_manager')
       OR public.has_role(_user_id, 'station_hr')
       OR public.has_role(_user_id, 'station_vehicle_manager') THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS managers_can_insert_notifications ON public.notifications;
CREATE POLICY managers_can_insert_notifications
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (
    has_role(auth.uid(), 'station_manager'::app_role)
    OR has_role(auth.uid(), 'area_manager'::app_role)
    OR has_role(auth.uid(), 'department_manager'::app_role)
    OR has_role(auth.uid(), 'station_hr'::app_role)
    OR has_role(auth.uid(), 'station_vehicle_manager'::app_role)
  )
  AND public.can_manager_notify(auth.uid(), employee_id, station_id, department_id)
);

-- 3) qr_locations: restrict GPS coordinates to station-associated users
DROP POLICY IF EXISTS auth_read_qr_locations ON public.qr_locations;
CREATE POLICY auth_read_qr_locations
ON public.qr_locations
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
    OR has_role(auth.uid(), 'kiosk'::app_role)
    OR (station_id IS NOT NULL AND station_id IN (SELECT public.get_user_scoped_station_ids(auth.uid())))
    OR EXISTS (
      SELECT 1 FROM public.qr_location_stations qls
      WHERE qls.location_id = qr_locations.id
        AND qls.station_id IN (SELECT public.get_user_scoped_station_ids(auth.uid()))
    )
  )
);