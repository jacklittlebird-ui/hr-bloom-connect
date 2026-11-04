CREATE OR REPLACE FUNCTION public.recalculate_loan_on_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  i integer; due date; installment_amount numeric(12,2); should_regenerate boolean;
  expected_auto numeric(12,2); existing_count integer; existing_total numeric(12,2);
BEGIN
  IF NEW.installments_count IS NULL OR NEW.installments_count <= 0 THEN NEW.installments_count := 1; END IF;
  expected_auto := ROUND(NEW.amount / GREATEST(NEW.installments_count, 1), 2);
  IF COALESCE(NEW.monthly_installment, 0) > 0 AND ABS(NEW.monthly_installment - expected_auto) > 0.009 THEN
    NEW.monthly_installment := ROUND(NEW.monthly_installment, 2);
    NEW.installments_count := GREATEST(1, CEIL(NEW.amount / NEW.monthly_installment)::integer);
  ELSE
    NEW.monthly_installment := expected_auto;
  END IF;
  NEW.paid_count := LEAST(GREATEST(COALESCE(NEW.paid_count, 0), 0), NEW.installments_count);
  NEW.remaining := GREATEST(0, ROUND(NEW.amount - (NEW.paid_count * NEW.monthly_installment), 2));
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO existing_count, existing_total FROM public.loan_installments WHERE loan_id = NEW.id;
  should_regenerate := (NEW.amount IS DISTINCT FROM OLD.amount OR NEW.installments_count IS DISTINCT FROM OLD.installments_count
    OR NEW.monthly_installment IS DISTINCT FROM OLD.monthly_installment OR NEW.start_date IS DISTINCT FROM OLD.start_date
    OR NEW.employee_id IS DISTINCT FROM OLD.employee_id OR existing_count <> NEW.installments_count OR ABS(existing_total - NEW.amount) > 0.01);
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