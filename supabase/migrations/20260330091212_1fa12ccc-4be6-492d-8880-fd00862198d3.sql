ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'external_stations';
ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'stopped';
ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'absent';
ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'pending_hire';