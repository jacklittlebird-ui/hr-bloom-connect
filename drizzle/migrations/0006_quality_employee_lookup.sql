CREATE OR REPLACE FUNCTION public.get_quality_employees()
RETURNS TABLE(id uuid, employee_code text, name_ar text, name_en text, station_id uuid, job_title_ar text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.employee_code, e.name_ar, e.name_en, e.station_id, e.job_title_ar
  FROM public.employees e
  WHERE e.status = 'active'
    AND (public.has_role(auth.uid(),'quality') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  ORDER BY e.name_ar;
$$;
REVOKE EXECUTE ON FUNCTION public.get_quality_employees() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_quality_employees() TO authenticated;