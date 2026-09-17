CREATE OR REPLACE FUNCTION public.auto_attendance_on_mission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ci time;
  co time;
  d_start date;
  d_end date;
  d date;
  mission_check_in timestamptz;
  mission_check_out timestamptz;
  existing_id uuid;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    CASE NEW.mission_type
      WHEN 'morning' THEN ci := '09:00'; co := '13:00';
      WHEN 'evening' THEN ci := '13:00'; co := '17:00';
      ELSE ci := '09:00'; co := '17:00';
    END CASE;

    IF NEW.check_in IS NOT NULL THEN ci := NEW.check_in; END IF;
    IF NEW.check_out IS NOT NULL THEN co := NEW.check_out; END IF;

    d_start := COALESCE(NEW.start_date, NEW.date);
    d_end := COALESCE(NEW.end_date, NEW.date, d_start);
    IF d_end < d_start THEN d_end := d_start; END IF;

    d := d_start;
    WHILE d <= d_end LOOP
      mission_check_in := ((d::text || ' ' || ci::text)::timestamp AT TIME ZONE 'Africa/Cairo');
      mission_check_out := ((d::text || ' ' || co::text)::timestamp AT TIME ZONE 'Africa/Cairo');
      IF mission_check_out < mission_check_in THEN
        mission_check_out := mission_check_out + interval '1 day';
      END IF;

      SELECT id INTO existing_id
      FROM public.attendance_records
      WHERE employee_id = NEW.employee_id AND date = d
      ORDER BY created_at NULLS LAST
      LIMIT 1;

      IF existing_id IS NULL THEN
        INSERT INTO public.attendance_records (employee_id, date, check_in, check_out, status, notes)
        VALUES (NEW.employee_id, d, mission_check_in, mission_check_out, 'mission', 'مأمورية / Mission');
      ELSE
        UPDATE public.attendance_records ar
        SET check_in = LEAST(COALESCE(ar.check_in, mission_check_in), mission_check_in),
            check_out = GREATEST(COALESCE(ar.check_out, mission_check_out), mission_check_out),
            notes = CASE
              WHEN COALESCE(ar.notes, '') LIKE '%مأمورية / Mission%' THEN ar.notes
              WHEN COALESCE(ar.notes, '') = '' THEN 'مأمورية / Mission'
              ELSE ar.notes || ' | مأمورية / Mission'
            END
        WHERE ar.id = existing_id;
      END IF;

      d := d + 1;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;