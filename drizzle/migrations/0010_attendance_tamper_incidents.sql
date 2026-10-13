CREATE TABLE public.attendance_tamper_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_no bigserial,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  station_id uuid REFERENCES public.stations(id) ON DELETE SET NULL,
  event_type text,
  category text NOT NULL,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high')),
  reasons text[] NOT NULL DEFAULT '{}',
  device_id text,
  outcome text NOT NULL DEFAULT 'flagged' CHECK (outcome IN ('accepted','flagged','pending_verification','rejected')),
  review_status text NOT NULL DEFAULT 'new' CHECK (review_status IN ('new','under_review','resolved','escalated')),
  reviewer_id uuid,
  reviewer_name text,
  review_notes text,
  reviewed_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'gps-checkin',
  source_ref uuid UNIQUE
);
CREATE INDEX idx_tamper_created ON public.attendance_tamper_incidents(created_at DESC);
CREATE INDEX idx_tamper_employee ON public.attendance_tamper_incidents(employee_id);
CREATE INDEX idx_tamper_station ON public.attendance_tamper_incidents(station_id);
CREATE INDEX idx_tamper_status ON public.attendance_tamper_incidents(review_status);

GRANT SELECT, UPDATE ON public.attendance_tamper_incidents TO authenticated;
GRANT ALL ON public.attendance_tamper_incidents TO service_role;
ALTER TABLE public.attendance_tamper_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tamper_select_admin_hr" ON public.attendance_tamper_incidents FOR SELECT TO authenticated
USING ((SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr'))
  OR station_id IN (SELECT public.get_user_scoped_station_ids(auth.uid())));
CREATE POLICY "tamper_update_admin_hr" ON public.attendance_tamper_incidents FOR UPDATE TO authenticated
USING ((SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr')))
WITH CHECK ((SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr')));

CREATE OR REPLACE FUNCTION public.protect_tamper_evidence() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.id := OLD.id; NEW.incident_no := OLD.incident_no; NEW.created_at := OLD.created_at;
  NEW.user_id := OLD.user_id; NEW.employee_id := OLD.employee_id; NEW.station_id := OLD.station_id;
  NEW.event_type := OLD.event_type; NEW.category := OLD.category; NEW.risk_level := OLD.risk_level;
  NEW.reasons := OLD.reasons; NEW.device_id := OLD.device_id; NEW.outcome := OLD.outcome;
  NEW.evidence := OLD.evidence; NEW.source := OLD.source; NEW.source_ref := OLD.source_ref;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_tamper_evidence BEFORE UPDATE ON public.attendance_tamper_incidents
FOR EACH ROW EXECUTE FUNCTION public.protect_tamper_evidence();

CREATE TRIGGER trg_audit_tamper AFTER UPDATE ON public.attendance_tamper_incidents
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE OR REPLACE FUNCTION public.device_alert_to_incident() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_emp uuid; v_station uuid;
BEGIN
  IF NEW.reason = 'soft_match_updated' THEN RETURN NEW; END IF;
  v_emp := public.get_user_employee_id(NEW.user_id);
  SELECT e.station_id INTO v_station FROM public.employees e WHERE e.id = v_emp;
  INSERT INTO public.attendance_tamper_incidents(created_at,user_id,employee_id,station_id,category,risk_level,reasons,device_id,outcome,evidence,source,source_ref)
  VALUES (NEW.triggered_at, NEW.user_id, v_emp, v_station,
    CASE NEW.reason WHEN 'device_shared_fraud' THEN 'account_sharing' WHEN 'device_limit_reached' THEN 'device_binding' WHEN 'new_device_registered' THEN 'new_device' ELSE 'other' END,
    CASE NEW.reason WHEN 'device_shared_fraud' THEN 'high' WHEN 'new_device_registered' THEN 'low' ELSE 'medium' END,
    ARRAY[NEW.reason], NEW.device_id,
    CASE NEW.reason WHEN 'device_shared_fraud' THEN 'rejected' WHEN 'device_limit_reached' THEN 'rejected' WHEN 'new_device_registered' THEN 'pending_verification' ELSE 'flagged' END,
    COALESCE(NEW.meta,'{}'::jsonb), 'device_alerts', NEW.id)
  ON CONFLICT (source_ref) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_device_alert_to_incident AFTER INSERT ON public.device_alerts
FOR EACH ROW EXECUTE FUNCTION public.device_alert_to_incident();

INSERT INTO public.attendance_tamper_incidents(created_at,user_id,employee_id,station_id,category,risk_level,reasons,device_id,outcome,evidence,source,source_ref)
SELECT d.triggered_at, d.user_id, x.emp, e.station_id,
  CASE d.reason WHEN 'device_shared_fraud' THEN 'account_sharing' WHEN 'device_limit_reached' THEN 'device_binding' WHEN 'new_device_registered' THEN 'new_device' ELSE 'other' END,
  CASE d.reason WHEN 'device_shared_fraud' THEN 'high' WHEN 'new_device_registered' THEN 'low' ELSE 'medium' END,
  ARRAY[d.reason], d.device_id,
  CASE d.reason WHEN 'device_shared_fraud' THEN 'rejected' WHEN 'device_limit_reached' THEN 'rejected' WHEN 'new_device_registered' THEN 'pending_verification' ELSE 'flagged' END,
  COALESCE(d.meta,'{}'::jsonb), 'device_alerts', d.id
FROM public.device_alerts d
CROSS JOIN LATERAL (SELECT public.get_user_employee_id(d.user_id) AS emp) x
LEFT JOIN public.employees e ON e.id = x.emp
WHERE d.reason <> 'soft_match_updated'
ON CONFLICT (source_ref) DO NOTHING;

CREATE TABLE public.attendance_risk_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid UNIQUE REFERENCES public.stations(id) ON DELETE CASCADE,
  max_accuracy_m numeric NOT NULL DEFAULT 150,
  max_speed_kmh numeric NOT NULL DEFAULT 250,
  max_location_age_s integer NOT NULL DEFAULT 300,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_risk_rules TO authenticated;
GRANT ALL ON public.attendance_risk_rules TO service_role;
ALTER TABLE public.attendance_risk_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_rules_admin_hr" ON public.attendance_risk_rules FOR ALL TO authenticated
USING ((SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr')))
WITH CHECK ((SELECT public.has_role(auth.uid(),'admin')) OR (SELECT public.has_role(auth.uid(),'hr')));
INSERT INTO public.attendance_risk_rules(station_id) VALUES (NULL);

ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS qr_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS approved_status text NOT NULL DEFAULT 'approved';