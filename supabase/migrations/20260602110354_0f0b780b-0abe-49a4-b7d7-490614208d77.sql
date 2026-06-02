
-- Fix 1: HR privilege escalation on user_roles
DROP POLICY IF EXISTS hr_manage_user_roles ON public.user_roles;

CREATE POLICY hr_insert_employee_roles ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hr'::app_role) AND role = 'employee'::app_role);

CREATE POLICY hr_update_employee_roles ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'hr'::app_role) AND role = 'employee'::app_role)
  WITH CHECK (public.has_role(auth.uid(), 'hr'::app_role) AND role = 'employee'::app_role);

CREATE POLICY hr_delete_employee_roles ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'hr'::app_role) AND role = 'employee'::app_role);

CREATE POLICY hr_read_user_roles ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr'::app_role));

-- Fix 2: HR read access to payroll_entries
CREATE POLICY hr_read_payroll ON public.payroll_entries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr'::app_role));
