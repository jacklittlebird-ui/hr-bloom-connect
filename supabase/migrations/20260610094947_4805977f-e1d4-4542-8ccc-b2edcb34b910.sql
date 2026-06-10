
CREATE TABLE public.performance_bonus_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year TEXT NOT NULL,
  quarter TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  job_level TEXT,
  employee_name TEXT,
  employee_code TEXT,
  station_name TEXT,
  department_name TEXT,
  job_title TEXT,
  hire_date DATE,
  bank_account_number TEXT,
  bank_id_number TEXT,
  bank_name TEXT,
  bank_account_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT performance_bonus_records_emp_year_quarter_key UNIQUE (employee_id, year, quarter)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_bonus_records TO authenticated;
GRANT ALL ON public.performance_bonus_records TO service_role;

ALTER TABLE public.performance_bonus_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_perf_bonus_records" ON public.performance_bonus_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "hr_perf_bonus_records" ON public.performance_bonus_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "emp_perf_bonus_records" ON public.performance_bonus_records
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));

CREATE TRIGGER trg_perf_bonus_records_updated
  BEFORE UPDATE ON public.performance_bonus_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_perf_bonus_records_year_quarter ON public.performance_bonus_records(year, quarter);
CREATE INDEX idx_perf_bonus_records_employee ON public.performance_bonus_records(employee_id);
