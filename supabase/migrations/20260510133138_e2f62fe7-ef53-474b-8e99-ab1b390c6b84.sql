ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS checkin_method_override text;
ALTER TABLE public.employees ADD CONSTRAINT employees_checkin_method_override_check
  CHECK (checkin_method_override IS NULL OR checkin_method_override IN ('qr', 'gps', 'both'));