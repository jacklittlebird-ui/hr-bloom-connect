CREATE POLICY "hr_read_user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role));