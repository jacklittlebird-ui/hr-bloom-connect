ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

CREATE INDEX IF NOT EXISTS idx_user_roles_department ON public.user_roles(department_id) WHERE department_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_user_department_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT department_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'department_manager'
  LIMIT 1
$function$;