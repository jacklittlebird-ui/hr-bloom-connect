ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_checkin_method_override_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_checkin_method_override_check
  CHECK (checkin_method_override IS NULL OR checkin_method_override IN ('qr', 'gps', 'both', 'ble'));