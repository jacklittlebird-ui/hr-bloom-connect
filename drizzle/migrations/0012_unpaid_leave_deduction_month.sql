ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS deduction_month text;

CREATE OR REPLACE FUNCTION public.set_unpaid_leave_deduction_month()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  cairo_now timestamp := (now() AT TIME ZONE 'Africa/Cairo');
BEGIN
  IF NEW.leave_type = 'unpaid' THEN
    NEW.deduction_month := CASE WHEN extract(day FROM cairo_now) > 25
      THEN to_char(cairo_now + interval '1 month', 'YYYY-MM')
      ELSE to_char(cairo_now, 'YYYY-MM') END;
  ELSE
    NEW.deduction_month := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_set_unpaid_leave_deduction_month
BEFORE INSERT ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.set_unpaid_leave_deduction_month();

CREATE OR REPLACE FUNCTION public.apply_leave_deduction_days(_emp uuid, _month text, _days numeric, _by uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _emp IS NULL OR _month IS NULL OR _days IS NULL OR _days = 0 THEN RETURN; END IF;
  INSERT INTO public.leave_deductions (employee_id, deduction_month, days, status, uploaded_by)
  VALUES (_emp, _month, GREATEST(_days, 0), 'pending', _by)
  ON CONFLICT (employee_id, deduction_month)
  DO UPDATE SET days = GREATEST(public.leave_deductions.days + _days, 0);
  DELETE FROM public.leave_deductions WHERE employee_id = _emp AND deduction_month = _month AND days <= 0;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_leave_deduction_days(uuid, text, numeric, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_unpaid_leave_deduction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.leave_type = 'unpaid' AND NEW.status = 'approved' THEN
      PERFORM public.apply_leave_deduction_days(NEW.employee_id, NEW.deduction_month, NEW.days, auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.leave_type = 'unpaid' AND OLD.status = 'approved' THEN
      PERFORM public.apply_leave_deduction_days(OLD.employee_id, OLD.deduction_month, -OLD.days, NULL);
    END IF;
    IF NEW.leave_type = 'unpaid' AND NEW.status = 'approved' THEN
      IF NEW.deduction_month IS NULL THEN
        NEW.deduction_month := to_char((now() AT TIME ZONE 'Africa/Cairo') + CASE WHEN extract(day FROM (now() AT TIME ZONE 'Africa/Cairo')) > 25 THEN interval '1 month' ELSE interval '0' END, 'YYYY-MM');
        UPDATE public.leave_requests SET deduction_month = NEW.deduction_month WHERE id = NEW.id;
      END IF;
      PERFORM public.apply_leave_deduction_days(NEW.employee_id, NEW.deduction_month, NEW.days, auth.uid());
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.leave_type = 'unpaid' AND OLD.status = 'approved' THEN
      PERFORM public.apply_leave_deduction_days(OLD.employee_id, OLD.deduction_month, -OLD.days, NULL);
    END IF;
    RETURN OLD;
  END IF;
END $$;

CREATE TRIGGER trg_sync_unpaid_leave_deduction
AFTER INSERT OR UPDATE OF status, days, leave_type OR DELETE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_unpaid_leave_deduction();