CREATE OR REPLACE FUNCTION public.device_alert_to_incident() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_emp uuid; v_station uuid; v_blocked boolean;
BEGIN
  IF NEW.reason = 'soft_match_updated' THEN RETURN NEW; END IF;
  v_blocked := COALESCE((NEW.meta->>'blocked')::boolean, false);
  v_emp := public.get_user_employee_id(NEW.user_id);
  SELECT e.station_id INTO v_station FROM public.employees e WHERE e.id = v_emp;
  INSERT INTO public.attendance_tamper_incidents(created_at,user_id,employee_id,station_id,category,risk_level,reasons,device_id,outcome,evidence,source,source_ref)
  VALUES (NEW.triggered_at, NEW.user_id, v_emp, v_station,
    CASE NEW.reason WHEN 'device_shared_fraud' THEN 'account_sharing' WHEN 'device_limit_reached' THEN 'device_binding' WHEN 'new_device_registered' THEN 'new_device' WHEN 'geofence_miss' THEN 'outside_geofence' ELSE 'other' END,
    CASE WHEN NEW.reason IN ('device_shared_fraud','geofence_miss') OR (NEW.reason='new_device_registered' AND v_blocked) THEN 'high' WHEN NEW.reason = 'new_device_registered' THEN 'low' ELSE 'medium' END,
    ARRAY[NEW.reason], NEW.device_id,
    CASE WHEN NEW.reason IN ('device_shared_fraud','device_limit_reached','geofence_miss') OR (NEW.reason='new_device_registered' AND v_blocked) THEN 'rejected' WHEN NEW.reason = 'new_device_registered' THEN 'pending_verification' ELSE 'flagged' END,
    COALESCE(NEW.meta,'{}'::jsonb), 'device_alerts', NEW.id)
  ON CONFLICT (source_ref) DO NOTHING;
  RETURN NEW;
END $$;