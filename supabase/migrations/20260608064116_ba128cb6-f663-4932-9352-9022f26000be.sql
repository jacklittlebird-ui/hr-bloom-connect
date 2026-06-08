CREATE OR REPLACE FUNCTION public.calculate_work_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  diff_minutes integer;
  diff_hours numeric;
  note_suffix text;
BEGIN
  IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL THEN
    diff_minutes := EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 60;

    -- Handle overnight shifts.
    IF diff_minutes < 0 THEN
      diff_minutes := diff_minutes + 1440;
    END IF;

    diff_hours := diff_minutes / 60.0;

    -- Safety guard: if an old open record is closed late (cron outage / delayed checkout),
    -- never let it count as 18-24h work. Follow auto-checkout policy: 5h only.
    IF diff_hours >= 18
       AND COALESCE(NEW.status, '') NOT IN ('mission') THEN
      NEW.check_out := NEW.check_in + interval '5 hours';
      NEW.work_hours := 5;
      NEW.work_minutes := 300;
      NEW.status := 'auto-closed';
      note_suffix := '[AUTO_CLOSED] Safety guard applied: stale open attendance record capped at 5h.';
      NEW.notes := CASE
        WHEN NEW.notes IS NULL OR NEW.notes = '' THEN note_suffix
        WHEN NEW.notes LIKE '%[AUTO_CLOSED]%' THEN NEW.notes
        ELSE NEW.notes || ' ' || note_suffix
      END;
    ELSE
      NEW.work_hours := ROUND(diff_minutes / 60.0, 2);
      NEW.work_minutes := diff_minutes;
    END IF;
  ELSE
    NEW.work_hours := 0;
    NEW.work_minutes := 0;
  END IF;
  RETURN NEW;
END;
$function$;