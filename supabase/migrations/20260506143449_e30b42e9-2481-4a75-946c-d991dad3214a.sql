DELETE FROM attendance_records
WHERE id IN (
  SELECT ar.id FROM attendance_records ar
  JOIN employees e ON e.id = ar.employee_id
  WHERE e.employee_code IN ('emp1505','emp0695','emp0125','emp0688')
    AND ar.date = '2026-05-06'
    AND ar.work_minutes <= 5
    AND ar.check_in IS NOT NULL
    AND ar.check_out IS NOT NULL
);