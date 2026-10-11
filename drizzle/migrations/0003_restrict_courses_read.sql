DROP POLICY IF EXISTS "read_courses" ON public.training_courses;
CREATE POLICY "read_courses" ON public.training_courses FOR SELECT TO authenticated
USING ((SELECT public.is_staff_user(auth.uid())) OR EXISTS (
  SELECT 1 FROM public.training_records tr WHERE tr.course_id = training_courses.id
  AND tr.employee_id = (SELECT public.get_user_employee_id(auth.uid()))));

DROP POLICY IF EXISTS "read_planned_courses" ON public.planned_courses;
CREATE POLICY "read_planned_courses" ON public.planned_courses FOR SELECT TO authenticated
USING ((SELECT public.is_staff_user(auth.uid())) OR EXISTS (
  SELECT 1 FROM public.planned_course_assignments a WHERE a.planned_course_id = planned_courses.id
  AND a.employee_id = (SELECT public.get_user_employee_id(auth.uid()))));