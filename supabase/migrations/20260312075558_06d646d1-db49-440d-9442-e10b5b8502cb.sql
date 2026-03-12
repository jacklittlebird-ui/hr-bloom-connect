DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_hr_update" ON public.profiles;

CREATE POLICY "profiles_admin_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_hr_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));