-- Create junction table for area_manager to stations mapping
CREATE TABLE IF NOT EXISTS public.area_manager_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_id)
);

-- Enable RLS
ALTER TABLE public.area_manager_stations ENABLE ROW LEVEL SECURITY;

-- Create helper function to get area manager station IDs
CREATE OR REPLACE FUNCTION public.get_area_manager_station_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT station_id FROM public.area_manager_stations
  WHERE user_id = _user_id
$$;
