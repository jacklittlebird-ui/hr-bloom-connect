
-- ==========================================================
-- Security Hardening Migration
-- 1) Restrict profiles read to self + admin (was public)
-- 2) Restrict permission_profiles read to authenticated only
-- 3) Restrict assets/planned_courses/planned_course_assignments read to authenticated
-- ==========================================================

-- 1) PROFILES: Remove overly permissive "Users can read profiles" policy
DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;

-- Self-read only
CREATE POLICY "profiles_select_self"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admin read all profiles
CREATE POLICY "profiles_admin_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) PERMISSION_PROFILES: restrict to authenticated (was USING true for anon too)
DROP POLICY IF EXISTS "read_permission_profiles" ON public.permission_profiles;

CREATE POLICY "read_permission_profiles"
  ON public.permission_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 3) ASSETS: restrict public read to authenticated only
DROP POLICY IF EXISTS "read_assets" ON public.assets;

CREATE POLICY "read_assets"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (true);

-- 4) PLANNED_COURSES: restrict to authenticated
DROP POLICY IF EXISTS "read_planned_courses" ON public.planned_courses;

CREATE POLICY "read_planned_courses"
  ON public.planned_courses
  FOR SELECT
  TO authenticated
  USING (true);

-- 5) PLANNED_COURSE_ASSIGNMENTS: restrict to authenticated
DROP POLICY IF EXISTS "read_assignments" ON public.planned_course_assignments;

CREATE POLICY "read_assignments"
  ON public.planned_course_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- 6) TRAINING_COURSES: restrict to authenticated
DROP POLICY IF EXISTS "read_courses" ON public.training_courses;

CREATE POLICY "read_courses"
  ON public.training_courses
  FOR SELECT
  TO authenticated
  USING (true);

-- 7) DEPARTMENTS: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated can read departments" ON public.departments;

CREATE POLICY "Authenticated can read departments"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

-- 8) STATIONS: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated can read stations" ON public.stations;

CREATE POLICY "Authenticated can read stations"
  ON public.stations
  FOR SELECT
  TO authenticated
  USING (true);

-- 9) QR_LOCATIONS: restrict active read to authenticated
DROP POLICY IF EXISTS "auth_read_qr_locations" ON public.qr_locations;

CREATE POLICY "auth_read_qr_locations"
  ON public.qr_locations
  FOR SELECT
  TO authenticated
  USING (is_active = true);
