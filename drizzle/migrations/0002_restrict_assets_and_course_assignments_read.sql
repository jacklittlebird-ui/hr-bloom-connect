CREATE OR REPLACE FUNCTION public.is_staff_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text <> 'employee')
$$;

DROP POLICY IF EXISTS "read_assets" ON public.assets;
CREATE POLICY "read_assets" ON public.assets FOR SELECT TO authenticated
USING ((SELECT public.is_staff_user(auth.uid())) OR assigned_to = (SELECT public.get_user_employee_id(auth.uid())));

DROP POLICY IF EXISTS "read_assignments" ON public.planned_course_assignments;
CREATE POLICY "read_assignments" ON public.planned_course_assignments FOR SELECT TO authenticated
USING ((SELECT public.is_staff_user(auth.uid())) OR employee_id = (SELECT public.get_user_employee_id(auth.uid())));