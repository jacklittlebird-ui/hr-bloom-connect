
CREATE OR REPLACE FUNCTION public.calculate_payroll_net()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_gross numeric;
BEGIN
  -- Calculate bonus amount
  IF NEW.bonus_type = 'percentage' THEN
    NEW.bonus_amount := ROUND(NEW.basic_salary * NEW.bonus_value / 100, 2);
  ELSE
    NEW.bonus_amount := COALESCE(NEW.bonus_value, 0);
  END IF;
  
  -- Calculate gross
  NEW.gross := COALESCE(NEW.basic_salary, 0) + COALESCE(NEW.transport_allowance, 0) 
    + COALESCE(NEW.incentives, 0) + COALESCE(NEW.station_allowance, 0) 
    + COALESCE(NEW.mobile_allowance, 0) + COALESCE(NEW.living_allowance, 0) 
    + COALESCE(NEW.overtime_pay, 0) + COALESCE(NEW.bonus_amount, 0);
  
  -- Base gross = gross without living_allowance, overtime_pay, and bonus (matches frontend calcGross)
  base_gross := COALESCE(NEW.basic_salary, 0) + COALESCE(NEW.transport_allowance, 0) 
    + COALESCE(NEW.incentives, 0) + COALESCE(NEW.station_allowance, 0) 
    + COALESCE(NEW.mobile_allowance, 0);
  
  -- Calculate penalty
  IF NEW.penalty_type = 'days' THEN
    NEW.penalty_amount := ROUND(NEW.basic_salary / 30.0 * NEW.penalty_value, 2);
  ELSIF NEW.penalty_type = 'percentage' THEN
    NEW.penalty_amount := ROUND(NEW.basic_salary * NEW.penalty_value / 100, 2);
  ELSE
    NEW.penalty_amount := COALESCE(NEW.penalty_value, 0);
  END IF;
  
  -- Calculate leave deduction using base_gross (same as frontend: basic + transport + incentives + station + mobile)
  NEW.leave_deduction := ROUND(base_gross / 30.0 * COALESCE(NEW.leave_days, 0), 2);
  
  -- Total deductions
  NEW.total_deductions := COALESCE(NEW.employee_insurance, 0) + COALESCE(NEW.loan_payment, 0)
    + COALESCE(NEW.advance_amount, 0) + COALESCE(NEW.mobile_bill, 0)
    + COALESCE(NEW.leave_deduction, 0) + COALESCE(NEW.penalty_amount, 0);
  
  -- Net salary
  NEW.net_salary := NEW.gross - NEW.total_deductions;
  
  RETURN NEW;
END;
$function$;
