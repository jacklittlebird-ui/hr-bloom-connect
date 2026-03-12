
-- Fix existing loans data: set remaining and monthly_installment correctly
UPDATE public.loans
SET remaining = amount - (COALESCE(paid_count, 0) * ROUND(amount / NULLIF(installments_count, 0), 2)),
    monthly_installment = ROUND(amount / NULLIF(installments_count, 0), 2)
WHERE monthly_installment = 0 OR remaining = 0;

-- Drop existing trigger
DROP TRIGGER IF EXISTS trg_generate_installments ON public.loans;
DROP TRIGGER IF EXISTS trg_generate_loan_installments ON public.loans;

-- Recreate function to split: calculate fields (BEFORE) + generate rows (AFTER)
CREATE OR REPLACE FUNCTION public.calculate_loan_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.installments_count <= 0 THEN
    NEW.installments_count := 1;
  END IF;
  NEW.monthly_installment := ROUND(NEW.amount / NEW.installments_count, 2);
  NEW.remaining := NEW.amount;
  NEW.paid_count := 0;
  RETURN NEW;
END;
$$;

-- BEFORE INSERT to set calculated fields
CREATE TRIGGER trg_calc_loan_fields
BEFORE INSERT ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.calculate_loan_fields();

-- Recreate installment generation as pure AFTER INSERT (no NEW modification)
CREATE OR REPLACE FUNCTION public.generate_loan_installments()
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
  inst_amount := ROUND(NEW.amount / GREATEST(NEW.installments_count, 1), 2);
  
  FOR i IN 1..NEW.installments_count LOOP
    due := NEW.start_date + (i * INTERVAL '1 month')::interval;
    INSERT INTO public.loan_installments (loan_id, employee_id, installment_number, amount, due_date, status)
    VALUES (NEW.id, NEW.employee_id, i, inst_amount, due, 'pending');
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- AFTER INSERT to generate installment rows
CREATE TRIGGER trg_generate_installments
AFTER INSERT ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.generate_loan_installments();
