
-- Create official_holidays table
CREATE TABLE public.official_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  station_ids UUID[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_official_holidays_date ON public.official_holidays(holiday_date);
CREATE INDEX idx_official_holidays_station_ids ON public.official_holidays USING GIN(station_ids);

ALTER TABLE public.official_holidays ENABLE ROW LEVEL SECURITY;

-- Admin manages everything
CREATE POLICY "admin_official_holidays" ON public.official_holidays
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- HR manages everything
CREATE POLICY "hr_official_holidays" ON public.official_holidays
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- All authenticated users can read holidays (so employees see their station's holidays)
CREATE POLICY "read_official_holidays" ON public.official_holidays
  FOR SELECT TO authenticated
  USING (true);
