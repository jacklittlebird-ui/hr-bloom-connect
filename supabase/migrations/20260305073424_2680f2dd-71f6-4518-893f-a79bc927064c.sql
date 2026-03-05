
CREATE OR REPLACE FUNCTION public.prevent_permission_on_leave_day()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.leave_requests
    WHERE employee_id = NEW.employee_id
      AND status IN ('pending', 'approved')
      AND NEW.date BETWEEN start_date AND end_date
  ) THEN
    RAISE EXCEPTION 'Cannot request permission on a day with an existing leave request';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_permission_on_leave_day
  BEFORE INSERT ON public.permission_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_permission_on_leave_day();
