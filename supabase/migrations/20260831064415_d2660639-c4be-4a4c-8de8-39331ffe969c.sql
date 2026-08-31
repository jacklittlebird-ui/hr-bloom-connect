REVOKE ALL ON FUNCTION public.get_user_scoped_station_ids(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manager_notify(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_scoped_station_ids(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_manager_notify(uuid, uuid, uuid, uuid) TO service_role;