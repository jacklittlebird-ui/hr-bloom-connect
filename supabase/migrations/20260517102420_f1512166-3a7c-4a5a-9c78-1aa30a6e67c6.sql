
-- Station manager: scoped to their single station
CREATE POLICY station_manager_vehicles_select ON public.vehicles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'station_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id = public.get_user_station_id(auth.uid())
  );

CREATE POLICY station_manager_vehicles_modify ON public.vehicles
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'station_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id = public.get_user_station_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'station_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id = public.get_user_station_id(auth.uid())
  );

-- Area manager: scoped to area_manager_stations
CREATE POLICY area_manager_vehicles_select ON public.vehicles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id IN (SELECT public.get_area_manager_station_ids(auth.uid()))
  );

CREATE POLICY area_manager_vehicles_modify ON public.vehicles
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id IN (SELECT public.get_area_manager_station_ids(auth.uid()))
  )
  WITH CHECK (
    has_role(auth.uid(), 'area_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id IN (SELECT public.get_area_manager_station_ids(auth.uid()))
  );

-- Station HR: scoped to station_hr_stations
CREATE POLICY station_hr_vehicles_select ON public.vehicles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'station_hr'::app_role)
    AND station_id IS NOT NULL
    AND station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
  );

CREATE POLICY station_hr_vehicles_modify ON public.vehicles
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'station_hr'::app_role)
    AND station_id IS NOT NULL
    AND station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
  )
  WITH CHECK (
    has_role(auth.uid(), 'station_hr'::app_role)
    AND station_id IS NOT NULL
    AND station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
  );
