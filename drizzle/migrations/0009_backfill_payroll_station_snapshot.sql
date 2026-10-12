SET LOCAL statement_timeout = '300s';
CREATE TEMP TABLE h ON COMMIT DROP AS
SELECT record_id::uuid AS emp, created_at,
  NULLIF(old_data->>'station_id','')::uuid os, NULLIF(new_data->>'station_id','')::uuid ns,
  NULLIF(old_data->>'department_id','')::uuid od, NULLIF(new_data->>'department_id','')::uuid nd
FROM public.audit_logs WHERE affected_table='employees' AND action_type='UPDATE'
  AND record_id ~ '^[0-9a-f-]{36}$'
  AND ((old_data->>'station_id') IS DISTINCT FROM (new_data->>'station_id')
    OR (old_data->>'department_id') IS DISTINCT FROM (new_data->>'department_id'));
CREATE INDEX ON h(emp, created_at);
WITH p AS (
  SELECT pe.id, pe.employee_id, make_date(pe.year::int, pe.month::int, 1) + interval '1 month' cutoff
  FROM public.payroll_entries pe WHERE pe.year ~ '^\d{4}$' AND pe.month ~ '^\d{1,2}$'
), r AS (
  SELECT p.id,
    COALESCE((SELECT ns FROM h WHERE h.emp=p.employee_id AND h.created_at<=p.cutoff AND ns IS NOT NULL ORDER BY created_at DESC LIMIT 1),
             (SELECT os FROM h WHERE h.emp=p.employee_id AND h.created_at>p.cutoff AND os IS NOT NULL ORDER BY created_at LIMIT 1),
             e.station_id) st,
    COALESCE((SELECT nd FROM h WHERE h.emp=p.employee_id AND h.created_at<=p.cutoff AND nd IS NOT NULL ORDER BY created_at DESC LIMIT 1),
             (SELECT od FROM h WHERE h.emp=p.employee_id AND h.created_at>p.cutoff AND od IS NOT NULL ORDER BY created_at LIMIT 1),
             e.department_id) dep
  FROM p JOIN public.employees e ON e.id=p.employee_id
)
UPDATE public.payroll_entries pe SET station_id=r.st, department_id=r.dep FROM r WHERE r.id=pe.id;