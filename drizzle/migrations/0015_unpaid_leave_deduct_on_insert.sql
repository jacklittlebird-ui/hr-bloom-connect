CREATE OR REPLACE FUNCTION public.sync_unpaid_leave_deduction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.leave_type = 'unpaid' AND NEW.status <> 'rejected' THEN
      PERFORM public.apply_leave_deduction_days(NEW.employee_id, NEW.deduction_month, NEW.days, auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.leave_type = 'unpaid' AND OLD.status <> 'rejected' THEN
      PERFORM public.apply_leave_deduction_days(OLD.employee_id, OLD.deduction_month, -OLD.days, NULL);
    END IF;
    IF NEW.leave_type = 'unpaid' AND NEW.status <> 'rejected' THEN
      PERFORM public.apply_leave_deduction_days(NEW.employee_id, NEW.deduction_month, NEW.days, auth.uid());
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.leave_type = 'unpaid' AND OLD.status <> 'rejected' THEN
      PERFORM public.apply_leave_deduction_days(OLD.employee_id, OLD.deduction_month, -OLD.days, NULL);
    END IF;
    RETURN OLD;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fill_unpaid_leave_deduction_month_on_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cairo_now timestamp := (now() AT TIME ZONE 'Africa/Cairo');
BEGIN
  IF NEW.leave_type = 'unpaid' AND NEW.status <> 'rejected' AND NEW.deduction_month IS NULL THEN
    NEW.deduction_month := CASE WHEN extract(day FROM cairo_now) > 25
      THEN to_char(cairo_now + interval '1 month', 'YYYY-MM') ELSE to_char(cairo_now, 'YYYY-MM') END;
  END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT employee_id, deduction_month, days FROM public.leave_requests
           WHERE leave_type = 'unpaid' AND status = 'pending' AND deduction_month IS NOT NULL LOOP
    PERFORM public.apply_leave_deduction_days(r.employee_id, r.deduction_month, r.days, NULL);
  END LOOP;
END $$;