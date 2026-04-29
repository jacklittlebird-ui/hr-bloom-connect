-- ============================================
-- Fix 1: Remove DOUBLE-COUNTING of overtime in annual leave balance
-- ============================================
-- The frontend already adds overtime days (with eid_first_day = 2) to the
-- annual_total in the UI. The DB triggers were ALSO mutating annual_total in
-- leave_balances, causing:
--   1. Double-counting of overtime days.
--   2. eid_first_day adding only +1 (instead of +2) on approval.
--   3. Reverse trigger using GREATEST(21, ...) which RESET the balance to 21
--      instead of subtracting from the actual current value.
--
-- Fix: drop the triggers entirely. Frontend remains the single source of truth
-- for the displayed annual balance (DB stores the base annual_total only).

DROP TRIGGER IF EXISTS trg_update_annual_balance_on_overtime ON public.overtime_requests;
DROP TRIGGER IF EXISTS trg_overtime_balance_on_approval ON public.overtime_requests;
DROP TRIGGER IF EXISTS update_annual_balance_on_overtime_approval ON public.overtime_requests;

DROP TRIGGER IF EXISTS trg_reverse_overtime_on_delete ON public.overtime_requests;
DROP TRIGGER IF EXISTS reverse_overtime_balance_on_delete ON public.overtime_requests;

DROP FUNCTION IF EXISTS public.update_annual_balance_on_overtime_approval() CASCADE;
DROP FUNCTION IF EXISTS public.reverse_overtime_balance_on_delete() CASCADE;

-- ============================================
-- Fix 2: Restore correct base annual_total for any employee whose annual_total
-- was inflated by the buggy triggers above. Reset to the employee's configured
-- annual_leave_balance (default 21) for the current year.
-- ============================================
UPDATE public.leave_balances lb
SET annual_total = COALESCE(
  (SELECT e.annual_leave_balance FROM public.employees e WHERE e.id = lb.employee_id),
  21
)
WHERE lb.year = EXTRACT(YEAR FROM now())::int;

-- ============================================
-- Fix 3: Performance index on attendance_records.status
-- (requested optimization)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attendance_records_status
  ON public.attendance_records(status);