DELETE FROM attendance_records
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY employee_id, date 
        ORDER BY 
          CASE WHEN notes IS NULL OR notes NOT LIKE '%تلقائي%' THEN 0 ELSE 1 END,
          COALESCE(work_minutes, 0) DESC,
          check_out DESC NULLS LAST,
          created_at DESC
      ) as rn
    FROM attendance_records
    WHERE date = '2026-04-06'
      AND employee_id = 'e3dbbb8c-f5c8-46ef-a573-55cbe09a2c3c'
  ) ranked
  WHERE rn > 1
);