
-- Fix orphaned notifications: set user_id from employee record
UPDATE notifications n
SET user_id = e.user_id
FROM employees e
WHERE n.employee_id = e.id
  AND n.user_id IS NULL
  AND e.user_id IS NOT NULL;

-- Add RLS policy so employees can see notifications targeted to their employee_id
CREATE POLICY "emp_notifs_by_employee_id"
ON notifications FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employee'::app_role)
  AND employee_id = get_user_employee_id(auth.uid())
);

-- Allow employees to update (mark read) notifications targeted to their employee_id
CREATE POLICY "emp_update_notifs_by_employee_id"
ON notifications FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'employee'::app_role)
  AND employee_id = get_user_employee_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'employee'::app_role)
  AND employee_id = get_user_employee_id(auth.uid())
);
