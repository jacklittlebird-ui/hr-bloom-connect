
-- Add new role: station_vehicle_manager (per-station vehicles-only access)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'station_vehicle_manager';
