
-- Prevent duplicate leave requests (same employee, type, start_date, end_date)
-- First remove existing duplicates keeping the newest record
DELETE FROM leave_requests a
USING leave_requests b
WHERE a.id < b.id
  AND a.employee_id = b.employee_id
  AND a.leave_type = b.leave_type
  AND a.start_date = b.start_date
  AND a.end_date = b.end_date;

-- Add unique constraint
CREATE UNIQUE INDEX idx_leave_requests_no_dup 
ON leave_requests (employee_id, leave_type, start_date, end_date);

-- Prevent duplicate permission requests
DELETE FROM permission_requests a
USING permission_requests b
WHERE a.id < b.id
  AND a.employee_id = b.employee_id
  AND a.date = b.date
  AND a.start_time = b.start_time
  AND a.end_time = b.end_time;

CREATE UNIQUE INDEX idx_permission_requests_no_dup
ON permission_requests (employee_id, date, start_time, end_time);

-- Prevent duplicate overtime requests
DELETE FROM overtime_requests a
USING overtime_requests b
WHERE a.id < b.id
  AND a.employee_id = b.employee_id
  AND a.date = b.date
  AND a.overtime_type = b.overtime_type;

CREATE UNIQUE INDEX idx_overtime_requests_no_dup
ON overtime_requests (employee_id, date, overtime_type);
