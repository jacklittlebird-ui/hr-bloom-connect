ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS station_id uuid,
  ADD COLUMN IF NOT EXISTS department_id uuid;

CREATE OR REPLACE FUNCTION public.snapshot_payroll_employee_placement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.station_id := COALESCE(NEW.station_id, OLD.station_id);
    NEW.department_id := COALESCE(NEW.department_id, OLD.department_id);
  END IF;
  IF NEW.station_id IS NULL OR NEW.department_id IS NULL THEN
    SELECT COALESCE(NEW.station_id, e.station_id), COALESCE(NEW.department_id, e.department_id)
      INTO NEW.station_id, NEW.department_id
    FROM public.employees e WHERE e.id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_payroll_placement ON public.payroll_entries;
CREATE TRIGGER trg_snapshot_payroll_placement
BEFORE INSERT OR UPDATE ON public.payroll_entries
FOR EACH ROW EXECUTE FUNCTION public.snapshot_payroll_employee_placement();

CREATE INDEX IF NOT EXISTS idx_payroll_entries_station ON public.payroll_entries(station_id);