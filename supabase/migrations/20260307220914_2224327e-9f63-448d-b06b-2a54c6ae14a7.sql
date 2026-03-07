
CREATE OR REPLACE FUNCTION public.update_annual_balance_on_overtime_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  req_year integer;
BEGIN
  -- When overtime is approved, add 1 day to annual leave balance
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    req_year := EXTRACT(YEAR FROM NEW.date);
    
    INSERT INTO public.leave_balances (employee_id, year, annual_total)
    VALUES (NEW.employee_id, req_year, 22)
    ON CONFLICT (employee_id, year) DO UPDATE
    SET annual_total = leave_balances.annual_total + 1;
  END IF;
  
  -- If status changes FROM approved, reverse the addition
  IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    req_year := EXTRACT(YEAR FROM NEW.date);
    
    UPDATE public.leave_balances
    SET annual_total = GREATEST(21, annual_total - 1)
    WHERE employee_id = NEW.employee_id AND year = req_year;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_overtime_annual_balance
  BEFORE UPDATE ON public.overtime_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_annual_balance_on_overtime_approval();
