
-- ============================================
-- AUDIT LOGGING SYSTEM
-- ============================================

-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  affected_table text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_affected_table ON public.audit_logs(affected_table);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "admin_audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert (via triggers)
CREATE POLICY "system_audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No one can update or delete audit logs
-- (no UPDATE/DELETE policies = immutable)

-- ============================================
-- AUDIT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  audit_user_id uuid;
  audit_action text;
  audit_record_id text;
  audit_old jsonb;
  audit_new jsonb;
BEGIN
  audit_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF TG_OP = 'INSERT' THEN
    audit_action := 'INSERT';
    audit_record_id := NEW.id::text;
    audit_old := NULL;
    audit_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    audit_record_id := NEW.id::text;
    audit_old := to_jsonb(OLD);
    audit_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    audit_record_id := OLD.id::text;
    audit_old := to_jsonb(OLD);
    audit_new := NULL;
  END IF;

  INSERT INTO public.audit_logs (user_id, action_type, affected_table, record_id, old_data, new_data)
  VALUES (audit_user_id, audit_action, TG_TABLE_NAME, audit_record_id, audit_old, audit_new);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- ATTACH AUDIT TRIGGERS TO SENSITIVE TABLES
-- ============================================

-- Employees (salary, bank, personal data)
CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Payroll entries
CREATE TRIGGER audit_payroll_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- User roles (role changes)
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Profiles
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Loans
CREATE TRIGGER audit_loans
  AFTER INSERT OR UPDATE OR DELETE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Advances
CREATE TRIGGER audit_advances
  AFTER INSERT OR UPDATE OR DELETE ON public.advances
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Bonus records
CREATE TRIGGER audit_bonus_records
  AFTER INSERT OR UPDATE OR DELETE ON public.bonus_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Eid bonuses
CREATE TRIGGER audit_eid_bonuses
  AFTER INSERT OR UPDATE OR DELETE ON public.eid_bonuses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Leave requests
CREATE TRIGGER audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Assets
CREATE TRIGGER audit_assets
  AFTER INSERT OR UPDATE OR DELETE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Performance reviews
CREATE TRIGGER audit_performance_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
