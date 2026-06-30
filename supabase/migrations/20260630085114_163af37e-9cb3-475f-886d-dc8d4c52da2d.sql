
CREATE OR REPLACE FUNCTION public.notify_on_performance_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp_name text;
  quarter_label_ar text;
BEGIN
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;

  quarter_label_ar := CASE NEW.quarter
    WHEN 'Q1' THEN 'الربع الأول'
    WHEN 'Q2' THEN 'الربع الثاني'
    WHEN 'Q3' THEN 'الربع الثالث'
    WHEN 'Q4' THEN 'الربع الرابع'
    ELSE NEW.quarter
  END;

  IF TG_OP = 'INSERT' AND NEW.status IN ('submitted','approved','completed') THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تقييم أداء جديد - ' || COALESCE(emp_name, '') || ' - ' || quarter_label_ar || ' ' || NEW.year,
      'New Performance Review - ' || COALESCE(emp_name, '') || ' - ' || NEW.quarter || ' ' || NEW.year,
      'الدرجة: ' || COALESCE(NEW.score::text, 'لم تحدد بعد'),
      'Score: ' || COALESCE(NEW.score::text, 'Not set yet'),
      'info', 'performance'
    );
  ELSIF TG_OP = 'UPDATE'
        AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('submitted','approved','completed') THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تم إرسال تقييم الأداء - ' || COALESCE(emp_name, '') || ' - ' || quarter_label_ar || ' ' || NEW.year,
      'Performance Review Sent - ' || COALESCE(emp_name, '') || ' - ' || NEW.quarter || ' ' || NEW.year,
      'الدرجة: ' || COALESCE(NEW.score::text, '0'),
      'Score: ' || COALESCE(NEW.score::text, '0'),
      'success', 'performance'
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_on_performance_review ON public.performance_reviews;
CREATE TRIGGER trg_notify_on_performance_review
AFTER INSERT OR UPDATE ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_on_performance_review();
