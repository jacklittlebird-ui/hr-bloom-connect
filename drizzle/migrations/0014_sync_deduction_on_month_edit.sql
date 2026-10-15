CREATE OR REPLACE FUNCTION public.sync_violation_penalty() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.penalty_kind = 'deduction' AND NEW.status <> 'rejected' THEN
      PERFORM public.apply_violation_penalty_days(NEW.employee_id, NEW.deduction_month, NEW.penalty_days, NEW.created_by);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.penalty_kind = 'deduction' AND OLD.status <> 'rejected' THEN
      PERFORM public.apply_violation_penalty_days(OLD.employee_id, OLD.deduction_month, -OLD.penalty_days, NULL);
    END IF;
    IF NEW.penalty_kind = 'deduction' AND NEW.status <> 'rejected' THEN
      PERFORM public.apply_violation_penalty_days(NEW.employee_id, NEW.deduction_month, NEW.penalty_days, auth.uid());
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.penalty_kind = 'deduction' AND OLD.status <> 'rejected' THEN
      PERFORM public.apply_violation_penalty_days(OLD.employee_id, OLD.deduction_month, -OLD.penalty_days, NULL);
    END IF;
    RETURN OLD;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_sync_violation_penalty ON public.violations;
CREATE TRIGGER trg_sync_violation_penalty AFTER INSERT OR DELETE OR UPDATE OF status, penalty_kind, penalty_days, deduction_month, employee_id ON public.violations FOR EACH ROW EXECUTE FUNCTION public.sync_violation_penalty();

CREATE OR REPLACE FUNCTION public.fill_unpaid_leave_deduction_month_on_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cairo_now timestamp := (now() AT TIME ZONE 'Africa/Cairo');
BEGIN
  IF NEW.leave_type = 'unpaid' AND NEW.status = 'approved' AND NEW.deduction_month IS NULL THEN
    NEW.deduction_month := CASE WHEN extract(day FROM cairo_now) > 25
      THEN to_char(cairo_now + interval '1 month', 'YYYY-MM') ELSE to_char(cairo_now, 'YYYY-MM') END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fill_unpaid_leave_deduction_month_upd ON public.leave_requests;
CREATE TRIGGER trg_fill_unpaid_leave_deduction_month_upd BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.fill_unpaid_leave_deduction_month_on_update();

CREATE OR REPLACE FUNCTION public.sync_unpaid_leave_deduction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS trg_sync_unpaid_leave_deduction ON public.leave_requests;
CREATE TRIGGER trg_sync_unpaid_leave_deduction AFTER INSERT OR DELETE OR UPDATE OF status, days, leave_type, deduction_month, employee_id ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.sync_unpaid_leave_deduction();