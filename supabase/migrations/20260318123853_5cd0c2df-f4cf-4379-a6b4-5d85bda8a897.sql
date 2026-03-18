
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  req_year integer;
  col_used text;
  old_col_used text;
BEGIN
  -- If status changes TO approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    req_year := EXTRACT(YEAR FROM NEW.start_date);
    
    CASE NEW.leave_type
      WHEN 'annual' THEN col_used := 'annual_used';
      WHEN 'sick' THEN col_used := 'sick_used';
      WHEN 'casual' THEN col_used := 'casual_used';
      ELSE col_used := NULL;
    END CASE;
    
    IF col_used IS NOT NULL THEN
      INSERT INTO public.leave_balances (employee_id, year, annual_used, sick_used, casual_used)
      VALUES (NEW.employee_id, req_year, 0, 0, 0)
      ON CONFLICT (employee_id, year) DO NOTHING;
      
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = %I + $1 WHERE employee_id = $2 AND year = $3',
        col_used, col_used
      ) USING NEW.days, NEW.employee_id, req_year;
    END IF;
  
  -- If status stays approved but days or leave_type changed
  ELSIF NEW.status = 'approved' AND OLD.status = 'approved' 
        AND (NEW.days IS DISTINCT FROM OLD.days OR NEW.leave_type IS DISTINCT FROM OLD.leave_type) THEN
    req_year := EXTRACT(YEAR FROM OLD.start_date);
    
    -- Reverse old deduction
    CASE OLD.leave_type
      WHEN 'annual' THEN old_col_used := 'annual_used';
      WHEN 'sick' THEN old_col_used := 'sick_used';
      WHEN 'casual' THEN old_col_used := 'casual_used';
      ELSE old_col_used := NULL;
    END CASE;
    
    IF old_col_used IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = GREATEST(0, %I - $1) WHERE employee_id = $2 AND year = $3',
        old_col_used, old_col_used
      ) USING OLD.days, OLD.employee_id, req_year;
    END IF;
    
    -- Apply new deduction
    req_year := EXTRACT(YEAR FROM NEW.start_date);
    CASE NEW.leave_type
      WHEN 'annual' THEN col_used := 'annual_used';
      WHEN 'sick' THEN col_used := 'sick_used';
      WHEN 'casual' THEN col_used := 'casual_used';
      ELSE col_used := NULL;
    END CASE;
    
    IF col_used IS NOT NULL THEN
      INSERT INTO public.leave_balances (employee_id, year, annual_used, sick_used, casual_used)
      VALUES (NEW.employee_id, req_year, 0, 0, 0)
      ON CONFLICT (employee_id, year) DO NOTHING;
      
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = %I + $1 WHERE employee_id = $2 AND year = $3',
        col_used, col_used
      ) USING NEW.days, NEW.employee_id, req_year;
    END IF;
  END IF;
  
  -- If status changes FROM approved to something else, reverse the deduction
  IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    req_year := EXTRACT(YEAR FROM NEW.start_date);
    
    CASE OLD.leave_type
      WHEN 'annual' THEN col_used := 'annual_used';
      WHEN 'sick' THEN col_used := 'sick_used';
      WHEN 'casual' THEN col_used := 'casual_used';
      ELSE col_used := NULL;
    END CASE;
    
    IF col_used IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = GREATEST(0, %I - $1) WHERE employee_id = $2 AND year = $3',
        col_used, col_used
      ) USING OLD.days, OLD.employee_id, req_year;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also update permission balance trigger to handle edits on approved records
CREATE OR REPLACE FUNCTION public.update_permission_balance_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  req_year integer;
BEGIN
  -- Status changes TO approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    req_year := EXTRACT(YEAR FROM NEW.date);
    
    INSERT INTO public.leave_balances (employee_id, year)
    VALUES (NEW.employee_id, req_year)
    ON CONFLICT (employee_id, year) DO NOTHING;
    
    UPDATE public.leave_balances
    SET permissions_used = permissions_used + COALESCE(NEW.hours, 0)
    WHERE employee_id = NEW.employee_id AND year = req_year;
  
  -- Status stays approved but hours changed
  ELSIF NEW.status = 'approved' AND OLD.status = 'approved' 
        AND NEW.hours IS DISTINCT FROM OLD.hours THEN
    req_year := EXTRACT(YEAR FROM OLD.date);
    
    UPDATE public.leave_balances
    SET permissions_used = GREATEST(0, permissions_used - COALESCE(OLD.hours, 0) + COALESCE(NEW.hours, 0))
    WHERE employee_id = NEW.employee_id AND year = req_year;
  END IF;
  
  -- Status changes FROM approved
  IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    req_year := EXTRACT(YEAR FROM OLD.date);
    
    UPDATE public.leave_balances
    SET permissions_used = GREATEST(0, permissions_used - COALESCE(OLD.hours, 0))
    WHERE employee_id = OLD.employee_id AND year = req_year;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure the permission trigger exists
DROP TRIGGER IF EXISTS trg_permission_balance ON public.permission_requests;
CREATE TRIGGER trg_permission_balance
  AFTER UPDATE ON public.permission_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permission_balance_on_approval();
