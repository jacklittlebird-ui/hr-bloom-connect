REVOKE ALL ON FUNCTION public.auto_attendance_on_mission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_attendance_on_mission() FROM anon;
REVOKE ALL ON FUNCTION public.auto_attendance_on_mission() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.auto_attendance_on_mission() TO service_role;