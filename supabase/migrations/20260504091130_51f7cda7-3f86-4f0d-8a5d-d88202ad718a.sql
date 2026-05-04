ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS engine_capacity_liters numeric(4,1),
  ADD COLUMN IF NOT EXISTS cylinders_count integer,
  ADD COLUMN IF NOT EXISTS passengers_count integer,
  ADD COLUMN IF NOT EXISTS inspection_year integer;