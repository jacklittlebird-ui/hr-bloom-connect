CREATE OR REPLACE FUNCTION public.update_permission_balance_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  req_year integer;
BEGIN
  -- Skip balance updates for no-deduction permission type
  IF NEW.permission_type = 'no_deduction' THEN
    RETURN NEW;
  END IF;

  -- Status changes TO approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    req_year := EXTRACT(YEAR FROM NEW.date);
    INSERT INTO public.leave_balances (employee_id, year)
    VALUES (NEW.employee_id, req_year)
    ON CONFLICT (employee_id, year) DO NOTHING;
    UPDATE public.leave_balances
    SET permissions_used = permissions_used + COALESCE(NEW.hours, 0)
    WHERE employee_id = NEW.employee_id AND year = req_year;
  ELSIF NEW.status = 'approved' AND OLD.status = 'approved'
        AND NEW.hours IS DISTINCT FROM OLD.hours THEN
    req_year := EXTRACT(YEAR FROM OLD.date);
    UPDATE public.leave_balances
    SET permissions_used = GREATEST(0, permissions_used - COALESCE(OLD.hours, 0) + COALESCE(NEW.hours, 0))
    WHERE employee_id = NEW.employee_id AND year = req_year;
  END IF;

  IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    req_year := EXTRACT(YEAR FROM OLD.date);
    UPDATE public.leave_balances
    SET permissions_used = GREATEST(0, permissions_used - COALESCE(OLD.hours, 0))
    WHERE employee_id = OLD.employee_id AND year = req_year;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reverse_permission_balance_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  req_year integer;
BEGIN
  IF OLD.status = 'approved' AND OLD.permission_type <> 'no_deduction' THEN
    req_year := EXTRACT(YEAR FROM OLD.date);
    UPDATE public.leave_balances
    SET permissions_used = GREATEST(0, permissions_used - COALESCE(OLD.hours, 0))
    WHERE employee_id = OLD.employee_id AND year = req_year;
  END IF;
  RETURN OLD;
END;
$function$;