
-- QR-based attendance module tables

-- Locations for QR kiosks (geofencing)
CREATE TABLE IF NOT EXISTS public.qr_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  station_id uuid REFERENCES public.stations(id),
  latitude double precision,
  longitude double precision,
  radius_m integer DEFAULT 150,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- QR attendance events (check in/out scans)
CREATE TABLE IF NOT EXISTS public.attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('check_in', 'check_out')),
  device_id text NOT NULL,
  location_id uuid REFERENCES public.qr_locations(id),
  gps_lat double precision,
  gps_lng double precision,
  token_ts timestamptz NOT NULL,
  scan_time timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_events_user_time
  ON public.attendance_events (user_id, scan_time DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_events_employee
  ON public.attendance_events (employee_id, scan_time DESC);

-- Device binding (1 user = 1 device)
CREATE TABLE IF NOT EXISTS public.user_devices (
  user_id uuid PRIMARY KEY,
  device_id text UNIQUE NOT NULL,
  bound_at timestamptz NOT NULL DEFAULT now()
);

-- Anti-cheat alerts
CREATE TABLE IF NOT EXISTS public.device_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb
);

-- RLS
ALTER TABLE public.qr_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_alerts ENABLE ROW LEVEL SECURITY;

-- QR Locations: authenticated can read active, admin can manage
CREATE POLICY "auth_read_qr_locations" ON public.qr_locations
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "admin_manage_qr_locations" ON public.qr_locations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Attendance events: users read own, no direct client writes (edge function uses service role)
CREATE POLICY "read_own_attendance_events" ON public.attendance_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_read_all_attendance_events" ON public.attendance_events
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User devices: users read own
CREATE POLICY "read_own_device" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_devices" ON public.user_devices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Device alerts: admin only
CREATE POLICY "admin_device_alerts" ON public.device_alerts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
