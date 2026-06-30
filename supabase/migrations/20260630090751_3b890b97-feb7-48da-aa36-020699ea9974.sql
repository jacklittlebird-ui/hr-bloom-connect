ALTER TABLE public.performance_bonus_records
  ADD COLUMN IF NOT EXISTS sent_to_employee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sent_by uuid;

DROP POLICY IF EXISTS emp_perf_bonus_records ON public.performance_bonus_records;
CREATE POLICY emp_perf_bonus_records
ON public.performance_bonus_records
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'employee'::public.app_role)
  AND employee_id = public.get_user_employee_id(auth.uid())
  AND sent_to_employee = true
);

CREATE OR REPLACE FUNCTION public.notify_on_performance_bonus_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  emp_user_id uuid;
  quarter_label_ar text;
BEGIN
  IF NEW.sent_to_employee = true AND COALESCE(OLD.sent_to_employee, false) = false THEN
    SELECT user_id INTO emp_user_id FROM public.employees WHERE id = NEW.employee_id;

    quarter_label_ar := CASE NEW.quarter
      WHEN 'Q1' THEN 'الربع الأول'
      WHEN 'Q2' THEN 'الربع الثاني'
      WHEN 'Q3' THEN 'الربع الثالث'
      WHEN 'Q4' THEN 'الربع الرابع'
      ELSE NEW.quarter
    END;

    IF emp_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, employee_id, title_ar, title_en, desc_ar, desc_en,
        type, module, target_type
      )
      VALUES (
        emp_user_id,
        NEW.employee_id,
        'تم إرسال مكافأة التقييم - ' || quarter_label_ar || ' ' || NEW.year,
        'Performance Bonus Sent - ' || NEW.quarter || ' ' || NEW.year,
        'النسبة: ' || COALESCE(NEW.percentage::text, '0') || '% - المبلغ: ' || COALESCE(NEW.amount::text, '0'),
        'Rate: ' || COALESCE(NEW.percentage::text, '0') || '% - Amount: ' || COALESCE(NEW.amount::text, '0'),
        'success',
        'salaries',
        'employee'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_performance_bonus_sent ON public.performance_bonus_records;
CREATE TRIGGER trg_notify_performance_bonus_sent
AFTER UPDATE OF sent_to_employee ON public.performance_bonus_records
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_performance_bonus_sent();