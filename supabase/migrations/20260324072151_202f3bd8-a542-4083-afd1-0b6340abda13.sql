UPDATE attendance_records
SET check_out = check_in + interval '8 hours',
    notes = COALESCE(notes, '') || ' | إغلاق تلقائي - Auto closed'
WHERE check_out IS NULL
  AND check_in IS NOT NULL
  AND employee_id IN (
    SELECT id FROM employees 
    WHERE station_id IN ('2fb34a1d-2d98-4331-b391-52f36228d2f3', '2ec5cca3-db74-49be-b0d2-451e1e9f649b')
  );