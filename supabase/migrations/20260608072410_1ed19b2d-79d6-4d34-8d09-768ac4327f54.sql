
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

UPDATE public.missions
  SET start_date = COALESCE(start_date, date),
      end_date   = COALESCE(end_date, date);

CREATE OR REPLACE FUNCTION public.auto_attendance_on_mission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ci time;
  co time;
  hrs numeric;
  d_start date;
  d_end date;
  d date;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    CASE NEW.mission_type
      WHEN 'morning' THEN ci := '09:00'; co := '14:00'; hrs := 5;
      WHEN 'evening' THEN ci := '14:00'; co := '17:00'; hrs := 3;
      ELSE ci := '09:00'; co := '17:00'; hrs := 8;
    END CASE;

    IF NEW.check_in IS NOT NULL THEN ci := NEW.check_in; END IF;
    IF NEW.check_out IS NOT NULL THEN co := NEW.check_out; END IF;

    d_start := COALESCE(NEW.start_date, NEW.date);
    d_end   := COALESCE(NEW.end_date,   NEW.date, d_start);
    IF d_end < d_start THEN d_end := d_start; END IF;

    d := d_start;
    WHILE d <= d_end LOOP
      INSERT INTO public.attendance_records (employee_id, date, check_in, check_out, status, notes)
      VALUES (
        NEW.employee_id,
        d,
        (d::text || ' ' || ci::text)::timestamptz,
        (d::text || ' ' || co::text)::timestamptz,
        'mission',
        'مأمورية / Mission'
      )
      ON CONFLICT DO NOTHING;
      d := d + 1;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
