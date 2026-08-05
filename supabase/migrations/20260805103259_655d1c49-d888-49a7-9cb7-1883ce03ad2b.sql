-- 1) Drop duplicate/redundant indexes (same columns, different names)
DROP INDEX IF EXISTS public.idx_employees_code;
DROP INDEX IF EXISTS public.idx_employees_station;
DROP INDEX IF EXISTS public.idx_employees_department;
DROP INDEX IF EXISTS public.idx_employees_status;

DROP INDEX IF EXISTS public.idx_attendance_emp_date;
DROP INDEX IF EXISTS public.idx_attendance_emp;
DROP INDEX IF EXISTS public.idx_attendance_records_status;
DROP INDEX IF EXISTS public.idx_attendance_date;

DROP INDEX IF EXISTS public.idx_leaves_employee;
DROP INDEX IF EXISTS public.idx_leaves_status;
DROP INDEX IF EXISTS public.idx_leave_requests_emp;
DROP INDEX IF EXISTS public.idx_leave_emp;
DROP INDEX IF EXISTS public.idx_leave_status;

DROP INDEX IF EXISTS public.idx_bills_employee;
DROP INDEX IF EXISTS public.idx_mobile_bills_emp;

DROP INDEX IF EXISTS public.idx_installments_loan;
DROP INDEX IF EXISTS public.idx_overtime_emp;

-- 2) Indexes matching the ORDER BY of the heavy list screens
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period
  ON public.payroll_entries (year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_emp_period
  ON public.payroll_entries (employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_uniforms_delivery_date
  ON public.uniforms (delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at
  ON public.leave_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status_start
  ON public.leave_requests (status, start_date);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_created_at
  ON public.overtime_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_status_date
  ON public.overtime_requests (status, date);
CREATE INDEX IF NOT EXISTS idx_attendance_events_emp_scan_asc
  ON public.attendance_events (employee_id, scan_time);

-- 3) Refresh planner statistics
ANALYZE public.attendance_events;
ANALYZE public.attendance_records;
ANALYZE public.payroll_entries;
ANALYZE public.uniforms;
ANALYZE public.leave_requests;
ANALYZE public.overtime_requests;
ANALYZE public.employees;