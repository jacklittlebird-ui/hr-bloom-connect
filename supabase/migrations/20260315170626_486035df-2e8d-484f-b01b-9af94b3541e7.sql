
-- Fix: Recreate employee_limited_view with SECURITY INVOKER so RLS applies
DROP VIEW IF EXISTS public.employee_limited_view;

CREATE VIEW public.employee_limited_view
WITH (security_invoker = true)
AS SELECT 
  id, employee_code, name_ar, name_en, first_name, father_name, family_name,
  email, phone, gender, avatar, status, employment_status, contract_type,
  hire_date, resignation_date, resigned, department_id, station_id,
  job_title_ar, job_title_en, job_level, job_degree, dept_code,
  user_id, created_at, updated_at
FROM public.employees;
