CREATE OR REPLACE FUNCTION public.notify_on_uniform_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp_name text;
  item_ar text;
  item_en text;
BEGIN
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  item_ar := COALESCE(NEW.type_ar, '');
  item_en := COALESCE(NEW.type_en, '');

  PERFORM notify_employee_and_admins(
    NEW.employee_id,
    'تم تسليم يونيفورم جديد - ' || COALESCE(emp_name, ''),
    'New Uniform Delivered - ' || COALESCE(emp_name, ''),
    item_ar || ' - الكمية: ' || COALESCE(NEW.quantity::text, '1'),
    item_en || ' - Qty: ' || COALESCE(NEW.quantity::text, '1'),
    'info', 'uniforms'
  );

  RETURN NEW;
END;
$function$;