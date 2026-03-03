
-- Fix: Allow employees to view their own mobile bill records
CREATE POLICY "emp_mobile_bills_select"
ON public.mobile_bills
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employee'::app_role)
  AND employee_id = get_user_employee_id(auth.uid())
);
