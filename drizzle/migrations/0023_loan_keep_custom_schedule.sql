CREATE OR REPLACE FUNCTION public.recalculate_loan_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  i integer; due date; installment_amount numeric(12,2); should_regenerate boolean;
  expected_auto numeric(12,2); existing_count integer; existing_total numeric(12,2);
  paid_total numeric(12,2); has_matching_pending boolean; schedule_changed boolean; keep_existing boolean;
BEGIN
  IF NEW.installments_count IS NULL OR NEW.installments_count <= 0 THEN NEW.installments_count := 1; END IF;

  SELECT COUNT(*), COALESCE(SUM(amount), 0),
         COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
         COALESCE(BOOL_OR(status = 'pending' AND ABS(amount - COALESCE(NEW.monthly_installment, 0)) <= 0.01), false)
    INTO existing_count, existing_total, paid_total, has_matching_pending
    FROM public.loan_installments WHERE loan_id = NEW.id;

  schedule_changed := (NEW.amount IS DISTINCT FROM OLD.amount OR NEW.installments_count IS DISTINCT FROM OLD.installments_count
    OR NEW.monthly_installment IS DISTINCT FROM OLD.monthly_installment OR NEW.start_date IS DISTINCT FROM OLD.start_date
    OR NEW.employee_id IS DISTINCT FROM OLD.employee_id);

  -- Keep a schedule that was already written to loan_installments (custom amounts / reschedule)
  keep_existing := existing_count > 0
    AND existing_count = NEW.installments_count
    AND ABS(existing_total - NEW.amount) <= 0.01
    AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date
    AND NEW.employee_id IS NOT DISTINCT FROM OLD.employee_id
    AND (NOT schedule_changed OR has_matching_pending);

  IF keep_existing THEN
    NEW.monthly_installment := ROUND(COALESCE(NEW.monthly_installment, 0), 2);
    NEW.paid_count := LEAST(GREATEST(COALESCE(NEW.paid_count, 0), 0), NEW.installments_count);
    NEW.remaining := GREATEST(0, ROUND(NEW.amount - paid_total, 2));
    RETURN NEW;
  END IF;

  expected_auto := ROUND(NEW.amount / GREATEST(NEW.installments_count, 1), 2);
  IF COALESCE(NEW.monthly_installment, 0) > 0 AND ABS(NEW.monthly_installment - expected_auto) > 0.009 THEN
    NEW.monthly_installment := ROUND(NEW.monthly_installment, 2);
    NEW.installments_count := GREATEST(1, CEIL(NEW.amount / NEW.monthly_installment)::integer);
  ELSE
    NEW.monthly_installment := expected_auto;
  END IF;
  NEW.paid_count := LEAST(GREATEST(COALESCE(NEW.paid_count, 0), 0), NEW.installments_count);
  NEW.remaining := GREATEST(0, ROUND(NEW.amount - (NEW.paid_count * NEW.monthly_installment), 2));
  should_regenerate := (schedule_changed OR existing_count <> NEW.installments_count OR ABS(existing_total - NEW.amount) > 0.01);
  IF should_regenerate THEN
    DELETE FROM public.loan_installments WHERE loan_id = NEW.id;
    FOR i IN 1..NEW.installments_count LOOP
      due := (NEW.start_date + make_interval(months => i - 1))::date;
      IF i = NEW.installments_count THEN
        installment_amount := GREATEST(0, ROUND(NEW.amount - (NEW.monthly_installment * (NEW.installments_count - 1)), 2));
      ELSE installment_amount := NEW.monthly_installment; END IF;
      INSERT INTO public.loan_installments (loan_id, employee_id, installment_number, amount, due_date, status, paid_at)
      VALUES (NEW.id, NEW.employee_id, i, installment_amount, due,
        CASE WHEN i <= COALESCE(NEW.paid_count, 0) THEN 'paid' ELSE 'pending' END,
        CASE WHEN i <= COALESCE(NEW.paid_count, 0) THEN now() ELSE NULL END);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;