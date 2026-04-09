
-- Step 1: Delete duplicates, keeping the record with most work_minutes (or latest created_at as tiebreaker)
DELETE FROM attendance_records
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY employee_id, date
        ORDER BY COALESCE(work_minutes, 0) DESC, created_at DESC
      ) AS rn
    FROM attendance_records
  ) ranked
  WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_attendance_records_employee_date 
ON attendance_records (employee_id, date);
