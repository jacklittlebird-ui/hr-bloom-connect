
-- Allow station managers, area managers, and station HR to update vehicle_maintenance records
-- limited to vehicles in their allowed stations.

CREATE POLICY sm_vehicle_maintenance_update
ON public.vehicle_maintenance
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'station_manager'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles WHERE station_id = get_user_station_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'station_manager'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles WHERE station_id = get_user_station_id(auth.uid())
  )
);

CREATE POLICY am_vehicle_maintenance_update
ON public.vehicle_maintenance
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'area_manager'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles WHERE station_id IN (
      SELECT get_area_manager_station_ids(auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'area_manager'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles WHERE station_id IN (
      SELECT get_area_manager_station_ids(auth.uid())
    )
  )
);

CREATE POLICY shr_vehicle_maintenance_update
ON public.vehicle_maintenance
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles WHERE station_id IN (
      SELECT get_station_hr_station_ids(auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'station_hr'::app_role)
  AND vehicle_id IN (
    SELECT id FROM public.vehicles WHERE station_id IN (
      SELECT get_station_hr_station_ids(auth.uid())
    )
  )
);
