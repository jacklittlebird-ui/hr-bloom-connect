REVOKE ALL ON FUNCTION public.calculate_work_hours() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_work_hours() FROM anon;
REVOKE ALL ON FUNCTION public.calculate_work_hours() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_work_hours() TO service_role;