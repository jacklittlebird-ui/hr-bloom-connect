
CREATE OR REPLACE FUNCTION public.generate_loan_installments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  due date;
  installment_amount numeric(12,2);
BEGIN
  DELETE FROM public.loan_installments WHERE loan_id = NEW.id;

  FOR i IN 1..NEW.installments_count LOOP
    due := (NEW.start_date + make_interval(months => i - 1))::date;

    IF i = NEW.installments_count THEN
      installment_amount := GREATEST(0, ROUND(NEW.amount - (NEW.monthly_installment * (NEW.installments_count - 1)), 2));
    ELSE
      installment_amount := NEW.monthly_installment;
    END IF;

    INSERT INTO public.loan_installments (
      loan_id,
      employee_id,
      installment_number,
      amount,
      due_date,
      status,
      paid_at
    )
    VALUES (
      NEW.id,
      NEW.employee_id,
      i,
      installment_amount,
      due,
      CASE WHEN i <= COALESCE(NEW.paid_count, 0) THEN 'paid' ELSE 'pending' END,
      CASE WHEN i <= COALESCE(NEW.paid_count, 0) THEN now() ELSE NULL END
    );
  END LOOP;

  RETURN NEW;
END;
$$;
