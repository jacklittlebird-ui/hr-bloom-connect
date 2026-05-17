
-- Allow station_manager, area_manager, station_hr to view and add (but not edit/delete)
-- maintenance records for vehicles in their scope.

CREATE POLICY sm_vehicle_maintenance_select ON public.vehicle_maintenance
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_manager'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE station_id = get_user_station_id(auth.uid())
  )
);

CREATE POLICY sm_vehicle_maintenance_insert ON public.vehicle_maintenance
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'station_manager'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE station_id = get_user_station_id(auth.uid())
  )
);

CREATE POLICY am_vehicle_maintenance_select ON public.vehicle_maintenance
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'area_manager'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  )
);

CREATE POLICY am_vehicle_maintenance_insert ON public.vehicle_maintenance
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'area_manager'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE station_id IN (SELECT get_area_manager_station_ids(auth.uid()))
  )
);

CREATE POLICY shr_vehicle_maintenance_select ON public.vehicle_maintenance
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE station_id IN (SELECT get_station_hr_station_ids(auth.uid()))
  )
);

CREATE POLICY shr_vehicle_maintenance_insert ON public.vehicle_maintenance
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE station_id IN (SELECT get_station_hr_station_ids(auth.uid()))
  )
);
