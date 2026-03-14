
-- Performance review: notify when status changes to 'completed' or review is created
CREATE OR REPLACE FUNCTION public.notify_on_performance_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- On insert (new review)
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تقييم أداء جديد - ' || COALESCE(emp_name, '') || ' - ' || quarter_label_ar || ' ' || NEW.year,
      'New Performance Review - ' || COALESCE(emp_name, '') || ' - ' || NEW.quarter || ' ' || NEW.year,
      'الدرجة: ' || COALESCE(NEW.score::text, 'لم تحدد بعد'),
      'Score: ' || COALESCE(NEW.score::text, 'Not set yet'),
      'info', 'performance'
    );
  -- On update: status changed to completed
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status AND NEW.status = 'completed' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تم اعتماد تقييم الأداء - ' || COALESCE(emp_name, '') || ' - ' || quarter_label_ar || ' ' || NEW.year,
      'Performance Review Completed - ' || COALESCE(emp_name, '') || ' - ' || NEW.quarter || ' ' || NEW.year,
      'الدرجة: ' || COALESCE(NEW.score::text, '0'),
      'Score: ' || COALESCE(NEW.score::text, '0'),
      'success', 'performance'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_performance_review
AFTER INSERT OR UPDATE ON performance_reviews
FOR EACH ROW
EXECUTE FUNCTION notify_on_performance_review();
