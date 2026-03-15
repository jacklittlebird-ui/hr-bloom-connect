
-- Fix: Replace overly permissive INSERT policy on audit_logs
-- The trigger function runs as SECURITY DEFINER so it bypasses RLS anyway
-- But we need a valid policy for direct inserts - restrict to authenticated users only
DROP POLICY IF EXISTS "system_audit_logs_insert" ON public.audit_logs;

-- Only the audit trigger (SECURITY DEFINER) can insert - no direct client inserts needed
-- If we need a policy, restrict it to admins only
CREATE POLICY "admin_audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
