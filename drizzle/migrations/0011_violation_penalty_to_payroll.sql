ALTER TABLE public.violations
  ADD COLUMN IF NOT EXISTS penalty_kind text,
  ADD COLUMN IF NOT EXISTS penalty_days numeric,
  ADD COLUMN IF NOT EXISTS deduction_month text;

CREATE OR REPLACE FUNCTION public.validate_violation_penalty()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  cairo_now timestamp := (now() AT TIME ZONE 'Africa/Cairo');
  cur_month text := to_char(cairo_now, 'YYYY-MM');
  next_month text := to_char(cairo_now + interval '1 month', 'YYYY-MM');
BEGIN
  IF NEW.penalty_kind IS NULL THEN RETURN NEW; END IF;
  IF NEW.penalty_kind NOT IN ('warning','deduction') THEN
    RAISE EXCEPTION 'نوع العقوبة غير صحيح';
  END IF;
  IF NEW.penalty_kind = 'deduction' THEN
    IF NEW.penalty_days IS NULL OR NEW.penalty_days <= 0 THEN
      RAISE EXCEPTION 'يجب إدخال عدد أيام الخصم';
    END IF;
    IF NEW.deduction_month IS NULL OR NEW.deduction_month !~ '^\d{4}-\d{2}$' THEN
      RAISE EXCEPTION 'يجب اختيار شهر الخصم';
    END IF;
    IF NEW.deduction_month < cur_month THEN
      RAISE EXCEPTION 'لا يمكن اختيار شهر سابق للخصم';
    END IF;
    IF extract(day FROM cairo_now) > 25 AND NEW.deduction_month = cur_month THEN
      RAISE EXCEPTION 'بعد يوم 25 لا يمكن تسجيل الخصم على الشهر الحالي، اختر الشهر التالي %', next_month;
    END IF;
  ELSE
    NEW.penalty_days := NULL;
    NEW.deduction_month := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_violation_penalty
BEFORE INSERT ON public.violations
FOR EACH ROW EXECUTE FUNCTION public.validate_violation_penalty();

CREATE OR REPLACE FUNCTION public.apply_violation_penalty_days(_emp uuid, _month text, _days numeric, _by uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _emp IS NULL OR _month IS NULL OR _days IS NULL OR _days = 0 THEN RETURN; END IF;
  INSERT INTO public.penalty_deductions (employee_id, deduction_month, days, status, uploaded_by)
  VALUES (_emp, _month, GREATEST(_days, 0), 'pending', _by)
  ON CONFLICT (employee_id, deduction_month)
  DO UPDATE SET days = GREATEST(public.penalty_deductions.days + _days, 0), updated_at = now();
  DELETE FROM public.penalty_deductions
   WHERE employee_id = _emp AND deduction_month = _month AND days <= 0;
END $$;

CREATE OR REPLACE FUNCTION public.sync_violation_penalty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.penalty_kind = 'deduction' AND NEW.status <> 'rejected' THEN
      PERFORM public.apply_violation_penalty_days(NEW.employee_id, NEW.deduction_month, NEW.penalty_days, NEW.created_by);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.penalty_kind = 'deduction' AND OLD.status <> 'rejected' AND NEW.status = 'rejected' THEN
      PERFORM public.apply_violation_penalty_days(OLD.employee_id, OLD.deduction_month, -OLD.penalty_days, NULL);
    ELSIF OLD.penalty_kind = 'deduction' AND OLD.status = 'rejected' AND NEW.status <> 'rejected' THEN
      PERFORM public.apply_violation_penalty_days(NEW.employee_id, NEW.deduction_month, NEW.penalty_days, NULL);
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.penalty_kind = 'deduction' AND OLD.status <> 'rejected' THEN
      PERFORM public.apply_violation_penalty_days(OLD.employee_id, OLD.deduction_month, -OLD.penalty_days, NULL);
    END IF;
    RETURN OLD;
  END IF;
END $$;

CREATE TRIGGER trg_sync_violation_penalty
AFTER INSERT OR UPDATE OF status OR DELETE ON public.violations
FOR EACH ROW EXECUTE FUNCTION public.sync_violation_penalty();

REVOKE EXECUTE ON FUNCTION public.apply_violation_penalty_days(uuid, text, numeric, uuid) FROM PUBLIC, anon, authenticated;