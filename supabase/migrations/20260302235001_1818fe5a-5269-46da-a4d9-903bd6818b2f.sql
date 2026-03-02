-- Remove unique constraints that prevent multiple attendance records per employee per day
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS uq_attendance_emp_date;
DROP INDEX IF EXISTS public.idx_attendance_unique;

-- Create a non-unique index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance_records (employee_id, date);