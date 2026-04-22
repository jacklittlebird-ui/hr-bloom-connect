-- Allow Training Manager to update employees (specifically to manage dept codes / job functions)
CREATE POLICY "training_manager_update_employees"
ON public.employees
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'training_manager'::app_role));