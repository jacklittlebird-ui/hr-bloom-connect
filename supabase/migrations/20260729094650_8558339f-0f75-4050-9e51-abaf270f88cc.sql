CREATE OR REPLACE FUNCTION public.enforce_attendance_event_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.location_id IS NULL THEN
    RAISE EXCEPTION 'attendance_events.location_id is required (event_type=%, employee_id=%)',
      NEW.event_type, NEW.employee_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_attendance_event_location ON public.attendance_events;
CREATE TRIGGER trg_enforce_attendance_event_location
BEFORE INSERT ON public.attendance_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_attendance_event_location();