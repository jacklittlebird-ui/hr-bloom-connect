CREATE OR REPLACE FUNCTION public.marriage_leave_days(p_start date, p_end date)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN 0
    ELSE (p_end - p_start + 1) - CASE
      WHEN ((5 - EXTRACT(DOW FROM p_start)::integer + 7) % 7) < (p_end - p_start + 1)
      THEN 1 + ((p_end - p_start - ((5 - EXTRACT(DOW FROM p_start)::integer + 7) % 7)) / 7)
      ELSE 0 END END;
$$;
CREATE OR REPLACE FUNCTION public.validate_marriage_leave()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE counted_days integer;
BEGIN
  IF NEW.leave_type <> 'marriage' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.leave_type IS NOT DISTINCT FROM OLD.leave_type
       AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date
       AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date
       AND NEW.days IS NOT DISTINCT FROM OLD.days
       AND NOT (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status)
    THEN RETURN NEW; END IF;
  END IF;
  counted_days := public.marriage_leave_days(NEW.start_date, NEW.end_date);
  IF counted_days < 1 OR counted_days > 7 THEN
    RAISE EXCEPTION 'إجازة الزواج يجب أن تكون من يوم إلى 7 أيام مع استبعاد الجمعة، ولا تخصم من رصيد الإجازات. Marriage leave must be 1–7 days excluding Fridays.' USING ERRCODE = '23514';
  END IF;
  NEW.days := counted_days;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_marriage_leave_before_save
BEFORE INSERT OR UPDATE OF leave_type, start_date, end_date, days, status ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_marriage_leave();