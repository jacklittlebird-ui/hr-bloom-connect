
-- Per-vehicle alert configuration
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS license_alert_days_before integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS maintenance_km_interval integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS maintenance_month_interval integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS current_odometer integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_alert_sent_at timestamptz;

-- Allow station_vehicle_manager to read notifications addressed to them (user_id match)
-- They already can see notifications via existing user_id policy, but add station-targeted as well
CREATE POLICY "svm_notifications_select_station"
  ON public.notifications FOR SELECT
  USING (
    public.has_role(auth.uid(), 'station_vehicle_manager'::app_role)
    AND module = 'vehicles'
    AND station_id IS NOT NULL
    AND station_id = public.get_user_station_id_svm(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_notifications_station_module
  ON public.notifications (station_id, module, is_read);
