-- Optimize RLS on employees: wrap auth/role checks in (SELECT ...) so they
-- are evaluated once per query (InitPlan) instead of once per row. This fixes
-- statement timeouts for roles like training_manager that scan all employees.

DROP POLICY IF EXISTS "Admins manage employees" ON public.employees;
DROP POLICY IF EXISTS "Employees read own record" ON public.employees;
DROP POLICY IF EXISTS "Station managers read own station employees" ON public.employees;
DROP POLICY IF EXISTS "area_manager_read_employees" ON public.employees;
DROP POLICY IF EXISTS "dm_read_employees" ON public.employees;
DROP POLICY IF EXISTS "hr_manage_employees" ON public.employees;
DROP POLICY IF EXISTS "shr_read_employees" ON public.employees;
DROP POLICY IF EXISTS "training_manager_read_employees" ON public.employees;
DROP POLICY IF EXISTS "training_manager_update_employees" ON public.employees;

CREATE POLICY "Admins manage employees"
ON public.employees FOR ALL TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "hr_manage_employees"
ON public.employees FOR ALL TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'hr'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'hr'::app_role)));

CREATE POLICY "training_manager_read_employees"
ON public.employees FOR SELECT TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'training_manager'::app_role)));

CREATE POLICY "training_manager_update_employees"
ON public.employees FOR UPDATE TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'training_manager'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'training_manager'::app_role)));

CREATE POLICY "Employees read own record"
ON public.employees FOR SELECT TO authenticated
USING (
  (SELECT public.has_role(auth.uid(), 'employee'::app_role))
  AND id = (SELECT public.get_user_employee_id(auth.uid()))
);

CREATE POLICY "Station managers read own station employees"
ON public.employees FOR SELECT TO authenticated
USING (
  (SELECT public.has_role(auth.uid(), 'station_manager'::app_role))
  AND station_id = (SELECT public.get_user_station_id(auth.uid()))
);

CREATE POLICY "area_manager_read_employees"
ON public.employees FOR SELECT TO authenticated
USING (
  (SELECT public.has_role(auth.uid(), 'area_manager'::app_role))
  AND station_id IN (SELECT public.get_area_manager_station_ids(auth.uid()))
);

CREATE POLICY "dm_read_employees"
ON public.employees FOR SELECT TO authenticated
USING (
  (SELECT public.has_role(auth.uid(), 'department_manager'::app_role))
  AND station_id = (SELECT public.get_user_station_id(auth.uid()))
  AND department_id IN (SELECT public.get_dm_department_ids(auth.uid()))
);

CREATE POLICY "shr_read_employees"
ON public.employees FOR SELECT TO authenticated
USING (
  (SELECT public.has_role(auth.uid(), 'station_hr'::app_role))
  AND station_id IN (SELECT public.get_station_hr_station_ids(auth.uid()))
);