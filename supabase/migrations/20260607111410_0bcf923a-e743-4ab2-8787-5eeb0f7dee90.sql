
CREATE OR REPLACE FUNCTION public.audit_dm_multi_dept_policies()
RETURNS TABLE(table_name text, policy_name text, expression text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (n.nspname || '.' || c.relname)::text,
         p.polname::text,
         pg_get_expr(p.polqual, p.polrelid)::text
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%department_manager%'
    AND (
      pg_get_expr(p.polqual, p.polrelid) ILIKE '%get_user_department_id(%'
      OR (
        pg_get_expr(p.polqual, p.polrelid) ILIKE '%department_id =%'
        AND pg_get_expr(p.polqual, p.polrelid) NOT ILIKE '%get_dm_department_ids%'
      )
    );
$$;

REVOKE ALL ON FUNCTION public.audit_dm_multi_dept_policies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_dm_multi_dept_policies() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.log_rls_access_denied(p_module text, p_resource_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action_type, affected_table, record_id, new_data)
  VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'RLS_ACCESS_DENIED',
    p_module,
    p_resource_id,
    jsonb_build_object('module', p_module, 'resource_id', p_resource_id, 'at', now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_rls_access_denied(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_rls_access_denied(text, text) TO authenticated, service_role;
