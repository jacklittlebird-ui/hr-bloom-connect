DROP POLICY IF EXISTS "Employees view own non_recurring_bonuses" ON public.non_recurring_bonuses;

CREATE POLICY "Employees view own non_recurring_bonuses"
ON public.non_recurring_bonuses
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'employee'::app_role)
  AND employee_id = public.get_user_employee_id(auth.uid())
);