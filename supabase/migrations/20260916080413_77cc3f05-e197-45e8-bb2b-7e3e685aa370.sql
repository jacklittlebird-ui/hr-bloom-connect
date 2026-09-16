CREATE TABLE public.permit_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  list_key text NOT NULL CHECK (list_key IN (
    'security_airports_issue','security_airports_renew',
    'security_cairo_issue','security_cairo_renew',
    'ports_security_issue','ports_security_renew',
    'port_authority_issue','port_authority_renew'
  )),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, list_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permit_list_entries TO authenticated;
GRANT ALL ON public.permit_list_entries TO service_role;

ALTER TABLE public.permit_list_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR manage permit lists"
ON public.permit_list_entries FOR ALL TO authenticated
USING ((SELECT public.has_role(auth.uid(),'admin'::app_role)) OR (SELECT public.has_role(auth.uid(),'hr'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(),'admin'::app_role)) OR (SELECT public.has_role(auth.uid(),'hr'::app_role)));

CREATE TRIGGER update_permit_list_entries_updated_at
BEFORE UPDATE ON public.permit_list_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_permit_list_entries_list_key ON public.permit_list_entries(list_key);