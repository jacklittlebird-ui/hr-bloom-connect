
CREATE TABLE public.bonus_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  bonus_number integer NOT NULL,
  year text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  gross_salary numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  job_level text,
  employee_name text,
  employee_code text,
  station_name text,
  department_name text,
  job_title text,
  hire_date date,
  bank_account_number text,
  bank_id_number text,
  bank_name text,
  bank_account_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, bonus_number, year)
);

ALTER TABLE public.bonus_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_bonus_records" ON public.bonus_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hr_bonus_records" ON public.bonus_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "emp_bonus_records" ON public.bonus_records FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));

-- Notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_bonus_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  PERFORM notify_employee_and_admins(
    NEW.employee_id,
    'تم صرف مكافأة - ' || COALESCE(emp_name, ''),
    'Bonus Processed - ' || COALESCE(emp_name, ''),
    'نسبة ' || NEW.percentage || '% - المبلغ: ' || NEW.amount,
    'Rate ' || NEW.percentage || '% - Amount: ' || NEW.amount,
    'info', 'salaries'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_bonus_record
AFTER INSERT ON bonus_records
FOR EACH ROW
EXECUTE FUNCTION notify_on_bonus_record();
