
-- Create property_taxes table
CREATE TABLE public.property_taxes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id uuid REFERENCES public.stations(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_date date,
  status text NOT NULL DEFAULT 'pending',
  receipt_number text,
  property_type text,
  address text,
  area_sqm numeric,
  rental_value numeric,
  tax_period text NOT NULL DEFAULT 'annual',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_taxes ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "admin_property_taxes" ON public.property_taxes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_property_taxes_updated_at
  BEFORE UPDATE ON public.property_taxes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_property_taxes_station ON public.property_taxes(station_id);
CREATE INDEX idx_property_taxes_due_date ON public.property_taxes(due_date);
CREATE INDEX idx_property_taxes_status ON public.property_taxes(status);
