-- HR RLS policies for all tables (salary_records and payroll_entries intentionally excluded)

CREATE POLICY "hr_manage_employees" ON public.employees
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_manage_departments" ON public.departments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_manage_stations" ON public.stations
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_attendance_records" ON public.attendance_records
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_attendance_events" ON public.attendance_events
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_leave_requests" ON public.leave_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_leave_balances" ON public.leave_balances
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_loans" ON public.loans
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_loan_installments" ON public.loan_installments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_advances" ON public.advances
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_missions" ON public.missions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_overtime_requests" ON public.overtime_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_permission_requests" ON public.permission_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_assets" ON public.assets
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_employee_documents" ON public.employee_documents
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_notifications" ON public.notifications
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_performance_reviews" ON public.performance_reviews
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_training_records" ON public.training_records
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_training_courses" ON public.training_courses
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_training_debts" ON public.training_debts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_training_acknowledgments" ON public.training_acknowledgments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_planned_courses" ON public.planned_courses
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_planned_course_assignments" ON public.planned_course_assignments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_mobile_bills" ON public.mobile_bills
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_device_alerts" ON public.device_alerts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_qr_locations" ON public.qr_locations
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "hr_permission_profiles" ON public.permission_profiles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "profiles_hr_read" ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));