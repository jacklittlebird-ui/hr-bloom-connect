
-- Uniform assignment notification
CREATE OR REPLACE FUNCTION public.notify_on_uniform_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  
  PERFORM notify_employee_and_admins(
    NEW.employee_id,
    'تم تسليم يونيفورم جديد - ' || COALESCE(emp_name, ''),
    'New Uniform Delivered - ' || COALESCE(emp_name, ''),
    COALESCE(NEW.item_name, '') || ' - الكمية: ' || COALESCE(NEW.quantity::text, '1'),
    COALESCE(NEW.item_name, '') || ' - Qty: ' || COALESCE(NEW.quantity::text, '1'),
    'info', 'uniforms'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_uniform_assignment
AFTER INSERT ON uniforms
FOR EACH ROW
EXECUTE FUNCTION notify_on_uniform_assignment();
