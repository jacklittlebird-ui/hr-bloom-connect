CREATE OR REPLACE FUNCTION public.sync_salary_bank_from_bank_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.bank_name IS NOT DISTINCT FROM OLD.bank_name THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.salary_bank IS DISTINCT FROM OLD.salary_bank THEN RETURN NEW; END IF;
  IF NEW.bank_name = 'nbe' THEN
    IF NEW.nbe_account_number IS NULL AND NEW.bank_account_number ~ '^[0-9]{19}$' THEN
      NEW.nbe_account_number := NEW.bank_account_number;
    END IF;
    NEW.salary_bank := 'nbe'; NEW.nbe_account_active := true; NEW.credit_account_active := false;
  ELSIF NEW.bank_name = 'credit_agricole' THEN
    NEW.salary_bank := 'credit_agricole'; NEW.credit_account_active := true; NEW.nbe_account_active := false;
  ELSIF NEW.bank_name = 'cash' OR NEW.bank_name IS NULL THEN
    NEW.salary_bank := 'cash';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_salary_bank ON public.employees;
CREATE TRIGGER trg_sync_salary_bank BEFORE INSERT OR UPDATE OF bank_name ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.sync_salary_bank_from_bank_name();
UPDATE public.employees SET salary_bank='nbe', nbe_account_active=true, credit_account_active=false,
  nbe_account_number = COALESCE(nbe_account_number, CASE WHEN bank_account_number ~ '^[0-9]{19}$' THEN bank_account_number END)
WHERE bank_name='nbe' AND salary_bank <> 'nbe';