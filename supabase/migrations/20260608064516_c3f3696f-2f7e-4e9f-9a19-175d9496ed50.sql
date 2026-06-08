-- Track cron job health pings
CREATE TABLE public.cron_health_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT true,
  records_processed integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cron_health_pings_job_time ON public.cron_health_pings(job_name, last_run_at DESC);

GRANT SELECT ON public.cron_health_pings TO authenticated;
GRANT ALL ON public.cron_health_pings TO service_role;

ALTER TABLE public.cron_health_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR can view cron health pings"
ON public.cron_health_pings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- Helper function for the dashboard banner / health check function
CREATE OR REPLACE FUNCTION public.get_cron_last_success(p_job_name text)
RETURNS timestamptz
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MAX(last_run_at)
  FROM public.cron_health_pings
  WHERE job_name = p_job_name AND success = true
$$;

GRANT EXECUTE ON FUNCTION public.get_cron_last_success(text) TO authenticated;