
-- Auto-create leave balance for current year when a new employee is inserted
CREATE OR REPLACE FUNCTION public.create_initial_leave_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, casual_total, casual_used, permissions_total, permissions_used)
  VALUES (NEW.id, EXTRACT(YEAR FROM now())::int, 21, 0, 15, 0, 7, 0, 12, 0)
  ON CONFLICT (employee_id, year) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_initial_leave_balance
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION create_initial_leave_balance();
