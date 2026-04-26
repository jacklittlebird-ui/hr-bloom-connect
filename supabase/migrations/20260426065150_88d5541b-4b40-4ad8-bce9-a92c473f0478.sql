-- Enable realtime broadcasts for attendance_records so the employee portal,
-- kiosk, and admin views stay in sync without manual refresh. This prevents
-- the UI from showing stale "needs check-in" prompts after a successful
-- check-in finishes round-tripping through the database.
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_records'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records';
  END IF;
END
$$;