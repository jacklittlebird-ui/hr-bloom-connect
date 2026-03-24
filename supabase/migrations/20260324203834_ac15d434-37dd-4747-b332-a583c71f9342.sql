-- Performance indexes for employee portal queries (scoped by employee_id)
-- These tables are queried on every employee login and lack single-column employee_id indexes

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_employee_id ON public.permission_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_loans_employee_id ON public.loans (employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON public.performance_reviews (employee_id);
CREATE INDEX IF NOT EXISTS idx_training_records_employee_id ON public.training_records (employee_id);
CREATE INDEX IF NOT EXISTS idx_missions_employee_id ON public.missions (employee_id);
CREATE INDEX IF NOT EXISTS idx_violations_employee_id ON public.violations (employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_employee_id ON public.overtime_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON public.employee_documents (employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_employee_id ON public.advances (employee_id);