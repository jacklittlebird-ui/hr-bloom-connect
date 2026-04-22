CREATE OR REPLACE FUNCTION public.get_user_station_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT station_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role IN ('station_manager'::app_role, 'department_manager'::app_role)
    AND station_id IS NOT NULL
  ORDER BY CASE role
    WHEN 'station_manager'::app_role THEN 1
    WHEN 'department_manager'::app_role THEN 2
    ELSE 99
  END
  LIMIT 1
$$;