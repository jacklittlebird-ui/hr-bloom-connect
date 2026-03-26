
-- Drop the old unique index that includes start_time and end_time
DROP INDEX IF EXISTS idx_permission_requests_no_dup;

-- Delete duplicates keeping the newest record (by id) per employee per date
DELETE FROM permission_requests a
USING permission_requests b
WHERE a.id < b.id
  AND a.employee_id = b.employee_id
  AND a.date = b.date;

-- Create stricter unique index: one permission per employee per day
CREATE UNIQUE INDEX idx_permission_requests_no_dup
ON permission_requests (employee_id, date);
