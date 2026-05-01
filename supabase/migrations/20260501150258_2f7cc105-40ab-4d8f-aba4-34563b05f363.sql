ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS weekend_days jsonb NOT NULL DEFAULT '[5, 6]'::jsonb;

UPDATE public.stations
SET weekend_days = '[5, 6]'::jsonb
WHERE weekend_days IS NULL;