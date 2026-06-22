DROP POLICY IF EXISTS emp_gps_verif_select ON public.gps_verification_logs;
CREATE POLICY emp_gps_verif_select ON public.gps_verification_logs
FOR SELECT USING (
  employee_id = public.get_user_employee_id(auth.uid())
  AND public.has_role(auth.uid(), 'employee'::app_role)
);