
CREATE OR REPLACE FUNCTION public.recalculate_loan_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  inst_amount numeric(12,2);
  i integer;
  due date;
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.installments_count IS DISTINCT FROM OLD.installments_count THEN
    IF NEW.installments_count <= 0 THEN
      NEW.installments_count := 1;
    END IF;
    NEW.monthly_installment := ROUND(NEW.amount / NEW.installments_count, 2);
    NEW.remaining := NEW.amount - (COALESCE(NEW.paid_count, 0) * NEW.monthly_installment);
    
    -- Delete old installments and regenerate
    DELETE FROM public.loan_installments WHERE loan_id = NEW.id;
    
    inst_amount := NEW.monthly_installment;
    FOR i IN 1..NEW.installments_count LOOP
      due := NEW.start_date + (i * INTERVAL '1 month')::interval;
      INSERT INTO public.loan_installments (loan_id, employee_id, installment_number, amount, due_date, status)
      VALUES (NEW.id, NEW.employee_id, i, inst_amount, due, 
        CASE WHEN i <= COALESCE(NEW.paid_count, 0) THEN 'paid' ELSE 'pending' END);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
