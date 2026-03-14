
-- Helper function to send notifications to an employee + all admins + HR
CREATE OR REPLACE FUNCTION public.notify_employee_and_admins(
  p_employee_id uuid,
  p_title_ar text,
  p_title_en text,
  p_desc_ar text DEFAULT NULL,
  p_desc_en text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_module text DEFAULT 'general'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_user_id uuid;
  admin_hr_row record;
BEGIN
  -- Get employee's user_id
  SELECT user_id INTO emp_user_id FROM employees WHERE id = p_employee_id;
  
  -- Notify the employee (if they have a user account)
  IF emp_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, employee_id, title_ar, title_en, desc_ar, desc_en, type, module, target_type)
    VALUES (emp_user_id, p_employee_id, p_title_ar, p_title_en, p_desc_ar, p_desc_en, p_type, p_module, 'employee');
  END IF;
  
  -- Notify all admins and HR users
  FOR admin_hr_row IN
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role IN ('admin', 'hr')
      AND ur.user_id IS NOT NULL
      AND ur.user_id != COALESCE(emp_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO notifications (user_id, title_ar, title_en, desc_ar, desc_en, type, module, target_type)
    VALUES (admin_hr_row.user_id, p_title_ar, p_title_en, p_desc_ar, p_desc_en, p_type, p_module, 'employee');
  END LOOP;
END;
$$;

-- 1. Leave requests: approved/rejected
CREATE OR REPLACE FUNCTION public.notify_on_leave_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
  leave_label_ar text;
  leave_label_en text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  
  CASE NEW.leave_type
    WHEN 'annual' THEN leave_label_ar := 'سنوية'; leave_label_en := 'Annual';
    WHEN 'sick' THEN leave_label_ar := 'مرضية'; leave_label_en := 'Sick';
    WHEN 'casual' THEN leave_label_ar := 'عارضة'; leave_label_en := 'Casual';
    WHEN 'unpaid' THEN leave_label_ar := 'بدون راتب'; leave_label_en := 'Unpaid';
    ELSE leave_label_ar := NEW.leave_type; leave_label_en := NEW.leave_type;
  END CASE;
  
  IF NEW.status = 'approved' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تمت الموافقة على إجازة ' || leave_label_ar || ' - ' || COALESCE(emp_name, ''),
      leave_label_en || ' Leave Approved - ' || COALESCE(emp_name, ''),
      'من ' || NEW.start_date || ' إلى ' || NEW.end_date || ' (' || NEW.days || ' يوم)',
      'From ' || NEW.start_date || ' to ' || NEW.end_date || ' (' || NEW.days || ' days)',
      'success', 'leaves'
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تم رفض إجازة ' || leave_label_ar || ' - ' || COALESCE(emp_name, ''),
      leave_label_en || ' Leave Rejected - ' || COALESCE(emp_name, ''),
      COALESCE(NEW.rejection_reason, ''),
      COALESCE(NEW.rejection_reason, ''),
      'warning', 'leaves'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_leave_status
AFTER UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_leave_status_change();

-- 2. Permission requests: approved/rejected
CREATE OR REPLACE FUNCTION public.notify_on_permission_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  
  IF NEW.status = 'approved' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تمت الموافقة على إذن - ' || COALESCE(emp_name, ''),
      'Permission Approved - ' || COALESCE(emp_name, ''),
      'تاريخ ' || NEW.date || ' من ' || NEW.start_time || ' إلى ' || NEW.end_time,
      'Date ' || NEW.date || ' from ' || NEW.start_time || ' to ' || NEW.end_time,
      'success', 'leaves'
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تم رفض إذن - ' || COALESCE(emp_name, ''),
      'Permission Rejected - ' || COALESCE(emp_name, ''),
      NULL, NULL, 'warning', 'leaves'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_permission_status
AFTER UPDATE ON permission_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_permission_status_change();

-- 3. Mission requests: approved/rejected
CREATE OR REPLACE FUNCTION public.notify_on_mission_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
  mission_label_ar text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  
  CASE NEW.mission_type
    WHEN 'morning' THEN mission_label_ar := 'صباحية';
    WHEN 'evening' THEN mission_label_ar := 'مسائية';
    ELSE mission_label_ar := 'يوم كامل';
  END CASE;
  
  IF NEW.status = 'approved' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تمت الموافقة على مأمورية ' || mission_label_ar || ' - ' || COALESCE(emp_name, ''),
      'Mission Approved - ' || COALESCE(emp_name, ''),
      'تاريخ ' || NEW.date || COALESCE(' - ' || NEW.destination, ''),
      'Date ' || NEW.date || COALESCE(' - ' || NEW.destination, ''),
      'success', 'leaves'
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تم رفض مأمورية - ' || COALESCE(emp_name, ''),
      'Mission Rejected - ' || COALESCE(emp_name, ''),
      NULL, NULL, 'warning', 'leaves'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_mission_status
AFTER UPDATE ON missions
FOR EACH ROW
EXECUTE FUNCTION notify_on_mission_status_change();

-- 4. Overtime requests: approved/rejected
CREATE OR REPLACE FUNCTION public.notify_on_overtime_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  
  IF NEW.status = 'approved' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تمت الموافقة على عمل إضافي - ' || COALESCE(emp_name, ''),
      'Overtime Approved - ' || COALESCE(emp_name, ''),
      'تاريخ ' || NEW.date || ' - ' || NEW.hours || ' ساعات',
      'Date ' || NEW.date || ' - ' || NEW.hours || ' hours',
      'success', 'leaves'
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM notify_employee_and_admins(
      NEW.employee_id,
      'تم رفض عمل إضافي - ' || COALESCE(emp_name, ''),
      'Overtime Rejected - ' || COALESCE(emp_name, ''),
      NULL, NULL, 'warning', 'leaves'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_overtime_status
AFTER UPDATE ON overtime_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_overtime_status_change();

-- 5. Loans: new loan added
CREATE OR REPLACE FUNCTION public.notify_on_loan_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  
  PERFORM notify_employee_and_admins(
    NEW.employee_id,
    'تم تسجيل قرض جديد - ' || COALESCE(emp_name, ''),
    'New Loan Registered - ' || COALESCE(emp_name, ''),
    'المبلغ: ' || NEW.amount || ' - ' || NEW.installments_count || ' قسط',
    'Amount: ' || NEW.amount || ' - ' || NEW.installments_count || ' installments',
    'info', 'loans'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_loan_insert
AFTER INSERT ON loans
FOR EACH ROW
EXECUTE FUNCTION notify_on_loan_insert();

-- 6. Advances: new advance added
CREATE OR REPLACE FUNCTION public.notify_on_advance_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  
  PERFORM notify_employee_and_admins(
    NEW.employee_id,
    'تم تسجيل سلفة جديدة - ' || COALESCE(emp_name, ''),
    'New Advance Registered - ' || COALESCE(emp_name, ''),
    'المبلغ: ' || NEW.amount,
    'Amount: ' || NEW.amount,
    'info', 'loans'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_advance_insert
AFTER INSERT ON advances
FOR EACH ROW
EXECUTE FUNCTION notify_on_advance_insert();

-- 7. Training assignments
CREATE OR REPLACE FUNCTION public.notify_on_training_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
  course_name text;
BEGIN
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  SELECT pc.course_name INTO course_name FROM planned_courses pc WHERE pc.id = NEW.planned_course_id;
  
  PERFORM notify_employee_and_admins(
    NEW.employee_id,
    'تم تعيين دورة تدريبية - ' || COALESCE(emp_name, ''),
    'Training Course Assigned - ' || COALESCE(emp_name, ''),
    COALESCE(course_name, ''),
    COALESCE(course_name, ''),
    'info', 'training'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_training_assignment
AFTER INSERT ON planned_course_assignments
FOR EACH ROW
EXECUTE FUNCTION notify_on_training_assignment();

-- 8. Asset assignment
CREATE OR REPLACE FUNCTION public.notify_on_asset_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  -- Only trigger when assigned_to changes to a non-null value
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR NEW.assigned_to != OLD.assigned_to) THEN
    SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.assigned_to;
    
    PERFORM notify_employee_and_admins(
      NEW.assigned_to,
      'تم تسليم عهدة جديدة - ' || COALESCE(emp_name, ''),
      'New Asset Assigned - ' || COALESCE(emp_name, ''),
      NEW.name_ar || ' (' || NEW.asset_code || ')',
      NEW.name_en || ' (' || NEW.asset_code || ')',
      'info', 'assets'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_asset_assignment
AFTER UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION notify_on_asset_assignment();

-- 9. Payroll processing
CREATE OR REPLACE FUNCTION public.notify_on_payroll_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT name_ar INTO emp_name FROM employees WHERE id = NEW.employee_id;
  
  PERFORM notify_employee_and_admins(
    NEW.employee_id,
    'تم معالجة كشف الراتب - ' || COALESCE(emp_name, ''),
    'Payroll Processed - ' || COALESCE(emp_name, ''),
    'شهر ' || NEW.month || '/' || NEW.year || ' - صافي: ' || COALESCE(NEW.net_salary, 0),
    'Month ' || NEW.month || '/' || NEW.year || ' - Net: ' || COALESCE(NEW.net_salary, 0),
    'info', 'salaries'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payroll_entry
AFTER INSERT ON payroll_entries
FOR EACH ROW
EXECUTE FUNCTION notify_on_payroll_entry();
