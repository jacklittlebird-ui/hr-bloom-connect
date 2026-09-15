ALTER TABLE public.violations DROP CONSTRAINT violations_created_by_fkey, ADD CONSTRAINT violations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.violations DROP CONSTRAINT violations_approved_by_fkey, ADD CONSTRAINT violations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.missions DROP CONSTRAINT missions_approved_by_fkey, ADD CONSTRAINT missions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests DROP CONSTRAINT leave_requests_approved_by_fkey, ADD CONSTRAINT leave_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.performance_reviews DROP CONSTRAINT performance_reviews_reviewer_id_fkey, ADD CONSTRAINT performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.mobile_bills DROP CONSTRAINT mobile_bills_uploaded_by_fkey, ADD CONSTRAINT mobile_bills_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.auto_attendance_on_mission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ci time;
  co time;
  d_start date;
  d_end date;
  d date;
  mission_check_in timestamptz;
  mission_check_out timestamptz;
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

      INSERT INTO public.attendance_records (employee_id, date, check_in, check_out, status, notes)
      VALUES (NEW.employee_id, d, mission_check_in, mission_check_out, 'mission', 'مأمورية / Mission')
      ON CONFLICT (employee_id, date) DO UPDATE
      SET check_in = LEAST(attendance_records.check_in, EXCLUDED.check_in),
          check_out = GREATEST(attendance_records.check_out, EXCLUDED.check_out),
          notes = CASE
            WHEN COALESCE(attendance_records.notes, '') LIKE '%مأمورية / Mission%' THEN attendance_records.notes
            WHEN COALESCE(attendance_records.notes, '') = '' THEN 'مأمورية / Mission'
            ELSE attendance_records.notes || ' | مأمورية / Mission'
          END;
      d := d + 1;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;