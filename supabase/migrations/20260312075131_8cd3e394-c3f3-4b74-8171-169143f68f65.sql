
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_hr_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;

CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_hr_read" ON public.profiles
  FOR SELECT TO public USING (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT TO public USING (id = auth.uid());
