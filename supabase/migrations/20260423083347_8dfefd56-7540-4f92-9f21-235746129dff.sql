-- ─── Idempotency Lock for Attendance ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_idempotency (
  employee_id uuid NOT NULL,
  device_id text NOT NULL,
  event_type text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 seconds'),
  PRIMARY KEY (employee_id, device_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_attendance_idempotency_expires
  ON public.attendance_idempotency (expires_at);

ALTER TABLE public.attendance_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_idempotency_select" ON public.attendance_idempotency
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Atomic acquire: deletes expired lock for this key, then tries insert.
-- Returns TRUE if lock acquired, FALSE if already held by a concurrent request.
CREATE OR REPLACE FUNCTION public.try_acquire_attendance_lock(
  p_employee_id uuid,
  p_device_id text,
  p_event_type text,
  p_ttl_seconds int DEFAULT 30
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean := false;
BEGIN
  DELETE FROM public.attendance_idempotency
  WHERE employee_id = p_employee_id
    AND device_id = p_device_id
    AND event_type = p_event_type
    AND expires_at <= now();

  BEGIN
    INSERT INTO public.attendance_idempotency
      (employee_id, device_id, event_type, expires_at)
    VALUES
      (p_employee_id, p_device_id, p_event_type, now() + (p_ttl_seconds || ' seconds')::interval);
    v_inserted := true;
  EXCEPTION WHEN unique_violation THEN
    v_inserted := false;
  END;

  RETURN v_inserted;
END;
$$;

-- ─── Hard DB guarantee: one open check_in per employee ───────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_one_open_per_employee
  ON public.attendance_records (employee_id)
  WHERE check_out IS NULL;