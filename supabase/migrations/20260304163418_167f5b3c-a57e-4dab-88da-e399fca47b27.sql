
-- Add cost fields to training_records
ALTER TABLE public.training_records ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0;
ALTER TABLE public.training_records ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;

-- Create training acknowledgments table
CREATE TABLE public.training_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_record_id uuid NOT NULL REFERENCES public.training_records(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(training_record_id, employee_id)
);

ALTER TABLE public.training_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_ack" ON public.training_acknowledgments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Employee can read and insert own
CREATE POLICY "emp_ack_select" ON public.training_acknowledgments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));

CREATE POLICY "emp_ack_insert" ON public.training_acknowledgments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'employee'::app_role) AND employee_id = get_user_employee_id(auth.uid()));
