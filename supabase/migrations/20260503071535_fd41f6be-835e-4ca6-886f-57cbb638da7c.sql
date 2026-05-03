ALTER TABLE public.permission_requests ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.overtime_requests ADD COLUMN IF NOT EXISTS rejection_reason text;