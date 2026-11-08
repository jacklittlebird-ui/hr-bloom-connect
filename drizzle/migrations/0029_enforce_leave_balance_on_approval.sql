-- Data correction for emp1720 (requested by the user): excess days become unpaid
UPDATE public.leave_requests SET leave_type = 'unpaid' WHERE id = '4063a50f-5143-4714-98e5-ced04ba46343' AND leave_type = 'casual';
UPDATE public.leave_requests SET days = 1, end_date = '2026-10-25' WHERE id = '0b55ce28-5b25-42d3-9e82-4cae17f1b068' AND days = 2;
INSERT INTO public.leave_requests (employee_id, leave_type, start_date, end_date, days, status, reason)
SELECT '08e0815c-2861-4238-818f-49f25f5e1288', 'unpaid', '2026-10-26', '2026-10-26', 1, 'approved', 'تحويل يوم سنوي زائد عن الرصيد'
WHERE NOT EXISTS (SELECT 1 FROM public.leave_requests WHERE employee_id='08e0815c-2861-4238-818f-49f25f5e1288' AND start_date='2026-10-26' AND leave_type='unpaid');

CREATE OR REPLACE FUNCTION public.enforce_leave_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  y int; total numeric; used numeric; ot numeric := 0; lb record; label text;
BEGIN
  IF NEW.status <> 'approved' OR NEW.leave_type NOT IN ('annual','casual','sick') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND OLD.leave_type = NEW.leave_type
     AND OLD.days IS NOT DISTINCT FROM NEW.days AND OLD.start_date = NEW.start_date THEN RETURN NEW; END IF;
  y := EXTRACT(YEAR FROM NEW.start_date);
  SELECT * INTO lb FROM public.leave_balances WHERE employee_id = NEW.employee_id AND year = y;
  IF NEW.leave_type = 'annual' THEN
    total := COALESCE(lb.annual_total, 0); label := 'السنوية';
    SELECT COALESCE(SUM(CASE WHEN overtime_type = 'eid_first_day' THEN 2 ELSE 1 END),0) INTO ot
      FROM public.overtime_requests WHERE employee_id = NEW.employee_id AND status = 'approved' AND EXTRACT(YEAR FROM date) = y;
  ELSIF NEW.leave_type = 'casual' THEN total := COALESCE(lb.casual_total, 7); label := 'العارضة';
  ELSE total := COALESCE(lb.sick_total, 0); label := 'المرضية';
  END IF;
  SELECT COALESCE(SUM(days),0) INTO used FROM public.leave_requests
    WHERE employee_id = NEW.employee_id AND status = 'approved' AND leave_type = NEW.leave_type
      AND EXTRACT(YEAR FROM start_date) = y AND id <> NEW.id;
  IF NEW.days > (total + ot - used) THEN
    RAISE EXCEPTION 'لا يمكن قبول الإجازة: رصيد الإجازات % المتبقي % يوم والمطلوب % يوم', label, GREATEST(total + ot - used, 0), NEW.days
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_leave_balance ON public.leave_requests;
CREATE TRIGGER trg_enforce_leave_balance BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_leave_balance();