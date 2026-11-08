CREATE TABLE public.sharm_allowance_runs (
  run_month text PRIMARY KEY,
  employees_count integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  run_by uuid,
  run_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sharm_allowance_runs TO authenticated;
GRANT ALL ON public.sharm_allowance_runs TO service_role;
ALTER TABLE public.sharm_allowance_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_sharm_runs ON public.sharm_allowance_runs TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY hr_sharm_runs ON public.sharm_allowance_runs TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'hr'::app_role))) WITH CHECK ((SELECT public.has_role(auth.uid(), 'hr'::app_role)));