-- Delete corrupt attendance records where check_out was set equal to check_in
-- by the buggy "auto-close on check_in" logic. Affected employees can re-check-in.
DELETE FROM public.attendance_records
WHERE check_in IS NOT NULL
  AND check_out IS NOT NULL
  AND check_in = check_out
  AND notes LIKE '%auto-closed%';