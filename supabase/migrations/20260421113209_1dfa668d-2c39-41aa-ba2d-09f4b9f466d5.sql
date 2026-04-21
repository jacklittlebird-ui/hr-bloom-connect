-- Add new employee status values
ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'resigned';
ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'under_resignation';