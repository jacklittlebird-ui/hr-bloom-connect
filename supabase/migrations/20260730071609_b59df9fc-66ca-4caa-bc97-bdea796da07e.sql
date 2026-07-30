-- 1) Allow manager roles to create notifications (fixes RLS denial on Notify buttons)
CREATE POLICY "managers_can_insert_notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'station_manager'::app_role)
  OR public.has_role(auth.uid(), 'area_manager'::app_role)
  OR public.has_role(auth.uid(), 'department_manager'::app_role)
  OR public.has_role(auth.uid(), 'station_hr'::app_role)
  OR public.has_role(auth.uid(), 'station_vehicle_manager'::app_role)
);

-- 2) Indexes to fix statement timeouts on attendance queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_employees_name_en_trgm ON public.employees USING gin (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_name_ar_trgm ON public.employees USING gin (name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_code_trgm ON public.employees USING gin (employee_code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_attendance_date_checkin ON public.attendance_records (date, check_in DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_attendance_date_desc ON public.attendance_records (date DESC);