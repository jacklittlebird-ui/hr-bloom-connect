CREATE OR REPLACE FUNCTION public.update_employee_job_function(_employee_id uuid, _dept_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'training_manager'::app_role)
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.employees
    SET dept_code = NULLIF(_dept_code, '')
  WHERE id = _employee_id
  RETURNING dept_code INTO v;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee not found';
  END IF;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.update_employee_job_function(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_employee_job_function(uuid, text) TO authenticated;