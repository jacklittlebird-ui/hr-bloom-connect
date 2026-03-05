# Database Dump - Full SQL Migration

Run this SQL in the **SQL Editor** of a new Supabase project to recreate the entire database.

> **Prerequisites:**
> - A fresh Supabase project
> - Run this in the SQL Editor (Dashboard → SQL Editor → New Query)
> - After running, create the Edge Functions separately (`setup-user`, `generate-qr-token`, `submit-scan`, `delete-user`)
> - Set the required secrets: `QR_HMAC_SECRET`, `SUPABASE_PUBLISHABLE_KEY`

```sql
-- =============================================
-- 1. ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'station_manager', 'employee', 'kiosk');
CREATE TYPE public.employee_status AS ENUM ('active', 'inactive', 'suspended');

-- =============================================
-- 2. TABLES (in dependency order)
-- =============================================

-- ---- PROFILES ----
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- DEPARTMENTS ----
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- STATIONS ----
CREATE TABLE public.stations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  timezone text NOT NULL DEFAULT 'Africa/Cairo',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- EMPLOYEES ----
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  first_name text,
  father_name text,
  family_name text,
  phone text DEFAULT '',
  email text DEFAULT '',
  avatar text,
  status employee_status NOT NULL DEFAULT 'active',
  department_id uuid REFERENCES public.departments(id),
  station_id uuid REFERENCES public.stations(id),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_title_ar text DEFAULT '',
  job_title_en text DEFAULT '',
  job_level text,
  job_degree text,
  hire_date date,
  recruited_by text,
  employment_status text DEFAULT 'active',
  contract_type text,
  resigned boolean DEFAULT false,
  resignation_date date,
  resignation_reason text,
  birth_date date,
  birth_place text,
  birth_governorate text,
  gender text,
  religion text,
  nationality text,
  marital_status text,
  children_count integer DEFAULT 0,
  education_ar text,
  graduation_year text,
  home_phone text,
  address text,
  city text,
  governorate text,
  national_id text,
  id_issue_date date,
  id_expiry_date date,
  issuing_authority text,
  issuing_governorate text,
  military_status text,
  dept_code text,
  social_insurance_no text,
  social_insurance_start_date date,
  social_insurance_end_date date,
  health_insurance_card_no text,
  has_health_insurance boolean DEFAULT false,
  has_gov_health_insurance boolean DEFAULT false,
  has_social_insurance boolean DEFAULT false,
  has_cairo_airport_temp_permit boolean DEFAULT false,
  has_cairo_airport_annual_permit boolean DEFAULT false,
  annual_permit_no text,
  temp_permit_no text,
  has_airports_temp_permit boolean DEFAULT false,
  has_airports_annual_permit boolean DEFAULT false,
  airports_temp_permit_no text,
  airports_annual_permit_no text,
  airports_permit_type text,
  permit_name_en text,
  permit_name_ar text,
  has_qualification_cert boolean DEFAULT false,
  has_military_service_cert boolean DEFAULT false,
  has_birth_cert boolean DEFAULT false,
  has_id_copy boolean DEFAULT false,
  has_pledge boolean DEFAULT false,
  has_contract boolean DEFAULT false,
  has_receipt boolean DEFAULT false,
  attachments text,
  notes text,
  basic_salary numeric DEFAULT 0,
  annual_leave_balance numeric DEFAULT 21,
  sick_leave_balance numeric DEFAULT 7,
  bank_name text,
  bank_account_number text,
  bank_id_number text,
  bank_account_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employees_employee_code_key UNIQUE (employee_code),
  CONSTRAINT uq_employee_code UNIQUE (employee_code)
);

-- ---- USER_ROLES ----
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  station_id uuid REFERENCES public.stations(id),
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- ---- USER_DEVICES ----
CREATE TABLE public.user_devices (
  user_id uuid NOT NULL PRIMARY KEY,
  device_id text NOT NULL,
  bound_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_devices_device_id_key UNIQUE (device_id)
);

-- ---- PERMISSION_PROFILES ----
CREATE TABLE public.permission_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- USER_MODULE_PERMISSIONS ----
CREATE TABLE public.user_module_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.permission_profiles(id) ON DELETE SET NULL,
  custom_modules jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_module_permissions_user_id_key UNIQUE (user_id)
);

-- ---- QR_LOCATIONS ----
CREATE TABLE public.qr_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  station_id uuid REFERENCES public.stations(id),
  latitude double precision,
  longitude double precision,
  radius_m integer DEFAULT 150,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- ATTENDANCE_EVENTS ----
CREATE TABLE public.attendance_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.qr_locations(id),
  event_type text NOT NULL,
  device_id text NOT NULL,
  token_ts timestamptz NOT NULL,
  scan_time timestamptz NOT NULL DEFAULT now(),
  gps_lat double precision,
  gps_lng double precision,
  CONSTRAINT attendance_events_event_type_check CHECK (event_type = ANY (ARRAY['check_in'::text, 'check_out'::text]))
);

-- ---- ATTENDANCE_RECORDS ----
CREATE TABLE public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present',
  is_late boolean DEFAULT false,
  work_hours numeric DEFAULT 0,
  work_minutes integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- DEVICE_ALERTS ----
CREATE TABLE public.device_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  reason text NOT NULL,
  meta jsonb,
  triggered_at timestamptz NOT NULL DEFAULT now()
);

-- ---- EMPLOYEE_DOCUMENTS ----
CREATE TABLE public.employee_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  file_url text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- ---- LEAVE_BALANCES ----
CREATE TABLE public.leave_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year integer NOT NULL,
  annual_total numeric NOT NULL DEFAULT 21,
  annual_used numeric NOT NULL DEFAULT 0,
  sick_total numeric NOT NULL DEFAULT 15,
  sick_used numeric NOT NULL DEFAULT 0,
  casual_total numeric NOT NULL DEFAULT 7,
  casual_used numeric NOT NULL DEFAULT 0,
  permissions_total numeric NOT NULL DEFAULT 24,
  permissions_used numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_balances_employee_id_year_key UNIQUE (employee_id, year)
);

-- ---- LEAVE_REQUESTS ----
CREATE TABLE public.leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- LOANS ----
CREATE TABLE public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  installments_count integer NOT NULL DEFAULT 1,
  monthly_installment numeric DEFAULT 0,
  paid_count integer DEFAULT 0,
  remaining numeric DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- LOAN_INSTALLMENTS ----
CREATE TABLE public.loan_installments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- ADVANCES ----
CREATE TABLE public.advances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  deduction_month text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- MISSIONS ----
CREATE TABLE public.missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  mission_type text NOT NULL DEFAULT 'full_day',
  date date NOT NULL,
  check_in time without time zone,
  check_out time without time zone,
  hours numeric DEFAULT 0,
  destination text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- MOBILE_BILLS ----
CREATE TABLE public.mobile_bills (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  deduction_month text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobile_bills_employee_id_deduction_month_key UNIQUE (employee_id, deduction_month),
  CONSTRAINT uq_mobile_bill_emp_month UNIQUE (employee_id, deduction_month)
);

-- ---- NOTIFICATIONS ----
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  desc_ar text,
  desc_en text,
  type text NOT NULL DEFAULT 'info',
  module text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- OVERTIME_REQUESTS ----
CREATE TABLE public.overtime_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PERMISSION_REQUESTS ----
CREATE TABLE public.permission_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  permission_type text NOT NULL,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  hours numeric DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PAYROLL_ENTRIES ----
CREATE TABLE public.payroll_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month text NOT NULL,
  year text NOT NULL,
  basic_salary numeric DEFAULT 0,
  transport_allowance numeric DEFAULT 0,
  incentives numeric DEFAULT 0,
  station_allowance numeric DEFAULT 0,
  mobile_allowance numeric DEFAULT 0,
  living_allowance numeric DEFAULT 0,
  overtime_pay numeric DEFAULT 0,
  bonus_type text DEFAULT 'amount',
  bonus_value numeric DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  gross numeric DEFAULT 0,
  employee_insurance numeric DEFAULT 0,
  employer_social_insurance numeric DEFAULT 0,
  health_insurance numeric DEFAULT 0,
  income_tax numeric DEFAULT 0,
  loan_payment numeric DEFAULT 0,
  advance_amount numeric DEFAULT 0,
  mobile_bill numeric DEFAULT 0,
  leave_days numeric DEFAULT 0,
  leave_deduction numeric DEFAULT 0,
  penalty_type text DEFAULT 'amount',
  penalty_value numeric DEFAULT 0,
  penalty_amount numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  net_salary numeric DEFAULT 0,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_entries_employee_id_month_year_key UNIQUE (employee_id, month, year),
  CONSTRAINT uq_payroll_emp_month_year UNIQUE (employee_id, month, year)
);

-- ---- PERFORMANCE_REVIEWS ----
CREATE TABLE public.performance_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  quarter text NOT NULL,
  year text NOT NULL,
  review_date date DEFAULT CURRENT_DATE,
  criteria jsonb DEFAULT '[]'::jsonb,
  score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  reviewer_id uuid REFERENCES auth.users(id),
  strengths text,
  improvements text,
  goals text,
  manager_comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- SALARY_RECORDS ----
CREATE TABLE public.salary_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year text NOT NULL,
  basic_salary numeric DEFAULT 0,
  transport_allowance numeric DEFAULT 0,
  incentives numeric DEFAULT 0,
  station_allowance numeric DEFAULT 0,
  mobile_allowance numeric DEFAULT 0,
  living_allowance numeric DEFAULT 0,
  employee_insurance numeric DEFAULT 0,
  employer_social_insurance numeric DEFAULT 0,
  health_insurance numeric DEFAULT 0,
  income_tax numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- TRAINING_COURSES ----
CREATE TABLE public.training_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  course_code text DEFAULT '',
  description text,
  provider text DEFAULT '',
  duration_hours integer DEFAULT 0,
  course_duration text DEFAULT '',
  course_objective text DEFAULT '',
  basic_topics text DEFAULT '',
  intermediate_topics text DEFAULT '',
  advanced_topics text DEFAULT '',
  exercises text DEFAULT '',
  examination text DEFAULT '',
  reference_material text DEFAULT '',
  course_administration text DEFAULT '',
  edited_by text DEFAULT '',
  validity_years integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- TRAINING_RECORDS ----
CREATE TABLE public.training_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.training_courses(id),
  start_date date,
  end_date date,
  planned_date date,
  status text NOT NULL DEFAULT 'enrolled',
  score numeric,
  cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  provider text,
  location text,
  has_cert boolean DEFAULT false,
  has_cr boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- TRAINING_ACKNOWLEDGMENTS ----
CREATE TABLE public.training_acknowledgments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_record_id uuid NOT NULL REFERENCES public.training_records(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);

-- ---- TRAINING_DEBTS ----
CREATE TABLE public.training_debts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_name text NOT NULL,
  actual_date date NOT NULL,
  expiry_date date NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PLANNED_COURSES ----
CREATE TABLE public.planned_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.training_courses(id),
  course_code text NOT NULL DEFAULT '',
  course_name text NOT NULL DEFAULT '',
  planned_date date,
  duration text DEFAULT '',
  provider text DEFAULT '',
  trainer text DEFAULT '',
  location text DEFAULT '',
  participants integer DEFAULT 0,
  cost numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PLANNED_COURSE_ASSIGNMENTS ----
CREATE TABLE public.planned_course_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planned_course_id uuid NOT NULL REFERENCES public.planned_courses(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  actual_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- ASSETS ----
CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_code text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'available',
  condition text DEFAULT 'good',
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_price numeric DEFAULT 0,
  location text,
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_asset_code_key UNIQUE (asset_code)
);

-- ---- UNIFORMS ----
CREATE TABLE public.uniforms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type_ar text NOT NULL,
  type_en text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  delivery_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- VIOLATIONS ----
CREATE TABLE public.violations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text,
  penalty text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 3. VIEW
-- =============================================
CREATE OR REPLACE VIEW public.employee_limited_view AS
SELECT
  id, employee_code, name_ar, name_en, first_name, father_name, family_name,
  station_id, department_id, dept_code, job_title_ar, job_title_en, job_level,
  job_degree, phone, email, gender, status, hire_date, contract_type,
  employment_status, resigned, resignation_date, avatar, user_id, created_at, updated_at
FROM employees;

-- =============================================
-- 4. INDEXES
-- =============================================
CREATE INDEX idx_advances_emp ON public.advances (employee_id);
CREATE INDEX idx_assets_assigned ON public.assets (assigned_to);
CREATE INDEX idx_assets_status ON public.assets (status);
CREATE INDEX idx_attendance_events_employee ON public.attendance_events (employee_id, scan_time DESC);
CREATE INDEX idx_attendance_events_user_time ON public.attendance_events (user_id, scan_time DESC);
CREATE INDEX idx_attendance_date ON public.attendance_records (date);
CREATE INDEX idx_attendance_emp ON public.attendance_records (employee_id);
CREATE INDEX idx_attendance_emp_date ON public.attendance_records (employee_id, date);
CREATE INDEX idx_attendance_employee_date ON public.attendance_records (employee_id, date);
CREATE INDEX idx_attendance_status ON public.attendance_records (status);
CREATE INDEX idx_documents_employee ON public.employee_documents (employee_id);
CREATE INDEX idx_emp_dept ON public.employees (department_id);
CREATE INDEX idx_emp_station ON public.employees (station_id);
CREATE INDEX idx_emp_status ON public.employees (status);
CREATE INDEX idx_emp_user ON public.employees (user_id);
CREATE INDEX idx_employees_code ON public.employees (employee_code);
CREATE INDEX idx_employees_department ON public.employees (department_id);
CREATE INDEX idx_employees_station ON public.employees (station_id);
CREATE INDEX idx_employees_status ON public.employees (status);
CREATE INDEX idx_leave_emp ON public.leave_requests (employee_id);
CREATE INDEX idx_leave_status ON public.leave_requests (status);
CREATE INDEX idx_leaves_employee ON public.leave_requests (employee_id);
CREATE INDEX idx_leaves_status ON public.leave_requests (status);
CREATE INDEX idx_installments_due ON public.loan_installments (due_date);
CREATE INDEX idx_installments_loan ON public.loan_installments (loan_id);
CREATE INDEX idx_loans_emp ON public.loans (employee_id);
CREATE INDEX idx_missions_emp ON public.missions (employee_id);
CREATE INDEX idx_missions_date ON public.missions (date);
CREATE INDEX idx_mobile_bills_emp ON public.mobile_bills (employee_id);
CREATE INDEX idx_notif_user ON public.notifications (user_id);
CREATE INDEX idx_notif_employee ON public.notifications (employee_id);
CREATE INDEX idx_overtime_emp ON public.overtime_requests (employee_id);
CREATE INDEX idx_payroll_emp ON public.payroll_entries (employee_id);
CREATE INDEX idx_payroll_month ON public.payroll_entries (month, year);
CREATE INDEX idx_perf_emp ON public.performance_reviews (employee_id);
CREATE INDEX idx_perm_req_emp ON public.permission_requests (employee_id);
CREATE INDEX idx_salary_emp ON public.salary_records (employee_id);
CREATE INDEX idx_training_records_emp ON public.training_records (employee_id);
CREATE INDEX idx_training_records_course ON public.training_records (course_id);
CREATE INDEX idx_user_roles_user ON public.user_roles (user_id);
CREATE INDEX idx_user_roles_station ON public.user_roles (station_id);
CREATE INDEX idx_violations_emp ON public.violations (employee_id);
CREATE INDEX idx_violations_employee ON public.violations (employee_id);
CREATE INDEX idx_violations_date ON public.violations (date);

-- =============================================
-- 5. FUNCTIONS
-- =============================================

-- has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- get_user_station_id
CREATE OR REPLACE FUNCTION public.get_user_station_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT station_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'station_manager'
  LIMIT 1
$$;

-- get_user_employee_id
CREATE OR REPLACE FUNCTION public.get_user_employee_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'employee'
  LIMIT 1
$$;

-- handle_new_user (auto-create profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

-- update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- calculate_work_hours
CREATE OR REPLACE FUNCTION public.calculate_work_hours()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  diff_minutes integer;
BEGIN
  IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL THEN
    diff_minutes := EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 60;
    IF diff_minutes < 0 THEN
      diff_minutes := diff_minutes + 1440;
    END IF;
    NEW.work_hours := ROUND(diff_minutes / 60.0, 2);
    NEW.work_minutes := diff_minutes;
  ELSE
    NEW.work_hours := 0;
    NEW.work_minutes := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- generate_loan_installments
CREATE OR REPLACE FUNCTION public.generate_loan_installments()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inst_amount numeric(12,2);
  i integer;
  due date;
BEGIN
  IF NEW.installments_count <= 0 THEN
    NEW.installments_count := 1;
  END IF;
  inst_amount := ROUND(NEW.amount / NEW.installments_count, 2);
  NEW.monthly_installment := inst_amount;
  NEW.remaining := NEW.amount;
  NEW.paid_count := 0;
  FOR i IN 1..NEW.installments_count LOOP
    due := NEW.start_date + (i * INTERVAL '1 month')::interval;
    INSERT INTO public.loan_installments (loan_id, employee_id, installment_number, amount, due_date, status)
    VALUES (NEW.id, NEW.employee_id, i, inst_amount, due, 'pending');
  END LOOP;
  RETURN NEW;
END;
$$;

-- calculate_payroll_net
CREATE OR REPLACE FUNCTION public.calculate_payroll_net()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bonus_type = 'percentage' THEN
    NEW.bonus_amount := ROUND(NEW.basic_salary * NEW.bonus_value / 100, 2);
  ELSE
    NEW.bonus_amount := COALESCE(NEW.bonus_value, 0);
  END IF;
  NEW.gross := COALESCE(NEW.basic_salary, 0) + COALESCE(NEW.transport_allowance, 0)
    + COALESCE(NEW.incentives, 0) + COALESCE(NEW.station_allowance, 0)
    + COALESCE(NEW.mobile_allowance, 0) + COALESCE(NEW.living_allowance, 0)
    + COALESCE(NEW.overtime_pay, 0) + COALESCE(NEW.bonus_amount, 0);
  IF NEW.penalty_type = 'days' THEN
    NEW.penalty_amount := ROUND(NEW.basic_salary / 30.0 * NEW.penalty_value, 2);
  ELSIF NEW.penalty_type = 'percentage' THEN
    NEW.penalty_amount := ROUND(NEW.basic_salary * NEW.penalty_value / 100, 2);
  ELSE
    NEW.penalty_amount := COALESCE(NEW.penalty_value, 0);
  END IF;
  NEW.leave_deduction := ROUND(COALESCE(NEW.basic_salary, 0) / 30.0 * COALESCE(NEW.leave_days, 0), 2);
  NEW.total_deductions := COALESCE(NEW.employee_insurance, 0) + COALESCE(NEW.loan_payment, 0)
    + COALESCE(NEW.advance_amount, 0) + COALESCE(NEW.mobile_bill, 0)
    + COALESCE(NEW.leave_deduction, 0) + COALESCE(NEW.penalty_amount, 0);
  NEW.net_salary := NEW.gross - NEW.total_deductions;
  RETURN NEW;
END;
$$;

-- update_leave_balance_on_approval
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_year integer;
  col_used text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    req_year := EXTRACT(YEAR FROM NEW.start_date);
    CASE NEW.leave_type
      WHEN 'annual' THEN col_used := 'annual_used';
      WHEN 'sick' THEN col_used := 'sick_used';
      WHEN 'casual' THEN col_used := 'casual_used';
      ELSE col_used := NULL;
    END CASE;
    IF col_used IS NOT NULL THEN
      INSERT INTO public.leave_balances (employee_id, year, annual_used, sick_used, casual_used)
      VALUES (NEW.employee_id, req_year, 0, 0, 0)
      ON CONFLICT (employee_id, year) DO NOTHING;
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = %I + $1 WHERE employee_id = $2 AND year = $3',
        col_used, col_used
      ) USING NEW.days, NEW.employee_id, req_year;
    END IF;
  END IF;
  IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    req_year := EXTRACT(YEAR FROM NEW.start_date);
    CASE OLD.leave_type
      WHEN 'annual' THEN col_used := 'annual_used';
      WHEN 'sick' THEN col_used := 'sick_used';
      WHEN 'casual' THEN col_used := 'casual_used';
      ELSE col_used := NULL;
    END CASE;
    IF col_used IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = GREATEST(0, %I - $1) WHERE employee_id = $2 AND year = $3',
        col_used, col_used
      ) USING OLD.days, OLD.employee_id, req_year;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- auto_attendance_on_mission
CREATE OR REPLACE FUNCTION public.auto_attendance_on_mission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ci time;
  co time;
  hrs numeric;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    CASE NEW.mission_type
      WHEN 'morning' THEN ci := '09:00'; co := '14:00'; hrs := 5;
      WHEN 'evening' THEN ci := '14:00'; co := '17:00'; hrs := 3;
      ELSE ci := '09:00'; co := '17:00'; hrs := 8;
    END CASE;
    IF NEW.check_in IS NOT NULL THEN ci := NEW.check_in; END IF;
    IF NEW.check_out IS NOT NULL THEN co := NEW.check_out; END IF;
    INSERT INTO public.attendance_records (employee_id, date, check_in, check_out, status, notes)
    VALUES (
      NEW.employee_id, NEW.date,
      (NEW.date::text || ' ' || ci::text)::timestamptz,
      (NEW.date::text || ' ' || co::text)::timestamptz,
      'mission', 'مأمورية / Mission'
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- prevent_permission_on_leave_day
CREATE OR REPLACE FUNCTION public.prevent_permission_on_leave_day()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.leave_requests
    WHERE employee_id = NEW.employee_id
      AND status IN ('pending', 'approved')
      AND NEW.date BETWEEN start_date AND end_date
  ) THEN
    RAISE EXCEPTION 'Cannot request permission on a day with an existing leave request';
  END IF;
  RETURN NEW;
END;
$$;

-- upsert_mobile_bill
CREATE OR REPLACE FUNCTION public.upsert_mobile_bill(p_employee_id uuid, p_amount numeric, p_deduction_month text, p_uploaded_by uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
BEGIN
  INSERT INTO public.mobile_bills (employee_id, amount, deduction_month, uploaded_by)
  VALUES (p_employee_id, p_amount, p_deduction_month, p_uploaded_by)
  ON CONFLICT (employee_id, deduction_month)
  DO UPDATE SET amount = EXCLUDED.amount, uploaded_by = EXCLUDED.uploaded_by
  RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

-- calculate_uniform_total
CREATE OR REPLACE FUNCTION public.calculate_uniform_total()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total_price := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0);
  RETURN NEW;
END;
$$;

-- =============================================
-- 6. TRIGGERS
-- =============================================

-- Auto-create profile on new auth user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on employees
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Calculate work hours on attendance insert/update
CREATE TRIGGER trg_calc_work_hours
  BEFORE INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.calculate_work_hours();

-- Generate loan installments (BEFORE INSERT)
CREATE TRIGGER trg_generate_loan_installments
  BEFORE INSERT ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.generate_loan_installments();

-- Generate loan installments (AFTER INSERT) - duplicate, kept for compatibility
CREATE TRIGGER trg_generate_installments
  AFTER INSERT ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.generate_loan_installments();

-- Calculate payroll net
CREATE TRIGGER trg_calc_payroll
  BEFORE INSERT OR UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.calculate_payroll_net();

-- Update leave balance on approval (UPDATE)
CREATE TRIGGER trg_update_leave_balance
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_leave_balance_on_approval();

-- Update leave balance on approval (INSERT with status=approved)
CREATE TRIGGER trg_update_leave_balance_insert
  AFTER INSERT ON public.leave_requests
  FOR EACH ROW WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.update_leave_balance_on_approval();

-- Auto attendance on mission approval
CREATE TRIGGER trg_auto_attendance_mission
  AFTER UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.auto_attendance_on_mission();

-- Prevent permission on leave day
CREATE TRIGGER trg_prevent_permission_on_leave_day
  BEFORE INSERT ON public.permission_requests
  FOR EACH ROW EXECUTE FUNCTION public.prevent_permission_on_leave_day();

-- Calculate uniform total
CREATE TRIGGER trg_calc_uniform_total
  BEFORE INSERT OR UPDATE ON public.uniforms
  FOR EACH ROW EXECUTE FUNCTION public.calculate_uniform_total();

-- =============================================
-- 7. ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. RLS POLICIES
-- =============================================

-- ---- profiles ----
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---- departments ----
CREATE POLICY "Admins manage departments" ON public.departments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read departments" ON public.departments FOR SELECT TO authenticated USING (true);

-- ---- stations ----
CREATE POLICY "Admins manage stations" ON public.stations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read stations" ON public.stations FOR SELECT TO authenticated USING (true);

-- ---- employees ----
CREATE POLICY "Admins manage employees" ON public.employees FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees read own record" ON public.employees FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND id = get_user_employee_id(auth.uid()));
CREATE POLICY "Station managers read own station employees" ON public.employees FOR SELECT TO authenticated USING (has_role(auth.uid(), 'station_manager') AND station_id = get_user_station_id(auth.uid()));

-- ---- user_roles ----
CREATE POLICY "Admins manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---- user_devices ----
CREATE POLICY "admin_manage_devices" ON public.user_devices FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "read_own_device" ON public.user_devices FOR SELECT USING (auth.uid() = user_id);

-- ---- permission_profiles ----
CREATE POLICY "admin_permission_profiles" ON public.permission_profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "read_permission_profiles" ON public.permission_profiles FOR SELECT TO authenticated USING (true);

-- ---- user_module_permissions ----
CREATE POLICY "admin_user_module_permissions" ON public.user_module_permissions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "user_own_permissions" ON public.user_module_permissions FOR SELECT USING (user_id = auth.uid());

-- ---- qr_locations ----
CREATE POLICY "admin_manage_qr_locations" ON public.qr_locations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "auth_read_qr_locations" ON public.qr_locations FOR SELECT TO authenticated USING (is_active = true);

-- ---- attendance_events ----
CREATE POLICY "admin_read_all_attendance_events" ON public.attendance_events FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "read_own_attendance_events" ON public.attendance_events FOR SELECT USING (auth.uid() = user_id);

-- ---- attendance_records ----
CREATE POLICY "admin_attendance" ON public.attendance_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_attendance" ON public.attendance_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "emp_attendance_insert" ON public.attendance_records FOR INSERT WITH CHECK (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "emp_attendance_update" ON public.attendance_records FOR UPDATE USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid())) WITH CHECK (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "sm_attendance_insert" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'station_manager') AND employee_id IN (SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())));
CREATE POLICY "sm_attendance_select" ON public.attendance_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'station_manager') AND employee_id IN (SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())));

-- ---- device_alerts ----
CREATE POLICY "admin_device_alerts" ON public.device_alerts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ---- employee_documents ----
CREATE POLICY "admin_docs" ON public.employee_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_docs" ON public.employee_documents FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- leave_balances ----
CREATE POLICY "admin_leave_balances" ON public.leave_balances FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_leave_balances" ON public.leave_balances FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- leave_requests ----
CREATE POLICY "admin_leaves" ON public.leave_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_leaves_select" ON public.leave_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "emp_leaves_insert" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- loans ----
CREATE POLICY "admin_loans" ON public.loans FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_loans" ON public.loans FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- loan_installments ----
CREATE POLICY "admin_installments" ON public.loan_installments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_installments" ON public.loan_installments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- advances ----
CREATE POLICY "admin_advances" ON public.advances FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_advances" ON public.advances FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- missions ----
CREATE POLICY "admin_missions" ON public.missions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_missions_select" ON public.missions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "emp_missions_insert" ON public.missions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- mobile_bills ----
CREATE POLICY "admin_bills" ON public.mobile_bills FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_mobile_bills_select" ON public.mobile_bills FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- notifications ----
CREATE POLICY "admin_notifs" ON public.notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "user_own_notifs" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_update_notifs" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- overtime_requests ----
CREATE POLICY "admin_overtime" ON public.overtime_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_overtime_select" ON public.overtime_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "emp_overtime_insert" ON public.overtime_requests FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- permission_requests ----
CREATE POLICY "admin_permissions" ON public.permission_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_permissions_select" ON public.permission_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "emp_permissions_insert" ON public.permission_requests FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- payroll_entries ----
CREATE POLICY "admin_payroll" ON public.payroll_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_payroll" ON public.payroll_entries FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- performance_reviews ----
CREATE POLICY "admin_perf" ON public.performance_reviews FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_perf" ON public.performance_reviews FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "sm_perf_all" ON public.performance_reviews FOR ALL TO authenticated USING (has_role(auth.uid(), 'station_manager') AND employee_id IN (SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid()))) WITH CHECK (has_role(auth.uid(), 'station_manager') AND employee_id IN (SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())));

-- ---- salary_records ----
CREATE POLICY "admin_salary" ON public.salary_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_salary" ON public.salary_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- training_courses ----
CREATE POLICY "admin_courses" ON public.training_courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "read_courses" ON public.training_courses FOR SELECT TO authenticated USING (true);

-- ---- training_records ----
CREATE POLICY "admin_training" ON public.training_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_training" ON public.training_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- training_acknowledgments ----
CREATE POLICY "admin_ack" ON public.training_acknowledgments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_ack_select" ON public.training_acknowledgments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "emp_ack_insert" ON public.training_acknowledgments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- training_debts ----
CREATE POLICY "admin_debts" ON public.training_debts FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_debts" ON public.training_debts FOR SELECT USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- planned_courses ----
CREATE POLICY "admin_planned_courses" ON public.planned_courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "read_planned_courses" ON public.planned_courses FOR SELECT TO authenticated USING (true);

-- ---- planned_course_assignments ----
CREATE POLICY "admin_assignments" ON public.planned_course_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "read_assignments" ON public.planned_course_assignments FOR SELECT TO authenticated USING (true);

-- ---- assets ----
CREATE POLICY "admin_assets" ON public.assets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "read_assets" ON public.assets FOR SELECT TO authenticated USING (true);

-- ---- uniforms ----
CREATE POLICY "admin_uniforms" ON public.uniforms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_uniforms" ON public.uniforms FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));

-- ---- violations ----
CREATE POLICY "admin_violations" ON public.violations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_violations" ON public.violations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee') AND employee_id = get_user_employee_id(auth.uid()));
CREATE POLICY "sm_violations_all" ON public.violations FOR ALL TO authenticated USING (has_role(auth.uid(), 'station_manager') AND employee_id IN (SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid()))) WITH CHECK (has_role(auth.uid(), 'station_manager') AND employee_id IN (SELECT id FROM employees WHERE station_id = get_user_station_id(auth.uid())));

-- =============================================
-- DONE! Database schema fully recreated.
-- =============================================
-- Next steps:
-- 1. Deploy Edge Functions (setup-user, generate-qr-token, submit-scan, delete-user)
-- 2. Set secrets: QR_HMAC_SECRET, SUPABASE_PUBLISHABLE_KEY
-- 3. Create first admin user via the setup-user edge function
```
