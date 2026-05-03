CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text NOT NULL,
  code text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_overnight boolean NOT NULL DEFAULT false,
  break_duration int NOT NULL DEFAULT 30,
  work_duration numeric(4,2) NOT NULL DEFAULT 8,
  color text NOT NULL DEFAULT '#22c55e',
  station_id uuid REFERENCES public.stations(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shifts_station ON public.shifts(station_id);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON public.shifts(is_active);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view shifts"
ON public.shifts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins/HR can insert shifts"
ON public.shifts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Admins/HR can update shifts"
ON public.shifts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Admins/HR can delete shifts"
ON public.shifts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role));

CREATE TRIGGER update_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();