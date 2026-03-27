
-- Station manager: SELECT missions for their station employees
CREATE POLICY "sm_missions_select" ON public.missions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'station_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  )
);

-- Station manager: UPDATE missions for their station employees
CREATE POLICY "sm_missions_update" ON public.missions
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'station_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'station_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())
  )
);

-- Area manager: SELECT missions for their station employees
CREATE POLICY "am_missions_select" ON public.missions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'area_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (
      SELECT get_area_manager_station_ids(auth.uid())
    )
  )
);

-- Area manager: UPDATE missions for their station employees
CREATE POLICY "am_missions_update" ON public.missions
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'area_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (
      SELECT get_area_manager_station_ids(auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'area_manager'::app_role)
  AND employee_id IN (
    SELECT id FROM employees WHERE station_id IN (
      SELECT get_area_manager_station_ids(auth.uid())
    )
  )
);
