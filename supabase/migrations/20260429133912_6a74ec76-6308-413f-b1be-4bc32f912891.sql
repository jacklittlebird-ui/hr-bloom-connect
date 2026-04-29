-- Drop triggers that auto-mutate leave_balances usage columns.
-- leave_balances is now a pure opening-balance table (manual input only).
DROP TRIGGER IF EXISTS update_leave_balance_on_approval_trigger ON public.leave_requests;
DROP TRIGGER IF EXISTS trg_update_leave_balance_on_approval ON public.leave_requests;
DROP TRIGGER IF EXISTS update_leave_balance_on_approval ON public.leave_requests;

DROP TRIGGER IF EXISTS reverse_leave_balance_on_delete_trigger ON public.leave_requests;
DROP TRIGGER IF EXISTS trg_reverse_leave_balance_on_delete ON public.leave_requests;
DROP TRIGGER IF EXISTS reverse_leave_balance_on_delete ON public.leave_requests;

DROP TRIGGER IF EXISTS update_permission_balance_on_approval_trigger ON public.permission_requests;
DROP TRIGGER IF EXISTS trg_update_permission_balance_on_approval ON public.permission_requests;
DROP TRIGGER IF EXISTS update_permission_balance_on_approval ON public.permission_requests;

DROP TRIGGER IF EXISTS reverse_permission_balance_on_delete_trigger ON public.permission_requests;
DROP TRIGGER IF EXISTS trg_reverse_permission_balance_on_delete ON public.permission_requests;
DROP TRIGGER IF EXISTS reverse_permission_balance_on_delete ON public.permission_requests;