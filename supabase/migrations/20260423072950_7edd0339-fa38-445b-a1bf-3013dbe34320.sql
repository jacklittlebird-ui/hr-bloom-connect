-- Add new role: station_hr (Station HR) - same access as station_manager but no approvals/evaluations actions
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'station_hr';