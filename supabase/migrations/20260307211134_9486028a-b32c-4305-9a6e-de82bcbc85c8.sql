
-- Add targeting columns to notifications
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES public.stations(id);

-- Update module enum to include more portal types
COMMENT ON COLUMN public.notifications.target_type IS 'general, employee, department, station, broadcast';
