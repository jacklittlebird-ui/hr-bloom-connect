
CREATE OR REPLACE FUNCTION public.get_user_station_id_svm(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT station_id FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'station_vehicle_manager'::app_role
    AND station_id IS NOT NULL
  LIMIT 1
$$;

CREATE POLICY "svm_vehicles_select"
  ON public.vehicles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'station_vehicle_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id = public.get_user_station_id_svm(auth.uid())
  );

CREATE POLICY "svm_vehicles_modify"
  ON public.vehicles FOR ALL
  USING (
    public.has_role(auth.uid(), 'station_vehicle_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id = public.get_user_station_id_svm(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'station_vehicle_manager'::app_role)
    AND station_id IS NOT NULL
    AND station_id = public.get_user_station_id_svm(auth.uid())
  );

CREATE POLICY "svm_vehicle_maintenance_select"
  ON public.vehicle_maintenance FOR SELECT
  USING (
    public.has_role(auth.uid(), 'station_vehicle_manager'::app_role)
    AND vehicle_id IN (
      SELECT id FROM public.vehicles
      WHERE station_id = public.get_user_station_id_svm(auth.uid())
    )
  );

CREATE POLICY "svm_vehicle_maintenance_modify"
  ON public.vehicle_maintenance FOR ALL
  USING (
    public.has_role(auth.uid(), 'station_vehicle_manager'::app_role)
    AND vehicle_id IN (
      SELECT id FROM public.vehicles
      WHERE station_id = public.get_user_station_id_svm(auth.uid())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'station_vehicle_manager'::app_role)
    AND vehicle_id IN (
      SELECT id FROM public.vehicles
      WHERE station_id = public.get_user_station_id_svm(auth.uid())
    )
  );

CREATE POLICY "svm_stations_select"
  ON public.stations FOR SELECT
  USING (public.has_role(auth.uid(), 'station_vehicle_manager'::app_role));
