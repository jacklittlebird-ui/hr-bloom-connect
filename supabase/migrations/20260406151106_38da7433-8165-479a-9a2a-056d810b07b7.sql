-- Delete duplicate attendance records, keeping only the best record per employee per day
-- Best = longest work_minutes, or latest check_out, or latest created_at
DELETE FROM attendance_records
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY employee_id, date 
        ORDER BY 
          -- Prefer records with real checkout (no auto-close note)
          CASE WHEN notes IS NULL OR notes NOT LIKE '%تلقائي%' THEN 0 ELSE 1 END,
          -- Then prefer longest work time
          COALESCE(work_minutes, 0) DESC,
          -- Then latest check_out
          check_out DESC NULLS LAST,
          -- Then latest created
          created_at DESC
      ) as rn
    FROM attendance_records
    WHERE date >= '2026-03-01'
      AND employee_id IN (
        SELECT employee_id FROM attendance_records
        WHERE date >= '2026-03-01'
        GROUP BY employee_id, date
        HAVING count(*) > 1
      )
  ) ranked
  WHERE rn > 1
);