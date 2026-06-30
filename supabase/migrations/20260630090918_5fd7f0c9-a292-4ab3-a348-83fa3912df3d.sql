CREATE OR REPLACE FUNCTION public.get_my_performance_reviews()
RETURNS TABLE (
  id uuid,
  employee_id uuid,
  quarter text,
  year text,
  score numeric,
  status text,
  review_date date,
  strengths text,
  improvements text,
  goals text,
  bonus_percentage numeric,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    pr.id,
    pr.employee_id,
    pr.quarter,
    pr.year,
    pr.score,
    pr.status,
    pr.review_date,
    pr.strengths,
    pr.improvements,
    pr.goals,
    pr.bonus_percentage,
    pr.created_at
  FROM public.performance_reviews pr
  WHERE pr.employee_id = public.get_user_employee_id(auth.uid())
    AND pr.status IN ('submitted', 'approved', 'completed')
  ORDER BY pr.created_at DESC
  LIMIT 100;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_performance_bonuses()
RETURNS TABLE (
  id uuid,
  employee_id uuid,
  year text,
  quarter text,
  percentage numeric,
  score numeric,
  gross_salary numeric,
  amount numeric,
  station_name text,
  department_name text,
  job_title text,
  sent_to_employee boolean,
  sent_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    pbr.id,
    pbr.employee_id,
    pbr.year,
    pbr.quarter,
    pbr.percentage,
    pbr.score,
    pbr.gross_salary,
    pbr.amount,
    pbr.station_name,
    pbr.department_name,
    pbr.job_title,
    pbr.sent_to_employee,
    pbr.sent_at,
    pbr.created_at
  FROM public.performance_bonus_records pbr
  WHERE pbr.employee_id = public.get_user_employee_id(auth.uid())
    AND pbr.sent_to_employee = true
  ORDER BY pbr.year DESC, pbr.quarter DESC, pbr.sent_at DESC NULLS LAST, pbr.created_at DESC
  LIMIT 100;
$function$;

REVOKE ALL ON FUNCTION public.get_my_performance_reviews() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_performance_bonuses() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_on_performance_bonus_sent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_performance_reviews() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_performance_bonuses() TO authenticated;