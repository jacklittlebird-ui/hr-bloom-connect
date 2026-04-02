UPDATE permission_requests
SET hours = EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
WHERE hours = 0 AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time;