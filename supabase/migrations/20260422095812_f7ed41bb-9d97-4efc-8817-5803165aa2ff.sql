
-- 1. Create the linking table
CREATE TABLE IF NOT EXISTS public.department_manager_departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_dept_user ON public.department_manager_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_dept_dept ON public.department_manager_departments(department_id);

ALTER TABLE public.department_manager_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_dm_depts_all" ON public.department_manager_departments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hr_dm_depts_all" ON public.department_manager_departments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "own_dm_depts_select" ON public.department_manager_departments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. Migrate existing single-department assignments
INSERT INTO public.department_manager_departments (user_id, department_id)
SELECT user_id, department_id FROM public.user_roles
WHERE role = 'department_manager'::app_role AND department_id IS NOT NULL
ON CONFLICT (user_id, department_id) DO NOTHING;

-- 3. Helper function: returns all department IDs for a department manager (falls back to user_roles.department_id)
CREATE OR REPLACE FUNCTION public.get_dm_department_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.department_manager_departments WHERE user_id = _user_id
  UNION
  SELECT department_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'department_manager'::app_role AND department_id IS NOT NULL
$$;

-- 4. Replace dm_* policies on key tables to use the new function (multi-department)
-- employees
DROP POLICY IF EXISTS "dm_read_employees" ON public.employees;
CREATE POLICY "dm_read_employees" ON public.employees
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND station_id = get_user_station_id(auth.uid())
    AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
  );

-- attendance_records
DROP POLICY IF EXISTS "dm_attendance_select" ON public.attendance_records;
CREATE POLICY "dm_attendance_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "dm_attendance_insert" ON public.attendance_records;
CREATE POLICY "dm_attendance_insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );

-- leave_requests
DROP POLICY IF EXISTS "dm_leave_requests_select" ON public.leave_requests;
CREATE POLICY "dm_leave_requests_select" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "dm_leave_requests_update" ON public.leave_requests;
CREATE POLICY "dm_leave_requests_update" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );

-- missions
DROP POLICY IF EXISTS "dm_missions_select" ON public.missions;
CREATE POLICY "dm_missions_select" ON public.missions
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "dm_missions_update" ON public.missions;
CREATE POLICY "dm_missions_update" ON public.missions
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );

-- attendance_assignments
DROP POLICY IF EXISTS "dm_attendance_assignments_select" ON public.attendance_assignments;
CREATE POLICY "dm_attendance_assignments_select" ON public.attendance_assignments
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );

-- overtime_requests, performance_reviews, violations: drop & recreate if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'overtime_requests' AND policyname = 'dm_overtime_select') THEN
    DROP POLICY "dm_overtime_select" ON public.overtime_requests;
  END IF;
END $$;

CREATE POLICY "dm_overtime_select" ON public.overtime_requests
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'overtime_requests' AND policyname = 'dm_overtime_update') THEN
    DROP POLICY "dm_overtime_update" ON public.overtime_requests;
  END IF;
END $$;

CREATE POLICY "dm_overtime_update" ON public.overtime_requests
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'department_manager'::app_role)
    AND employee_id IN (
      SELECT id FROM employees
      WHERE station_id = get_user_station_id(auth.uid())
        AND department_id IN (SELECT get_dm_department_ids(auth.uid()))
    )
  );
