
-- Allow training_manager to read all employees (needed for names in training records)
CREATE POLICY "training_manager_read_employees"
ON public.employees FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager full access to training_records
CREATE POLICY "tm_training_records"
ON public.training_records FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager full access to training_acknowledgments
CREATE POLICY "tm_training_ack"
ON public.training_acknowledgments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager full access to training_debts
CREATE POLICY "tm_training_debts"
ON public.training_debts FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager full access to planned_courses
CREATE POLICY "tm_planned_courses"
ON public.planned_courses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager full access to planned_course_assignments
CREATE POLICY "tm_planned_assignments"
ON public.planned_course_assignments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager full access to training_courses
CREATE POLICY "tm_training_courses"
ON public.training_courses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager to read departments
CREATE POLICY "tm_read_departments"
ON public.departments FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager to read stations
CREATE POLICY "tm_read_stations"
ON public.stations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role));

-- Allow training_manager to manage notifications
CREATE POLICY "tm_notifs"
ON public.notifications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'training_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'training_manager'::app_role));
