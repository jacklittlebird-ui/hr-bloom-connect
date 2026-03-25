
CREATE OR REPLACE FUNCTION public.calculate_payroll_net()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_gross numeric;
  normalized_leave_days numeric;
  normalized_penalty_value numeric;
BEGIN
  -- Round to nearest 1/8 (0.125)
  normalized_leave_days := ROUND(COALESCE(NEW.leave_days, 0) * 8) / 8.0;
  NEW.leave_days := normalized_leave_days;

  normalized_penalty_value := CASE
    WHEN NEW.penalty_type = 'days' THEN ROUND(COALESCE(NEW.penalty_value, 0) * 8) / 8.0
    ELSE COALESCE(NEW.penalty_value, 0)
  END;
  NEW.penalty_value := normalized_penalty_value;

  IF NEW.bonus_type = 'percentage' THEN
    NEW.bonus_amount := ROUND(NEW.basic_salary * NEW.bonus_value / 100, 2);
  ELSE
    NEW.bonus_amount := COALESCE(NEW.bonus_value, 0);
  END IF;

  NEW.gross := COALESCE(NEW.basic_salary, 0)
    + COALESCE(NEW.transport_allowance, 0)
    + COALESCE(NEW.incentives, 0)
    + COALESCE(NEW.station_allowance, 0)
    + COALESCE(NEW.mobile_allowance, 0)
    + COALESCE(NEW.living_allowance, 0)
    + COALESCE(NEW.overtime_pay, 0)
    + COALESCE(NEW.bonus_amount, 0);

  base_gross := COALESCE(NEW.basic_salary, 0)
    + COALESCE(NEW.transport_allowance, 0)
    + COALESCE(NEW.incentives, 0)
    + COALESCE(NEW.station_allowance, 0)
    + COALESCE(NEW.mobile_allowance, 0);

  IF NEW.penalty_type = 'days' THEN
    NEW.penalty_amount := ROUND((COALESCE(NEW.basic_salary, 0) / 30.0) * normalized_penalty_value * 4) / 4.0;
  ELSIF NEW.penalty_type = 'percentage' THEN
    NEW.penalty_amount := ROUND(COALESCE(NEW.basic_salary, 0) * normalized_penalty_value / 100 * 4) / 4.0;
  ELSE
    NEW.penalty_amount := ROUND(normalized_penalty_value * 4) / 4.0;
  END IF;

  NEW.leave_deduction := ROUND((base_gross / 30.0) * normalized_leave_days * 4) / 4.0;

  NEW.total_deductions := COALESCE(NEW.employee_insurance, 0)
    + COALESCE(NEW.loan_payment, 0)
    + COALESCE(NEW.advance_amount, 0)
    + COALESCE(NEW.mobile_bill, 0)
    + COALESCE(NEW.leave_deduction, 0)
    + COALESCE(NEW.penalty_amount, 0);

  NEW.net_salary := COALESCE(NEW.gross, 0) - COALESCE(NEW.total_deductions, 0);

  RETURN NEW;
END;
$function$;
